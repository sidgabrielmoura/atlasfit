import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { ImportCommitEvent, ImportCommitFailure, ImportCommitResult } from "@/lib/migration/commit-protocol";
import { WorkspaceAccessError } from "../domain/types";
import { assertActorAuthority } from "./actor-authority";
import { assertGymModule } from "./gym-module-authority";
import { getGymUnitAccess } from "./gym-unit-access";
import { serializableTransaction } from "./transaction";
import { writeGymMigrationRecords, type GymImportRecord } from "./gym-migration-records";
import { IMPORT_COMMIT_LEASE_MS } from "@/lib/migration/commit-review-lock";
import { parseDayOfWeekToInt } from "@/lib/migration/utils/day-of-week";

export { IMPORT_COMMIT_LEASE_MS };
type Input = { jobId: string; workspaceId: string; actorUserId: string; commitVersion: number; unitId?: string };
type Options = { onProgress?: (event: ImportCommitEvent) => void; isCancelled?: () => boolean };
const data = (record: GymImportRecord) => (record.normalizedData || {}) as Record<string, any>;
const pending = (record: GymImportRecord) => !["COMMITTED", "SKIPPED"].includes(record.status);
const legacyCatalogFailure = (record: GymImportRecord) => record.entityType === "WORKOUT" && record.status === "FAILED" && record.errorCode === "INVALID_IMPORT" && /^Associe todos os exercícios/.test(record.safeErrorMessage || "");

function formatRecordReviewReason(record: GymImportRecord): string {
  const norm = (record.normalizedData || {}) as Record<string, any>;
  const name = typeof norm.name === "string" && norm.name.trim() ? norm.name : (record.entityType === "WORKOUT" ? "Treino" : "Aluno");
  if (record.entityType === "WORKOUT") {
    const issues: string[] = [];
    const day = parseDayOfWeekToInt(norm.dayOfWeek);
    if (day === null || day === undefined) issues.push("dia de execução não definido (ex: Segunda-feira)");
    const targetStudentIds = Array.isArray(norm.targetStudentIds) && norm.targetStudentIds.length > 0
      ? norm.targetStudentIds
      : norm.temporaryStudentId
      ? [norm.temporaryStudentId]
      : [];
    if (targetStudentIds.length === 0 && !norm.saveToLibrary) issues.push("destino não definido (vincule a um aluno ou marque para salvar na biblioteca)");
    if (!norm.exercises || !Array.isArray(norm.exercises) || norm.exercises.length === 0) {
      issues.push("nenhum exercício informado na prescrição");
    } else if (norm.exercises.some((ex: any) => !String(ex.name || ex.matchedExerciseName || "").trim())) {
      issues.push("exercício sem nome");
    }
    const issueText = issues.length > 0 ? issues.join(", ") : "dados pendentes de revisão";
    return `Treino "${name}" com pendência: ${issueText}. Abra a edição para corrigir antes de cadastrar.`;
  }
  if (record.entityType === "STUDENT") {
    const issues: string[] = [];
    if (!norm.email && !norm.phone) issues.push("sem e-mail ou WhatsApp de contato");
    if (!norm.birthDate) issues.push("data de nascimento não informada");
    const issueText = issues.length > 0 ? issues.join(", ") : "dados pendentes de revisão";
    return `Aluno "${name}" com pendência: ${issueText}. Abra a edição para corrigir antes de cadastrar.`;
  }
  return `Registro "${name}" pendente de revisão. Abra a edição para conferir os dados antes de cadastrar.`;
}

export function groupImportStudents(records: GymImportRecord[]) {
  const groups = new Map<string, { name: string; records: GymImportRecord[]; associationError?: string }>(), aliases = new Map<string, string | null>();
  for (const student of records.filter(row => row.entityType === "STUDENT" && row.status !== "SKIPPED")) {
    const raw = data(student);
    groups.set(student.id, { name: typeof raw.name === "string" ? raw.name.slice(0, 150) : "Aluno sem nome", records: pending(student) ? [student] : [] });
    for (const alias of [student.temporaryEntityId, raw.temporaryId, raw.temporaryStudentId].filter(value => typeof value === "string" && value)) {
      if (aliases.has(alias) && aliases.get(alias) !== student.id) {
        const previous = aliases.get(alias);
        const message = "Identificador de aluno repetido no material. Reimporte separadamente os alunos indicados para associar seus dados com segurança.";
        if (previous) groups.get(previous)!.associationError = message;
        groups.get(student.id)!.associationError = message;
        aliases.set(alias, null);
      } else aliases.set(alias, student.id);
    }
  }
  for (const record of records.filter(row => row.entityType !== "STUDENT" && pending(row))) {
    const raw = data(record);
    const targetStudentIds: string[] = Array.isArray(raw.targetStudentIds) && raw.targetStudentIds.length > 0
      ? raw.targetStudentIds
      : raw.temporaryStudentId
      ? [raw.temporaryStudentId]
      : [];
    const saveToLibrary = Boolean(raw.saveToLibrary || targetStudentIds.length === 0);

    if (targetStudentIds.length > 0) {
      for (const tempId of targetStudentIds) {
        const owner = aliases.get(tempId);
        if (owner) groups.get(owner)!.records.push(record);
        else groups.set(record.id, { name: typeof raw.name === "string" ? raw.name.slice(0, 150) : "Registro sem aluno", records: [record] });
      }
    } else if (saveToLibrary) {
      groups.set(record.id, { name: typeof raw.name === "string" ? `Biblioteca: ${raw.name.slice(0, 150)}` : "Treino na Biblioteca", records: [record] });
    } else {
      groups.set(record.id, { name: typeof raw.name === "string" ? raw.name.slice(0, 150) : "Registro sem aluno", records: [record], ...(aliases.get(raw.temporaryStudentId) === null ? { associationError: "Associação de aluno ambígua. Reimporte separadamente este material para identificar o aluno correto." } : {}) });
    }
  }
  return [...groups.values()].filter(group => group.records.length);
}
function commitFailure(error: unknown): { code: string; message: string } {
  if (error instanceof WorkspaceAccessError) return { code: error.code, message: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { code: "DUPLICATE_IDENTITY", message: "CPF, e-mail ou matrícula já utilizado. Confira a identificação do aluno." };
  return { code: "COMMIT_FAILED", message: "Não foi possível salvar este aluno e seus dados. Confira o cadastro e tente novamente." };
}

/** One claim and draft load; independent short transactions; no polling or progress writes. */
export async function prepareGymMigrationCommit(input: Input) {
  const runKey = `gym-import:${randomUUID()}`;
  const prepared = await serializableTransaction(async tx => {
    await assertGymModule(input.workspaceId, "import", tx);
    const access = await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "students.manage");
    const unitId = input.unitId || (access.units.length === 1 ? access.units[0].id : undefined);
    if (!unitId || !access.units.some(unit => unit.id === unitId)) throw new WorkspaceAccessError(400, "UNIT_REQUIRED", "Selecione uma unidade autorizada para concluir a importação.");
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "students.manage", unitId);
    const job = await tx.importJob.findFirst({ where: { id: input.jobId, workspaceId: input.workspaceId }, include: { records: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 501, select: { id: true, entityType: true, temporaryEntityId: true, normalizedData: true, matchedEntityId: true, status: true, reviewStatus: true, errorCode: true, safeErrorMessage: true } }, entityResults: { where: { entityType: "STUDENT" }, select: { temporaryEntityId: true, databaseEntityId: true } } } });
    if (!job) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Importação indisponível.");
    if (job.createdByUserId !== input.actorUserId) await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "workspace.manage", unitId);
    if (job.status === "COMPLETED") return { job, unitId, alreadyCommitted: true };
    if (job.records.length > 500) throw new WorkspaceAccessError(413, "INVALID_IMPORT", "Importe até 500 registros por lote.");
    const staleBefore = new Date(Date.now() - IMPORT_COMMIT_LEASE_MS), stale = job.status === "IMPORTING" && job.updatedAt <= staleBefore;
    if (!job.previewValidated || job.commitVersion !== input.commitVersion || (!stale && !["REVIEW", "READY", "FAILED", "PARTIAL"].includes(job.status))) throw new WorkspaceAccessError(409, "INVALID_IMPORT", "Gere uma prévia atualizada antes de confirmar. Outra confirmação pode estar em andamento.");
    const claimed = await tx.importJob.updateMany({ where: { id: job.id, workspaceId: input.workspaceId, commitVersion: input.commitVersion, previewValidated: true, status: job.status, ...(stale ? { updatedAt: { lte: staleBefore } } : {}) }, data: { status: "IMPORTING", processingStep: "COMMITTING", idempotencyKey: runKey, errorCode: null, safeErrorMessage: null } });
    if (!claimed.count) throw new WorkspaceAccessError(409, "INVALID_IMPORT", "A revisão mudou ou já está sendo processada.");
    return { job, unitId, alreadyCommitted: false };
  });
  return async function run(options: Options = {}): Promise<ImportCommitResult> {
    const { job, unitId } = prepared, groups = prepared.alreadyCommitted ? [] : groupImportStudents(job.records);
    const result: ImportCommitResult = { success: false, status: "PARTIAL", total: groups.length, processed: 0, succeeded: 0, failed: 0, failures: [], interrupted: false };
    const emit = (event: ImportCommitEvent) => { options.onProgress?.(event); };
    emit({ type: "started", total: groups.length });
    if (prepared.alreadyCommitted) {
      Object.assign(result, { success: true, alreadyCommitted: true, status: "COMPLETED" });
      emit({ type: "finished", result }); return result;
    }
    const startedAt = Date.now();
    try {
      const users = job.entityResults.map(row => row.databaseEntityId);
      const members = users.length ? await prisma.workspaceMember.findMany({ where: { workspaceId: input.workspaceId, unitId, isActive: true, userId: { in: users } }, select: { id: true, userId: true } }) : [];
      const byUser = new Map(members.map(member => [member.userId, { memberId: member.id, userId: member.userId }]));
      const knownStudents = new Map(job.entityResults.flatMap(row => byUser.has(row.databaseEntityId) ? [[row.temporaryEntityId, byUser.get(row.databaseEntityId)!] as const] : []));
      for (const group of groups) {
        if (options.isCancelled?.() || Date.now() - startedAt > 240_000) { result.interrupted = true; break; }
        let failure: ImportCommitFailure | undefined;
        try {
          if (group.associationError) throw new WorkspaceAccessError(409, "INVALID_IMPORT", group.associationError, { recordId: group.records[0].id });
          const needsReview = group.records.find(row => row.reviewStatus === "PENDING" && !legacyCatalogFailure(row));
          if (needsReview) throw new WorkspaceAccessError(409, "REVIEW_REQUIRED", formatRecordReviewReason(needsReview), { recordId: needsReview.id });
          await serializableTransaction(async tx => {
            const [claim] = await tx.$queryRaw<{ idempotencyKey: string | null; status: string }[]>`SELECT "idempotencyKey", "status" FROM "ImportJob" WHERE "id" = ${job.id} AND "workspaceId" = ${input.workspaceId} FOR UPDATE`;
            if (claim?.idempotencyKey !== runKey || claim.status !== "IMPORTING") throw new WorkspaceAccessError(409, "IMPORT_CLAIM_LOST", "Esta confirmação foi encerrada. Abra a revisão atualizada.");
            await assertGymModule(input.workspaceId, "import", tx);
            await writeGymMigrationRecords(tx, input, unitId, job, group.records, knownStudents);
            await tx.importRecord.updateMany({ where: { importJobId: job.id, id: { in: group.records.map(row => row.id) } }, data: { status: "COMMITTED", errorCode: null, safeErrorMessage: null } });
          });
          result.succeeded++;
        } catch (error) {
          if (error instanceof WorkspaceAccessError && error.code === "IMPORT_CLAIM_LOST") throw error;
          const recordId = error instanceof WorkspaceAccessError && typeof error.details?.recordId === "string" ? error.details.recordId : group.records[0].id;
          failure = { ...commitFailure(error), recordId, name: group.name, recordIds: group.records.map(row => row.id) };
          await prisma.importRecord.updateMany({ where: { importJobId: job.id, importJob: { idempotencyKey: runKey, status: "IMPORTING" }, id: { in: failure.recordIds }, status: { not: "COMMITTED" } }, data: { status: "FAILED", errorCode: failure.code, safeErrorMessage: failure.message } });
          await prisma.importRecord.updateMany({ where: { id: recordId, importJobId: job.id, status: "FAILED", importJob: { idempotencyKey: runKey } }, data: { reviewStatus: "PENDING" } });
          result.failures.push(failure); result.failed++;
        }
        result.processed++;
        emit({ type: "progress", total: result.total, processed: result.processed, succeeded: result.succeeded, failed: result.failed, recordIds: group.records.map(row => row.id), ...(failure ? { failure } : {}) });
      }
    } catch { result.interrupted = true; }
    const pendingSources = await prisma.importSource.count({ where: { importJobId: job.id, status: { notIn: ["EXTRACTED", "PARSED"] } } });
    result.status = result.failed || result.interrupted || pendingSources ? "PARTIAL" : "COMPLETED";
    result.success = result.status === "COMPLETED";
    await prisma.importJob.updateMany({ where: { id: job.id, workspaceId: input.workspaceId, idempotencyKey: runKey, status: "IMPORTING" }, data: { status: result.status, processingStep: "IDLE", previewValidated: false, errorCode: result.interrupted ? "COMMIT_INTERRUPTED" : result.failed ? "COMMIT_PARTIAL" : null, safeErrorMessage: result.interrupted ? "Confirmação interrompida. Os cadastros concluídos foram preservados; confira os registros restantes." : result.failed ? `${result.failed} aluno(s) precisam de correção. Os demais cadastros foram preservados.` : null } });
    emit({ type: "finished", result }); return result;
  };
}
export async function commitGymMigrationJob(input: Input, options?: Options) { return (await prepareGymMigrationCommit(input))(options); }
