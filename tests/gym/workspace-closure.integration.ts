import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { closeGymWorkspace, previewGymClosure } from "@/modules/workspaces/application/gym-closure";
import { assertGymOperationalWorkspace } from "@/modules/workspaces/application/gym-license";
import { updateWorkspaceAdministration } from "@/modules/workspaces/application/workspace-administration";
import { SuperAdminGymService } from "@/modules/workspaces/application/superadmin-service";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || !(database.pathname === "/atlasfit_gym_stabilization_20261001" || (process.env.GYM_FINAL_SCHEMA_TEST === "1" && /^\/atlasfit_completion_tests_[a-f0-9]+$/.test(database.pathname)))) throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture() {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", ownerId: owner.id, name: "Encerramento sintético", slug: `closure-${randomUUID()}`, members: { create: { userId: owner.id, role: "OWNER", roleGrants: { create: { role: "OWNER" } } } }, subscription: { create: { status: "ACTIVE" } }, units: { create: { name: "Matriz" } } } });
  const student = await prisma.user.create({ data: {} });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", studentProfile: { create: {} }, roleGrants: { create: { role: "STUDENT" } } } });
  const version = await prisma.gymPlanVersion.create({ data: { name: "Plano preservado", priceInCents: BigInt(10000), termsText: "Contrato preservado", plan: { create: { workspaceId: workspace.id, name: "Plano" } } } });
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, planVersionId: version.id, status: "ACTIVE", priceInCents: BigInt(10000), accessGranted: true, nextCycleBillingDate: new Date(), acceptance: { create: { workspaceId: workspace.id, signerUserId: student.id, termsVersion: "1", termsSnapshot: "Contrato preservado" } } } });
  const invoice = await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, enrollmentId: enrollment.id, studentMemberId: member.id, studentUserId: student.id, invoiceNumber: randomUUID(), title: "Obrigação preservada", dueDate: new Date(), subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), payerName: "Aluno sintético", createdByUserId: owner.id } });
  const key = `workspace/${workspace.id}/files/synthetic.pdf`;
  await prisma.gymStorageObject.create({ data: { workspaceId: workspace.id, objectKey: key, actorUserId: owner.id, target: "student_file", size: BigInt(100), status: "FINALIZED" } });
  await prisma.studentFile.create({ data: { workspaceId: workspace.id, studentId: student.id, uploadedBy: owner.id, name: "Arquivo preservado", category: "outros", type: "file", url: `/api/storage/file?key=${encodeURIComponent(key)}`, objectKey: key, size: 100 } });
  const input = { workspaceId: workspace.id, requestKey: randomUUID(), confirmationSlug: workspace.slug, reason: "Encerramento sintético autorizado" };
  return { owner, student, member, workspace, enrollment, invoice, input };
}
describe("GYM PostgreSQL — encerramento coordenado", () => {
  it("encerra atomicamente, preserva contratos/recebíveis/arquivos/identidade e deduplica concorrência", async () => {
    const f = await fixture();
    const personal = await prisma.workspace.create({ data: { name: "PERSONAL preservado", slug: randomUUID(), ownerId: f.owner.id, type: "PERSONAL" } });
    expect(await previewGymClosure(f.workspace.id, f.owner.id)).toMatchObject({ canClose: true, retained: { contracts: 1, invoices: 1, files: 1, objects: 1 } });
    const receipts = await Promise.all(Array.from({ length: 4 }, () => closeGymWorkspace(f.input, f.owner.id)));
    expect(new Set(receipts.map(receipt => receipt.receiptId)).size).toBe(1);
    expect(receipts.filter(receipt => !receipt.alreadyClosed)).toHaveLength(1);
    expect(await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).toMatchObject({ isActive: false, ownerId: f.owner.id });
    expect(await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } })).toMatchObject({ status: "CANCELED" });
    expect(await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).toMatchObject({ status: "CANCELLED", autoRenew: false, accessGranted: false, nextCycleBillingDate: null });
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    expect(await prisma.gymInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } })).toMatchObject({ totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000) });
    expect(await prisma.gymContractAcceptance.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.studentFile.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.gymStorageObject.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: f.student.id } })).not.toBeNull();
    expect(await prisma.workspace.findUniqueOrThrow({ where: { id: personal.id } })).toMatchObject({ isActive: true });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, isActive: true } })).toBe(0);
    expect(await prisma.workspaceRoleGrant.count({ where: { member: { workspaceId: f.workspace.id }, revokedAt: null } })).toBe(0);
    await expect(assertGymOperationalWorkspace(f.workspace.id)).rejects.toMatchObject({ statusCode: 403 });
    const capabilities = await resolveRealtimeCapabilities(f.student.id, f.workspace.id);
    expect(Object.keys(capabilities).some(channel => channel.includes(f.workspace.id))).toBe(false);
    await expect(closeGymWorkspace({ ...f.input, reason: "Outro motivo de encerramento" }, f.owner.id)).rejects.toMatchObject({ statusCode: 409 });
  });
  it("assinatura externa bloqueia sem alterações, mesmo em academia já suspensa", async () => {
    const f = await fixture(); await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { providerSubscriptionId: "synthetic-external-subscription" } });
    expect(await previewGymClosure(f.workspace.id, f.owner.id)).toMatchObject({ canClose: false, blockers: { externalEnrollments: 1 } });
    await expect(closeGymWorkspace(f.input, f.owner.id)).rejects.toMatchObject({ statusCode: 409, code: "REVIEW_REQUIRED" });
    expect(await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).toMatchObject({ status: "ACTIVE", accessGranted: true });
    expect(await prisma.auditLog.count({ where: { entityId: f.workspace.id, action: "GYM_WORKSPACE_CLOSED" } })).toBe(0);
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, isActive: true } })).toBe(2);
  });
  it("importação em andamento impede encerramento e conserva matrícula", async () => {
    const f = await fixture(); await prisma.importJob.create({ data: { workspaceId: f.workspace.id, status: "IMPORTING" } });
    await expect(closeGymWorkspace(f.input, f.owner.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).toMatchObject({ isActive: true });
  });
  it("revalida titular, tipo e confirmação e impede reativação administrativa ou da licença", async () => {
    const f = await fixture(), admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
    await expect(closeGymWorkspace(f.input, admin.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(closeGymWorkspace({ ...f.input, confirmationSlug: "academia-errada" }, f.owner.id)).rejects.toMatchObject({ statusCode: 409 });
    await expect(closeGymWorkspace({ ...f.input, actorUserId: f.owner.id }, f.owner.id)).rejects.toMatchObject({ statusCode: 400 });
    await closeGymWorkspace(f.input, f.owner.id);
    await expect(updateWorkspaceAdministration(f.workspace.id, { isActive: true, expectedIsActive: false }, admin.id)).rejects.toMatchObject({ statusCode: 409 });
    await expect(SuperAdminGymService.updateGymConfig({ workspaceId: f.workspace.id, adminUserId: admin.id, subscription: { status: "ACTIVE" } })).rejects.toMatchObject({ statusCode: 409 });
    await expect(closeGymWorkspace(f.input, admin.id)).rejects.toMatchObject({ statusCode: 403 });
    const personal = await prisma.workspace.create({ data: { ownerId: f.owner.id, type: "PERSONAL", name: "Outra assessoria", slug: randomUUID() } });
    await expect(closeGymWorkspace({ ...f.input, workspaceId: personal.id, confirmationSlug: personal.slug }, f.owner.id)).rejects.toMatchObject({ statusCode: 404 });
  });
});
