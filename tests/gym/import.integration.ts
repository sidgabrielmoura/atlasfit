import { randomUUID, createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import Papa from "papaparse";
import prisma from "@/lib/prisma";
import { GymImportService } from "@/modules/workspaces/application/gym-import-service";
import { GYM_IMPORT_MAX_BYTES } from "@/modules/workspaces/application/gym-import-commands";
import { GYM_CONFIG_KEYS } from "@/modules/workspaces/application/gym-feature-flags-service";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture() {
  const owner = await prisma.user.create({ data: { email: `import-owner-${randomUUID()}@example.invalid` } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, name: "Importação sintética", slug: `import-${randomUUID()}`, type: "GYM" } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  await prisma.workspaceSubscription.create({ data: { workspaceId: workspace.id, status: "ACTIVE", maxStudents: 10 } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano sintético" } });
  const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), durationDays: 30, termsText: "Condições de teste" } });
  const base = { workspaceId: workspace.id, unitId: unit.id, actorUserId: owner.id };
  const row = { Nome: "Aluno sintético", Email: `import-student-${randomUUID()}@example.invalid`, Data_Nascimento: "1990-01-15", Plano: plan.name };
  return { owner, workspace, unit, plan, version, base, row };
}
function csv(rows: Record<string, string>[]) { return Papa.unparse(rows, { delimiter: ";" }); }
function commitInput(base: { workspaceId: string; unitId: string; actorUserId: string }, preview: Awaited<ReturnType<typeof GymImportService.previewImport>>) { return { ...base, previewId: preview.previewId, importBatchHash: preview.importBatchHash }; }
describe("Importação GYM — prévia confiável e integridade PostgreSQL", () => {
  it("não aceita rows, flags, ações ou preços enviados pelo cliente nem hash sem prévia", async () => {
    const f = await fixture(); const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) });
    await expect(GymImportService.commitImport({ ...commitInput(f.base, preview), rows: [{ isMinor: false, status: "VALID", action: "NEW_STUDENT_AND_CONTRACT", planPriceInCents: 1 }] })).rejects.toMatchObject({ statusCode: 400 });
    await expect(GymImportService.commitImport({ ...commitInput(f.base, preview), previewId: randomUUID() })).rejects.toMatchObject({ statusCode: 404 });
    await expect(GymImportService.commitImport({ ...commitInput(f.base, preview), importBatchHash: "0".repeat(64) })).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
  it("commit simultâneo é único; retry conserva contadores e matrícula não ganha aceite/acesso/recorrência externa", async () => {
    const f = await fixture(); const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) });
    const input = commitInput(f.base, preview); const results = await Promise.all([GymImportService.commitImport(input), GymImportService.commitImport(input)]);
    expect(results.filter(result => result.alreadyCommitted)).toHaveLength(1);
    expect(results.every(result => result.createdStudentsCount === 1 && result.createdEnrollmentsCount === 1)).toBe(true);
    const enrollment = await prisma.gymEnrollment.findFirstOrThrow({ where: { workspaceId: f.workspace.id }, include: { acceptance: true, events: true } });
    expect(enrollment).toMatchObject({ status: "PENDING_ACCEPTANCE", accessGranted: false, recurrenceMode: "LOCAL", subscriptionStatus: "INACTIVE", providerSubscriptionId: null, priceInCents: f.version.priceInCents, acceptance: null });
    expect(enrollment.events).toHaveLength(1);
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, role: "STUDENT" } })).toBe(1);
    expect(await prisma.studentBilling.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.importEntityResult.count({ where: { importJobId: preview.previewId } })).toBe(1);
  });
  it("catálogo alterado exige nova conferência e não deixa criação parcial", async () => {
    const f = await fixture(); const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) });
    await prisma.gymPlan.update({ where: { id: f.plan.id }, data: { isActive: false } });
    await expect(GymImportService.commitImport(commitInput(f.base, preview))).rejects.toMatchObject({ code: "IMPORT_PREVIEW_CHANGED" });
    expect(await prisma.user.count({ where: { email: f.row.Email } })).toBe(0);
    expect(await prisma.importJob.findUnique({ where: { id: preview.previewId } })).toMatchObject({ status: "READY" });
  });
  it("prévia vincula academia, unidade e ator; grant por unidade não é global", async () => {
    const f = await fixture(); const foreign = await fixture();
    await expect(GymImportService.previewImport({ ...f.base, unitId: foreign.unit.id, csvContent: csv([f.row]) })).rejects.toMatchObject({ statusCode: 404 });
    const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) });
    await expect(GymImportService.commitImport({ ...commitInput(f.base, preview), workspaceId: foreign.workspace.id, actorUserId: foreign.owner.id, unitId: foreign.unit.id })).rejects.toMatchObject({ statusCode: 404 });
    const otherUnit = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Outra unidade" } });
    await expect(GymImportService.commitImport({ ...commitInput(f.base, preview), unitId: otherUnit.id })).rejects.toMatchObject({ code: "IMPORT_SCOPE_MISMATCH" });
    const staff = await prisma.user.create({ data: { email: `import-staff-${randomUUID()}@example.invalid` } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staff.id, role: "RECEPTIONIST", roleGrants: { create: { role: "RECEPTIONIST", unitId: f.unit.id, grantedBy: f.owner.id } } } });
    const ownPreview = await GymImportService.previewImport({ ...f.base, actorUserId: staff.id, csvContent: csv([{ ...f.row, Email: `import-staff-row-${randomUUID()}@example.invalid` }]) });
    await expect(GymImportService.previewImport({ ...f.base, actorUserId: staff.id, unitId: otherUnit.id, csvContent: csv([f.row]) })).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: member.id }, data: { revokedAt: new Date() } });
    await expect(GymImportService.commitImport(commitInput({ ...f.base, actorUserId: staff.id }, ownPreview))).rejects.toMatchObject({ statusCode: 403 });
  });
  it("dois lotes concorrentes respeitam a última vaga da licença", async () => {
    const f = await fixture(); await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { maxStudents: 1 } });
    const previews = await Promise.all([1, 2].map(index => GymImportService.previewImport({ ...f.base, csvContent: csv([{ ...f.row, Email: `import-quota-${index}-${randomUUID()}@example.invalid` }]) })));
    const outcomes = await Promise.allSettled(previews.map(preview => GymImportService.commitImport(commitInput(f.base, preview))));
    expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, role: "STUDENT" } })).toBe(1);
    expect(await prisma.importJob.count({ where: { workspaceId: f.workspace.id, status: "COMPLETED" } })).toBe(1);
    expect(await prisma.importJob.count({ where: { workspaceId: f.workspace.id, status: "READY" } })).toBe(1);
  });
  it("CPF, datas, preços, responsáveis e duplicidades inválidos não aceitam override", async () => {
    const f = await fixture();
    const invalidRows: Record<string, string>[] = [{ CPF: "00000000000" }, { Data_Nascimento: "2026-02-31" }, { Data_Nascimento: "2099-01-01" }, { Data_Nascimento: "2013-01-15" }, { Valor_Mensalidade: "1,00" }, { Saldo_Devedor: "12,50lixo" }, { Saldo_Devedor: "-1" }];
    for (const changes of invalidRows) {
      const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([{ ...f.row, ...changes }]) });
      expect(preview.invalidRows).toBe(1);
      await expect(GymImportService.commitImport({ ...commitInput(f.base, preview), overrideAmbiguities: true, acceptLegacyBalances: true })).rejects.toMatchObject({ statusCode: 400 });
    }
    const duplicate = await GymImportService.previewImport({ ...f.base, csvContent: csv([f.row, f.row]) });
    expect(duplicate.invalidRows).toBe(1);
    await expect(GymImportService.commitImport({ ...commitInput(f.base, duplicate), overrideAmbiguities: true })).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.user.count({ where: { email: f.row.Email } })).toBe(0);
  });
  it("menor mantém responsável não verificado e nenhuma conta própria ou aceite fictício", async () => {
    const f = await fixture(); const row = { ...f.row, Data_Nascimento: "2013-01-15", Responsavel_Nome: "Responsável sintético", Responsavel_CPF: "12345678909", Responsavel_Telefone: "11900000000", Parentesco: "MAE" };
    const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([row]) }); expect(preview.invalidRows).toBe(0); expect(preview.rows[0]).toMatchObject({ isMinor: true, hasGuardianData: true });
    await GymImportService.commitImport(commitInput(f.base, preview));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.row.Email } }); expect(user).toMatchObject({ password: null, setupToken: null, setupTokenExpiresAt: null });
    const member = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId: user.id, workspaceId: f.workspace.id } } }); expect(member.isMinor).toBe(true);
    expect(await prisma.gymGuardian.findFirst({ where: { studentMemberId: member.id } })).toMatchObject({ verifiedAt: null, guardianUserId: null, hasHealthAccess: false, cpf: row.Responsavel_CPF });
    expect(await prisma.legalAcceptance.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.gymContractAcceptance.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("saldo legado exige confirmação e alçada; dívida/crédito não criam recebimento, caixa ou cobrança externa", async () => {
    const f = await fixture(); const preview = await GymImportService.previewImport({ ...f.base, csvContent: csv([{ ...f.row, Saldo_Devedor: "25,50", Vencimento_Saldo: "2026-09-01", Saldo_Credor: "10,00" }]) });
    await expect(GymImportService.commitImport(commitInput(f.base, preview))).rejects.toMatchObject({ code: "LEGACY_BALANCES_CONFIRMATION_REQUIRED" });
    const result = await GymImportService.commitImport({ ...commitInput(f.base, preview), acceptLegacyBalances: true }); expect(result).toMatchObject({ totalOpeningDebitInCents: 2550, totalOpeningCreditInCents: 1000, createdInvoicesCount: 1 });
    expect(await prisma.gymEnrollment.findFirst({ where: { workspaceId: f.workspace.id } })).toMatchObject({ creditBalanceInCents: BigInt(1000), accessGranted: false });
    expect(await prisma.gymInvoice.findFirst({ where: { workspaceId: f.workspace.id } })).toMatchObject({ totalInCents: BigInt(2550), balanceRemainingInCents: BigInt(2550), paidAmountInCents: BigInt(0), dueDate: new Date("2026-09-01T00:00:00Z"), billingId: null });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.gymCashDrawerSession.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    const receptionist = await prisma.user.create({ data: { email: `import-reception-${randomUUID()}@example.invalid` } }); await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: receptionist.id, role: "RECEPTIONIST" } });
    const base = { ...f.base, actorUserId: receptionist.id }; const other = { ...f.row, Email: `import-balance-deny-${randomUUID()}@example.invalid`, Saldo_Devedor: "10", Vencimento_Saldo: "2026-09-01" };
    const own = await GymImportService.previewImport({ ...base, csvContent: csv([other]) });
    await expect(GymImportService.commitImport({ ...commitInput(base, own), acceptLegacyBalances: true })).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.user.count({ where: { email: other.Email } })).toBe(0);
  });
  it("prévia expirada exige renovação; lote histórico não é reimportado automaticamente", async () => {
    const f = await fixture(); const content = csv([f.row]); const preview = await GymImportService.previewImport({ ...f.base, csvContent: content });
    const record = await prisma.importRecord.findFirstOrThrow({ where: { importJobId: preview.previewId } });
    await prisma.importRecord.update({ where: { id: record.id }, data: { normalizedData: { unitId: f.unit.id, rowsHash: "0".repeat(64), expiresAt: new Date(Date.now() - 1000).toISOString() } } });
    await expect(GymImportService.commitImport(commitInput(f.base, preview))).rejects.toMatchObject({ code: "IMPORT_PREVIEW_EXPIRED" });
    const renewed = await GymImportService.previewImport({ ...f.base, csvContent: content }); expect(renewed.previewId).toBe(preview.previewId);
    await prisma.importJob.create({ data: { workspaceId: f.workspace.id, createdByUserId: f.owner.id, idempotencyKey: `GYM_IMPORT:${createHash("sha256").update(JSON.stringify([f.workspace.id, f.unit.id, preview.importBatchHash])).digest("hex")}`, sourceType: "SPREADSHEET", schemaVersion: "gym-import-v2", sourcePlatform: "GYM", status: "COMPLETED" } });
    await expect(GymImportService.previewImport({ ...f.base, csvContent: content })).rejects.toMatchObject({ code: "LEGACY_IMPORT_REVIEW_REQUIRED" });
  });
  it("limites, parse completo, suspensão e flag são aplicados no serviço", async () => {
    const f = await fixture();
    await expect(GymImportService.previewImport({ ...f.base, csvContent: "a".repeat(GYM_IMPORT_MAX_BYTES + 1) })).rejects.toMatchObject({ statusCode: 400 });
    await expect(GymImportService.previewImport({ ...f.base, csvContent: csv(Array.from({ length: 101 }, () => f.row)) })).rejects.toMatchObject({ statusCode: 400 });
    await expect(GymImportService.previewImport({ ...f.base, csvContent: 'Nome;Email\n"unterminated' })).rejects.toMatchObject({ statusCode: 400 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) })).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: true } });
    const key = GYM_CONFIG_KEYS.ASSISTED_IMPORT_ENABLED; const previous = await prisma.systemSetting.findUnique({ where: { key } });
    await prisma.systemSetting.upsert({ where: { key }, create: { key, value: "false" }, update: { value: "false" } });
    try { await expect(GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) })).rejects.toMatchObject({ statusCode: 403 }); }
    finally { if (previous) await prisma.systemSetting.update({ where: { key }, data: { value: previous.value } }); else await prisma.systemSetting.delete({ where: { key } }); }
  });
  it("conta externa não é vinculada automaticamente; matrícula pendente ignora a linha inteira sem duplicar saldos", async () => {
    const f = await fixture();
    await prisma.user.create({ data: { email: f.row.Email, name: "Identidade global preservada", birthDate: new Date("1990-01-15T00:00:00Z") } });
    const outside = await GymImportService.previewImport({ ...f.base, csvContent: csv([f.row]) }); expect(outside.invalidRows).toBe(1);
    await expect(GymImportService.commitImport(commitInput(f.base, outside))).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    const freshRow = { ...f.row, Email: `import-local-${randomUUID()}@example.invalid` };
    const initial = await GymImportService.previewImport({ ...f.base, csvContent: csv([freshRow]) }); await GymImportService.commitImport(commitInput(f.base, initial));
    const repeated = await GymImportService.previewImport({ ...f.base, csvContent: csv([{ ...freshRow, Saldo_Devedor: "10,00", Vencimento_Saldo: "2026-09-01" }]) });
    expect(repeated.rows[0]).toMatchObject({ action: "SKIP_ALREADY_ACTIVE", status: "WARNING" }); expect(repeated.totalOpeningDebitInCents).toBe(0);
    const result = await GymImportService.commitImport({ ...commitInput(f.base, repeated), overrideAmbiguities: true }); expect(result.totalProcessed).toBe(0);
    expect(await prisma.gymEnrollment.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { email: f.row.Email } })).toMatchObject({ name: "Identidade global preservada" });
  });
});
