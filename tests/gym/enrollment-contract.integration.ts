import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { acceptGymContract, getGymContractForSigner } from "@/modules/workspaces/application/enrollment-contract";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture(minor = false) {
  const owner = await prisma.user.create({ data: { name: "Operador sintético" } });
  const student = await prisma.user.create({ data: { name: "Aluno sintético", birthDate: new Date(minor ? "2013-01-15T00:00:00Z" : "1990-01-15T00:00:00Z") } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "Academia contrato", slug: `contract-${randomUUID()}`, subscription: { create: { status: "ACTIVE" } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, isMinor: minor, studentProfile: { create: {} } } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano contratado" } });
  const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt("9007199254740993"), enrollmentFeeInCents: BigInt(1000), termsText: "Condições sintéticas, sem validade jurídica real." } });
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, planVersionId: version.id, unitId: unit.id, priceInCents: version.priceInCents, enrollmentFeeInCents: version.enrollmentFeeInCents, startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000) } });
  return { owner, student, workspace, unit, member, plan, version, enrollment };
}
describe("Contrato GYM — condições exibidas, signatário e atomicidade", () => {
  it("adulto confirma somente contrato próprio, sem segredo e com precisão; aceite não ativa nem recebe dinheiro", async () => {
    const f = await fixture(); const shown = await getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id);
    expect(shown.priceInCents).toBe("9007199254740993"); expect(shown.content).toContain("9007199254740993"); expect(shown.content).toContain(f.version.id); expect(JSON.stringify(shown)).not.toMatch(/password|creditCardToken|setupToken|cpf/);
    await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, f.owner.id)).rejects.toMatchObject({ code: "SIGNER_NOT_AUTHORIZED" });
    const result = await acceptGymContract({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, signerUserId: f.student.id, contractDigest: shown.contractDigest, accepted: true });
    expect(result.status).toBe("PENDING_ACTIVATION");
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ accessGranted: false, status: "PENDING_ACTIVATION" });
    expect(await prisma.gymContractAcceptance.findUnique({ where: { enrollmentId: f.enrollment.id } })).toMatchObject({ signerUserId: f.student.id, representationRole: "SELF", representedUserId: null, termsSnapshot: shown.content });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0); expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("confirmação falsa, digest inventado e condições alteradas não produzem aceite ou transição", async () => {
    const f = await fixture(); const shown = await getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id);
    const input = { workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, signerUserId: f.student.id, contractDigest: shown.contractDigest, accepted: true };
    await expect(acceptGymContract({ ...input, accepted: false })).rejects.toMatchObject({ statusCode: 400 });
    await expect(acceptGymContract({ ...input, contractDigest: "0".repeat(64) })).rejects.toMatchObject({ statusCode: 409 });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { priceInCents: BigInt(999) } });
    await expect(acceptGymContract(input)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.gymContractAcceptance.count({ where: { workspaceId: f.workspace.id } })).toBe(0); expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "PENDING_ACCEPTANCE", accessGranted: false });
  });
  it("aceites simultâneos e retry preservam um snapshot, um evento e um registro de auditoria", async () => {
    const f = await fixture(); const shown = await getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id);
    const input = { workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, signerUserId: f.student.id, contractDigest: shown.contractDigest, accepted: true };
    const results = await Promise.all([acceptGymContract(input), acceptGymContract(input)]); expect(results[0].signedAt).toEqual(results[1].signedAt);
    expect(await prisma.gymContractAcceptance.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1); expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: f.enrollment.id, action: { startsWith: "GYM_CONTRACT_ACCEPTED:" } } })).toBe(1);
    await prisma.gymPlanVersion.update({ where: { id: f.version.id }, data: { termsText: "Condições indevidamente alteradas depois do aceite" } });
    expect((await getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id)).content).toBe(shown.content);
  });
  it("menor não assina; responsável precisa conta correspondente, verificação, poder legal e vínculo atual sem membership", async () => {
    const f = await fixture(true); const parent = await prisma.user.create({ data: { cpfCnpj: "12345678909", birthDate: new Date("1990-01-15T00:00:00Z") } });
    const guardian = await prisma.gymGuardian.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, guardianUserId: parent.id, cpf: "12345678909", name: "Responsável", phone: "11900000000", relationship: "MAE" } });
    await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, parent.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.gymGuardian.update({ where: { id: guardian.id }, data: { verifiedAt: new Date(), isLegalRepresentative: false } });
    await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, parent.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.gymGuardian.update({ where: { id: guardian.id }, data: { isLegalRepresentative: true } });
    const shown = await getGymContractForSigner(f.workspace.id, f.enrollment.id, parent.id);
    const input = { workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, signerUserId: parent.id, accepted: true, contractDigest: shown.contractDigest };
    await prisma.user.update({ where: { id: parent.id }, data: { cpfCnpj: "52998224725" } });
    await expect(acceptGymContract(input)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.user.update({ where: { id: parent.id }, data: { cpfCnpj: "12345678909" } });
    await acceptGymContract(input); expect(await prisma.gymContractAcceptance.findUnique({ where: { enrollmentId: f.enrollment.id } })).toMatchObject({ representedUserId: f.student.id, representationRole: "MAE", signerUserId: parent.id });
    expect(await prisma.workspaceMember.count({ where: { userId: parent.id } })).toBe(0);
    await prisma.gymGuardian.update({ where: { id: guardian.id }, data: { revokedAt: new Date() } });
    await expect(acceptGymContract(input)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("academia suspensa, licença vencida, unidade alheia e plano de outro tenant são recusados no domínio", async () => {
    const f = await fixture(); const other = await fixture();
    await expect(getGymContractForSigner(other.workspace.id, f.enrollment.id, f.student.id)).rejects.toMatchObject({ statusCode: 404 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } }); await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: true } });
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { endDate: new Date(Date.now() - 1000) } }); await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { endDate: null } });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { unitId: other.unit.id } }); await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { unitId: f.unit.id, planVersionId: other.version.id } }); await expect(getGymContractForSigner(f.workspace.id, f.enrollment.id, f.student.id)).rejects.toMatchObject({ statusCode: 404 });
  });
});
