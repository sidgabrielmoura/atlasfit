import { createHash, randomUUID } from "node:crypto";
import Papa from "papaparse";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";
import { parseBrlCents } from "../domain/currency-input";
import { safeCentsNumber } from "../domain/money";
import { resolveAccessRoles } from "../domain/access-roles";
import { WorkspaceAccessError, type WorkspaceAccessErrorCode } from "../domain/types";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { assertGymModule } from "./gym-module-authority";
import { assertGymStudentCapacity } from "./gym-student-commands";
import type { PreviewGymImportInput, GymImportPreviewRow, GymImportPreviewResult, CommitGymImportInput, GymImportCommitResult } from "./gym-import-service";

export const GYM_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const GYM_IMPORT_MAX_ROWS = 100;
const SCHEMA = "gym-import-v3";
const id = z.string().trim().min(1).max(100);
const base = { workspaceId: id, actorUserId: id, unitId: id.optional() };
const metadataSchema = z.object({ unitId: id, expiresAt: z.iso.datetime(), rowsHash: z.string().regex(/^[a-f0-9]{64}$/) });
const resultSchema = z.object({ success: z.literal(true), importBatchHash: z.string(), message: z.string(), totalProcessed: z.number().int(), createdStudentsCount: z.number().int(), linkedStudentsCount: z.number().int(), createdEnrollmentsCount: z.number().int(), createdInvoicesCount: z.number().int(), totalOpeningDebitInCents: z.number().int().safe(), totalOpeningCreditInCents: z.number().int().safe() });
function fail(message: string, code: WorkspaceAccessErrorCode = "INVALID_IMPORT", status = 400): never { throw new WorkspaceAccessError(status, code, message); }
function sha(value: string) { return createHash("sha256").update(value).digest("hex"); }
function rowsHash(rows: GymImportPreviewRow[]) { return sha(JSON.stringify(rows)); }
function parse<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) fail("Dados da importação inválidos."); return result.data; }
async function transaction<T>(operation: (tx: GymTransactionClient) => Promise<T>): Promise<T> {
  try { return await serializableTransaction(operation); }
  catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error; return serializableTransaction(operation); }
}

/** Civil ISO dates only: JS date rollover must not silently change imported identity or vigency. */
function civilDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : undefined;
}
async function scope(tx: GymTransactionClient, workspaceId: string, actorUserId: string, unitId?: string) {
  await assertGymModule(workspaceId, "import", tx);
  const units = await tx.gymUnit.findMany({ where: { workspaceId, isActive: true, ...(unitId ? { id: unitId } : {}) }, select: { id: true }, take: 2, orderBy: { id: "asc" } });
  if (!units.length) fail("Unidade ativa não encontrada nesta academia.", "UNIT_NOT_FOUND", 404);
  if (units.length !== 1) fail("Selecione a unidade da importação.", "UNIT_REQUIRED");
  const target = units[0].id;
  await assertActorAuthority(tx, workspaceId, actorUserId, "students.manage", target);
  return target;
}

async function analyse(tx: GymTransactionClient, workspaceId: string, unitId: string, csvContent: string): Promise<GymImportPreviewResult> {
  if (!csvContent.trim() || Buffer.byteLength(csvContent, "utf8") > GYM_IMPORT_MAX_BYTES) fail("Envie um CSV de até 2 MB.");
  const parsed = Papa.parse<Record<string, string>>(csvContent, { header: true, skipEmptyLines: "greedy", transformHeader: header => header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_") });
  if (parsed.errors.length || !parsed.data.length || parsed.data.length > GYM_IMPORT_MAX_ROWS) fail("O CSV deve conter de 1 a 100 linhas, com colunas consistentes e sem cabeçalhos repetidos.");
  if (!parsed.meta.fields?.some(field => ["nome", "name", "aluno"].includes(field))) fail("A coluna Nome é obrigatória.");
  const plans = await tx.gymPlan.findMany({ where: { workspaceId, isActive: true }, include: { versions: { where: { isActive: true }, orderBy: { version: "desc" }, take: 1 } } });
  const rows: GymImportPreviewRow[] = [];
  const seenCpf = new Set<string>(); const seenEmail = new Set<string>(); const seenRegistration = new Set<string>();
  for (const [index, raw] of parsed.data.entries()) {
    const field = (...names: string[]) => names.map(name => raw[name]?.trim()).find(Boolean);
    const name = field("nome", "name", "aluno") || "";
    const email = field("email", "e-mail")?.toLowerCase(); const cpf = field("cpf", "documento")?.replace(/\D/g, "");
    const phone = field("telefone", "celular", "phone")?.replace(/\D/g, "");
    const birthDate = field("data_nascimento", "nascimento", "birthdate"); const birth = civilDate(birthDate);
    const registrationNumber = field("matricula", "registration_number");
    const planName = field("plano", "plan"); const startDate = field("data_inicio", "start_date"); const endDate = field("data_termino", "end_date");
    const openingDueDate = field("vencimento_saldo", "opening_due_date"); 
    const guardianName = field("responsavel_nome", "guardian_name"); const guardianCpf = field("responsavel_cpf", "guardian_cpf")?.replace(/\D/g, "");
    const guardianPhone = field("responsavel_telefone", "guardian_phone")?.replace(/\D/g, ""); const guardianRelationship = field("parentesco", "relationship");
    const messages: string[] = []; const invalid = (message: string) => messages.push(message);
    if (Object.values(raw).some(value => typeof value !== "string" || value.length > 2000)) invalid("Há um campo inválido ou com mais de 2.000 caracteres.");
    if (name.length < 2 || name.length > 150) invalid("Nome deve ter de 2 a 150 caracteres.");
    if (!cpf && !email) invalid("Informe CPF ou e-mail; nomes não identificam uma pessoa de forma única.");
    if (cpf && !isValidCPF(cpf)) invalid("CPF inválido.");
    if (email && !z.email().max(254).safeParse(email).success) invalid("E-mail inválido.");
    if (phone && !/^\d{10,13}$/.test(phone)) invalid("Telefone inválido.");
    if (!birth) invalid("Data de nascimento obrigatória no formato AAAA-MM-DD, sem datas inexistentes.");
    if (Object.entries(raw).some(([key, value]) => /^(cartao_acesso|tag|rfid|biometr.*|template.*|facial.*|digital.*)$/.test(key) && String(value ?? "").trim())) invalid("Colunas de equipamentos não são aceitas. Remova esses dados antes de importar.");
    const age = birth ? validateGymMinorEligibility(birth) : undefined;
    if (age && !age.isValid) invalid(age.error || "Idade inválida.");
    const isMinor = age?.isMinor ?? false;
    const hasGuardianData = Boolean(guardianName && guardianName.length >= 2 && guardianName.length <= 150 && guardianCpf && isValidCPF(guardianCpf) && guardianPhone && /^\d{10,13}$/.test(guardianPhone) && guardianRelationship && ["PAI", "MAE", "TUTOR_LEGAL", "OUTRO"].includes(guardianRelationship));
    if (isMinor && !hasGuardianData) invalid("Menor exige nome, CPF válido, telefone e parentesco do responsável. A importação não verifica representação nem registra aceite.");
    if (guardianCpf && cpf === guardianCpf) invalid("Aluno e responsável não podem ter o mesmo CPF.");
    if (registrationNumber && registrationNumber.length > 100) invalid("Matrícula deve ter até 100 caracteres.");
    for (const [value, seen, label] of [[cpf, seenCpf, "CPF"], [email, seenEmail, "E-mail"], [registrationNumber?.toLowerCase(), seenRegistration, "Matrícula"]] as const) {
      if (value) { if (seen.has(value)) invalid(`${label} repetido no lote.`); seen.add(value); }
    }
    const amount = (value: string | undefined, label: string) => { if (!value) return 0; const cents = parseBrlCents(value); if (cents === null) { invalid(`${label} inválido; use valor positivo com até duas casas decimais.`); return 0; } return cents; };
    const openingDebitInCents = amount(field("saldo_devedor", "debit"), "Saldo devedor"); const openingCreditInCents = amount(field("saldo_credor", "credit"), "Saldo credor");
    const price = field("valor_mensalidade", "price"); const customPrice = price ? amount(price, "Preço") : undefined;
    if (openingDebitInCents && !civilDate(openingDueDate)) invalid("Saldo devedor exige Vencimento_Saldo no formato AAAA-MM-DD.");
    if (startDate && !civilDate(startDate)) invalid("Data de início inválida.");
    if (endDate && (!civilDate(endDate) || !startDate || endDate <= startDate)) invalid("Fim deve ser uma data posterior ao início informado.");
    let plan = plans.find(value => value.id === planName || value.name.toLowerCase() === planName?.toLowerCase());
    if (planName && plans.filter(value => value.id === planName || value.name.toLowerCase() === planName.toLowerCase()).length !== 1) { invalid("Plano ausente, inativo ou ambíguo no catálogo."); plan = undefined; }
    const version = plan?.versions[0];
    if (planName && !version) invalid("Plano sem versão ativa.");
    if (version && customPrice !== undefined && BigInt(customPrice) !== version.priceInCents) invalid("Preço diferente do plano: negocie a condição na matrícula, com a alçada apropriada.");
    if (!planName && (price || openingCreditInCents)) invalid("Preço ou saldo credor exige um plano.");
    let action: GymImportPreviewRow["action"] = "NEW_STUDENT_AND_CONTRACT";
    const identities: Prisma.UserWhereInput[] = []; if (cpf) identities.push({ cpfCnpj: cpf }); if (email) identities.push({ email });
    const users = identities.length ? await tx.user.findMany({ where: { OR: identities }, select: { id: true, cpfCnpj: true, email: true, birthDate: true }, take: 3 }) : [];
    if (users.length > 1) invalid("CPF e e-mail apontam para identidades diferentes; regularize o cadastro.");
    const user = users.length === 1 ? users[0] : undefined;
    const member = user ? await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId } }, include: { roleGrants: true, studentProfile: true, gymEnrollments: { where: { status: { in: ["DRAFT", "PENDING_ACCEPTANCE", "PENDING_ACTIVATION", "ACTIVE", "PAUSED"] } }, take: 1 } } }) : null;
    if (user && !member) invalid("Conta existente fora desta academia: utilize o ingresso identificado, não a importação automática.");
    if (member) {
      action = "LINK_EXISTING_STUDENT";
      if (!member.isActive || !(member.studentProfile || resolveAccessRoles(member.role, member.roleGrants, member.unitId || undefined).includes("STUDENT"))) invalid("Vínculo não é de aluno ativo.");
      if (member.unitId !== unitId) invalid("Aluno pertence a outra unidade; utilize o fluxo de transferência.");
      if ((cpf && user?.cpfCnpj !== cpf) || (email && user?.email?.toLowerCase() !== email) || user?.birthDate?.toISOString().slice(0, 10) !== birthDate || member.isMinor !== isMinor) invalid("Identidade ou menoridade diverge do cadastro; a importação não altera User global.");
      if (registrationNumber && member.studentProfile?.registrationNumber !== registrationNumber) invalid("Matrícula diverge do cadastro existente.");
      if (member.gymEnrollments.length) action = "SKIP_ALREADY_ACTIVE";
    }
    if (registrationNumber && await tx.gymStudentProfile.findFirst({ where: { registrationNumber: { equals: registrationNumber, mode: "insensitive" }, member: { workspaceId, ...(member ? { id: { not: member.id } } : {}) } }, select: { id: true } })) invalid("Matrícula já utilizada nesta academia.");
    const row: GymImportPreviewRow = { rowNumber: index + 2, name, email, cpf, phone, birthDate, registrationNumber, isMinor, hasGuardianData, guardianName, guardianCpf, guardianPhone, guardianRelationship, planName: plan?.name || planName, planId: plan?.id, planPriceInCents: version ? safeCentsNumber(version.priceInCents) : undefined, planVersionId: version?.id, startDate, endDate, openingDueDate, openingDebitInCents, openingCreditInCents, status: messages.length ? "INVALID" : action === "SKIP_ALREADY_ACTIVE" ? "WARNING" : "VALID", action: messages.length ? "INVALID" : action, messages, existingMemberId: member?.id };
    if (action === "SKIP_ALREADY_ACTIVE" && !messages.length) row.messages.push("Aluno com matrícula vigente ou pendente: a linha inteira será ignorada, incluindo saldos.");
    rows.push(row);
  }
  const eligible = rows.filter(row => row.status !== "INVALID" && row.action !== "SKIP_ALREADY_ACTIVE");
  return { importBatchHash: sha(csvContent), totalRows: rows.length, validRows: rows.filter(row => row.status === "VALID").length, warningRows: rows.filter(row => row.status === "WARNING").length, invalidRows: rows.filter(row => row.status === "INVALID").length, totalNewStudents: eligible.filter(row => !row.existingMemberId).length, totalExistingStudents: eligible.filter(row => row.existingMemberId).length, totalContracts: eligible.filter(row => row.planVersionId).length, totalOpeningDebitInCents: safeCentsNumber(eligible.reduce((sum, row) => sum + BigInt(row.openingDebitInCents), BigInt(0))), totalOpeningCreditInCents: safeCentsNumber(eligible.reduce((sum, row) => sum + BigInt(row.openingCreditInCents), BigInt(0))), rows, securityNotice: "Matrículas importadas aguardam aceite e ativação. Saldos legados são registros internos, sem recebimento fictício ou cobrança externa." };
}

export async function previewGymImport(input: PreviewGymImportInput): Promise<GymImportPreviewResult> {
  const data = parse(z.object({ ...base, csvContent: z.string().min(1).max(GYM_IMPORT_MAX_BYTES) }).strict(), input);
  return transaction(async tx => {
    const unitId = await scope(tx, data.workspaceId, data.actorUserId, data.unitId);
    const preview = await analyse(tx, data.workspaceId, unitId, data.csvContent);
    const legacyKey = `GYM_IMPORT:${sha(JSON.stringify([data.workspaceId, unitId, preview.importBatchHash]))}`;
    if (await tx.importJob.findFirst({ where: { workspaceId: data.workspaceId, status: "COMPLETED", OR: [{ idempotencyKey: { in: [preview.importBatchHash, legacyKey] } }, { schemaVersion: { not: SCHEMA }, sourcePlatform: "GYM", sources: { some: { sha256: preview.importBatchHash } } }] }, select: { id: true } })) fail("Lote histórico já processado. Reconcilie o histórico antes de usar o novo importador.", "LEGACY_IMPORT_REVIEW_REQUIRED", 409);
    const key = `GYM_IMPORT_V3:${sha(JSON.stringify([data.workspaceId, unitId, preview.importBatchHash]))}`;
    let job = await tx.importJob.findUnique({ where: { idempotencyKey: key } });
    if (job && job.createdByUserId !== data.actorUserId) fail("A prévia pertence a outro operador. Solicite a conclusão ou revisão pelo responsável.", "IMPORT_ACTOR_MISMATCH", 409);
    const metadata = { unitId, expiresAt: new Date(Date.now() + 3600000).toISOString(), rowsHash: rowsHash(preview.rows) };
    if (!job) job = await tx.importJob.create({ data: { workspaceId: data.workspaceId, createdByUserId: data.actorUserId, sourceType: "SPREADSHEET", sourcePlatform: "GYM", schemaVersion: SCHEMA, status: "READY", idempotencyKey: key, previewValidated: true, totalStudents: preview.totalRows, sources: { create: { type: "SPREADSHEET", status: "PARSED", textContent: data.csvContent, sha256: preview.importBatchHash, sizeBytes: Buffer.byteLength(data.csvContent, "utf8") } }, records: { create: { entityType: "STUDENT", temporaryEntityId: "GYM_METADATA", source: "DETERMINISTIC", status: "READY", normalizedData: metadata } } } });
    else if (job.status === "READY") {
      await tx.importRecord.updateMany({ where: { importJobId: job.id, temporaryEntityId: "GYM_METADATA" }, data: { normalizedData: metadata } });
      await tx.importJob.update({ where: { id: job.id }, data: { totalStudents: preview.totalRows, previewValidated: true } });
    } else if (job.status !== "COMPLETED") fail("Lote indisponível para prévia.", "INVALID_IMPORT_STATE", 409);
    return { ...preview, previewId: job.id, unitId, expiresAt: metadata.expiresAt };
  });
}

export async function commitGymImport(input: CommitGymImportInput): Promise<GymImportCommitResult> {
  const data = parse(z.object({ ...base, previewId: id, importBatchHash: z.string().regex(/^[a-f0-9]{64}$/), acceptLegacyBalances: z.boolean().optional(), overrideAmbiguities: z.boolean().optional() }).strict(), input);
  return transaction(async tx => {
    const job = await tx.importJob.findFirst({ where: { id: data.previewId, workspaceId: data.workspaceId, createdByUserId: data.actorUserId, schemaVersion: SCHEMA }, include: { sources: true, records: { where: { temporaryEntityId: "GYM_METADATA" } } } });
    if (!job || job.sources.length !== 1 || job.records.length !== 1) fail("Prévia não encontrada para esta academia e operador.", "IMPORT_PREVIEW_NOT_FOUND", 404);
    const metadata = parse(metadataSchema, job.records[0].normalizedData);
    if (data.unitId && data.unitId !== metadata.unitId) fail("Unidade difere da prévia.", "IMPORT_SCOPE_MISMATCH", 409);
    const unitId = await scope(tx, data.workspaceId, data.actorUserId, metadata.unitId);
    const source = job.sources[0];
    if (!source.textContent || source.sha256 !== data.importBatchHash || sha(source.textContent) !== data.importBatchHash || job.idempotencyKey !== `GYM_IMPORT_V3:${sha(JSON.stringify([data.workspaceId, unitId, data.importBatchHash]))}`) fail("Conteúdo e hash da prévia não correspondem.", "IMPORT_CONTENT_MISMATCH", 409);
    if (job.status === "COMPLETED") return { ...parse(resultSchema, job.records[0].sourceData), alreadyCommitted: true };
    if (job.status !== "READY" || !job.previewValidated || new Date(metadata.expiresAt) <= new Date()) fail("Prévia expirada ou indisponível. Gere uma nova prévia.", "IMPORT_PREVIEW_EXPIRED", 409);
    const preview = await analyse(tx, data.workspaceId, unitId, source.textContent);
    if (rowsHash(preview.rows) !== metadata.rowsHash) fail("Cadastro ou catálogo mudou após a prévia. Gere uma nova conferência.", "IMPORT_PREVIEW_CHANGED", 409);
    if (preview.invalidRows) fail("Corrija todas as linhas inválidas antes de importar.");
    if (preview.warningRows && data.overrideAmbiguities !== true) fail("Confirme os alertas da prévia; essa confirmação não substitui validações.");
    if (preview.totalContracts) await assertActorAuthority(tx, data.workspaceId, data.actorUserId, "enrollments.manage", unitId);
    if (preview.totalOpeningDebitInCents || preview.totalOpeningCreditInCents) {
      if (data.acceptLegacyBalances !== true) fail("Confirme explicitamente a migração dos saldos históricos.", "LEGACY_BALANCES_CONFIRMATION_REQUIRED");
      await assertActorAuthority(tx, data.workspaceId, data.actorUserId, "invoices.issue", unitId);
      await assertActorAuthority(tx, data.workspaceId, data.actorUserId, "refunds.approve", unitId);
    }
    await assertGymStudentCapacity(tx, data.workspaceId, preview.totalNewStudents);
    await tx.importJob.update({ where: { id: job.id }, data: { status: "IMPORTING" } });
    let createdStudentsCount = 0; let linkedStudentsCount = 0; let createdEnrollmentsCount = 0; let createdInvoicesCount = 0;
    const now = new Date();
    for (const row of preview.rows) {
      if (row.action === "SKIP_ALREADY_ACTIVE") continue;
      let member = row.existingMemberId ? await tx.workspaceMember.findFirst({ where: { id: row.existingMemberId, workspaceId: data.workspaceId, isActive: true } }) : null;
      if (!member) {
        const user = await tx.user.create({ data: { name: row.name, email: row.email || null, cpfCnpj: row.cpf || null, whatsapp: row.phone || null, birthDate: civilDate(row.birthDate), role: "USER", setupToken: row.isMinor ? null : randomUUID(), setupTokenExpiresAt: row.isMinor ? null : newSetupTokenExpiry() } });
        member = await tx.workspaceMember.create({ data: { workspaceId: data.workspaceId, userId: user.id, role: "STUDENT", unitId, isActive: true, isMinor: row.isMinor, studentProfile: { create: { registrationNumber: row.registrationNumber || `MAT-IMP-${randomUUID()}`, enrolledAt: now, status: "ACTIVE" } }, roleGrants: { create: { role: "STUDENT", unitId, grantedBy: data.actorUserId } } } });
        if (row.isMinor) {
          // Identity is recorded, never falsely verified or granted health access by a spreadsheet.
          if (!row.guardianName || !row.guardianCpf || !row.guardianPhone || !row.guardianRelationship) fail("Responsável incompleto.");
          await tx.gymGuardian.create({ data: { workspaceId: data.workspaceId, studentMemberId: member.id, name: row.guardianName, cpf: row.guardianCpf, phone: row.guardianPhone, relationship: row.guardianRelationship, isLegalRepresentative: true, isFinancialResponsible: true, hasHealthAccess: false, verifiedAt: null } });
        }
        createdStudentsCount++;
      } else linkedStudentsCount++;
      let enrollmentId: string | undefined;
      if (row.planVersionId) {
        const version = await tx.gymPlanVersion.findFirstOrThrow({ where: { id: row.planVersionId, isActive: true, plan: { workspaceId: data.workspaceId, isActive: true } } });
        const startDate = civilDate(row.startDate) || now;
        const endDate = civilDate(row.endDate) || new Date(startDate.getTime() + version.durationDays * 86400000);
        const enrollment = await tx.gymEnrollment.create({ data: { workspaceId: data.workspaceId, studentMemberId: member.id, planVersionId: version.id, unitId, status: "PENDING_ACCEPTANCE", startDate, endDate, autoRenew: true, priceInCents: version.priceInCents, enrollmentFeeInCents: version.enrollmentFeeInCents, creditBalanceInCents: BigInt(row.openingCreditInCents), recurrenceMode: "LOCAL", subscriptionStatus: "INACTIVE", accessGranted: false, events: { create: { workspaceId: data.workspaceId, toStatus: "PENDING_ACCEPTANCE", actorId: data.actorUserId, reason: `Importação ${job.id}: aguardando aceite e ativação; saldo credor histórico=${row.openingCreditInCents} centavos, sem recebimento.` } } } });
        enrollmentId = enrollment.id; createdEnrollmentsCount++;
      }
      if (row.openingDebitInCents) {
        const amount = BigInt(row.openingDebitInCents); const dueDate = civilDate(row.openingDueDate); if (!dueDate) fail("Vencimento histórico inválido.");
        const invoice = await tx.gymInvoice.create({ data: { workspaceId: data.workspaceId, studentMemberId: member.id, studentUserId: member.userId, enrollmentId, invoiceNumber: `FAT-IMP-${job.id}-${row.rowNumber}`, title: "Saldo devedor histórico", description: `Importação ${job.id}, linha ${row.rowNumber}; registro interno sem recebimento ou cobrança externa.`, dueDate, subtotalInCents: amount, totalInCents: amount, balanceRemainingInCents: amount, payerType: "STUDENT", payerName: row.name, payerCpfCnpj: row.cpf, payerEmail: row.email, payerPhone: row.phone, createdByUserId: data.actorUserId } });
        await tx.gymInvoiceItem.create({ data: { invoiceId: invoice.id, description: "Saldo devedor histórico", quantity: 1, unitPriceInCents: amount, totalInCents: amount } });
        createdInvoicesCount++;
      }
      await tx.importEntityResult.create({ data: { importJobId: job.id, entityType: "STUDENT", action: row.existingMemberId ? "UPDATED" : "CREATED", temporaryEntityId: `ROW-${row.rowNumber}`, databaseEntityId: member.id } });
    }
    const result = { success: true, importBatchHash: data.importBatchHash, message: "Importação concluída. Matrículas aguardam aceite e ativação; nenhum pagamento ou comando externo foi executado.", totalProcessed: createdStudentsCount + linkedStudentsCount, createdStudentsCount, linkedStudentsCount, createdEnrollmentsCount, createdInvoicesCount, totalOpeningDebitInCents: preview.totalOpeningDebitInCents, totalOpeningCreditInCents: preview.totalOpeningCreditInCents } satisfies GymImportCommitResult;
    await tx.importRecord.update({ where: { id: job.records[0].id }, data: { status: "COMMITTED", sourceData: result } });
    await tx.importJob.update({ where: { id: job.id }, data: { status: "COMPLETED", totalStudents: result.totalProcessed } });
    await tx.auditLog.create({ data: { userId: data.actorUserId, action: `GYM_IMPORT_COMMITTED:${job.id}:unit=${unitId}:students=${result.totalProcessed}:debit=${result.totalOpeningDebitInCents}:credit=${result.totalOpeningCreditInCents}`, entity: "ImportJob", entityId: job.id, severity: "high" } });
    return { ...result, alreadyCommitted: false };
  });
}
