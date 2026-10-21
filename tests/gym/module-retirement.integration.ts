import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import prisma from "@/lib/prisma";
import { cancelGymStudent } from "@/modules/workspaces/application/gym-student-offboarding";
import { getGymReceptionSnapshot } from "@/modules/workspaces/application/gym-reception-query";
import { gymCommunicationService, gymNotificationSchema } from "@/modules/workspaces/application/gym-communication-service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(() => prisma.$disconnect());
async function fixture() {
  const owner = await prisma.user.create({ data: { name: "Titular sintético" } });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, name: "Academia sintética", slug: `retirement-${randomUUID()}`, ownerId: owner.id, type: "GYM", members: { create: { userId: owner.id, role: "OWNER" } } } });
  const unit = await prisma.gymUnit.create({ data: { name: "Unidade", workspaceId: workspace.id } });
  const user = await prisma.user.create({ data: { name: "Aluno sintético", role: "USER" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, unitId: unit.id, role: "STUDENT", studentProfile: { create: {} }, roleGrants: { create: { role: "STUDENT", unitId: unit.id, grantedBy: owner.id } } } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano" } });
  const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Condições", priceInCents: BigInt(10000), durationDays: 30, termsText: "Condições sintéticas" } });
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, unitId: unit.id, planVersionId: version.id, status: "ACTIVE", priceInCents: version.priceInCents, subscriptionStatus: "ACTIVE" } });
  return { owner, workspace, unit, user, member, enrollment };
}

describe("Retirada de módulos e operação preservada", () => {
  it("comunicação interna é fiel ao canal e respeita unidade, atribuição e suspensão", async () => {
    const f = await fixture(); const other = await fixture();
    const trainer = await prisma.user.create({ data: {} });
    const trainerMember = await prisma.workspaceMember.create({ data: { userId: trainer.id, workspaceId: f.workspace.id, unitId: f.unit.id, role: "TRAINER", roleGrants: { create: { role: "TRAINER", unitId: f.unit.id, grantedBy: f.owner.id } } } });
    const input = { requestKey: randomUUID(), workspaceId: f.workspace.id, senderUserId: trainer.id, title: "Aviso", message: "Mensagem sintética", targetAudience: "UNIT_STUDENTS" as const, targetFilter: { unitId: f.unit.id } };
    expect(gymNotificationSchema.safeParse({ workspaceId: f.workspace.id, title: "Aviso", message: "Mensagem", targetAudience: "ALL_STUDENTS", channel: "EMAIL" }).success).toBe(false);
    expect(await gymCommunicationService.sendTargetedNotification(input)).toMatchObject({ status: "PERSISTED", channel: "IN_APP", recipientsCount: 0 });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { assignedStaffId: trainerMember.id } });
    expect(await gymCommunicationService.sendTargetedNotification(input)).toMatchObject({ recipientsCount: 0 });
    input.requestKey = randomUUID();
    const results = await Promise.all(Array.from({ length: 8 }, () => gymCommunicationService.sendTargetedNotification(input)));
    for (const result of results) expect(result).toMatchObject({ status: "PERSISTED", channel: "IN_APP", recipientsCount: 1 });
    expect(new Set(results.map(result => result.dispatchId)).size).toBe(1);
    await expect(gymCommunicationService.sendTargetedNotification({ ...input, message: "Conteúdo divergente" })).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.notification.findMany({ where: { workspaceId: f.workspace.id } })).toMatchObject([{ userId: f.user.id, deepLink: "/student/dashboard" }]);
    await expect(gymCommunicationService.sendTargetedNotification({ ...input, targetFilter: { unitId: other.unit.id } })).rejects.toMatchObject({ statusCode: 404 });
    await expect(gymCommunicationService.sendTargetedNotification({ ...input, targetAudience: "ALL_STUDENTS", targetFilter: undefined })).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(gymCommunicationService.sendTargetedNotification(input)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    expect(await prisma.notification.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
  it("páginas, APIs e serviços retirados não existem no código executável", () => {
    for (const file of ["src/app/(gym)/gym/classes/page.tsx", "src/app/(gym)/gym/crm/page.tsx", "src/app/(gym)/gym/access/page.tsx", "src/app/api/gym/devices/route.ts", "src/app/api/gym/access/evaluate/route.ts", "src/app/api/gym/classes/sessions/route.ts", "src/app/api/gym/crm/leads/route.ts", "src/app/api/student/classes/route.ts", "src/app/api/guardian/dependents/[id]/classes/book/route.ts", "src/modules/workspaces/application/gym-device-service.ts", "src/modules/workspaces/application/gym-booking-service.ts", "src/modules/workspaces/application/gym-crm-service.ts"]) expect(existsSync(path.resolve(file)), file).toBe(false);
  });
  it("desligamento local preserva dívida, identidade e papel de profissional; retry não duplica", async () => {
    const f = await fixture();
    await prisma.workspaceRoleGrant.create({ data: { memberId: f.member.id, role: "TRAINER", unitId: f.unit.id, grantedBy: f.owner.id } });
    const invoice = await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, studentUserId: f.user.id, enrollmentId: f.enrollment.id, invoiceNumber: randomUUID(), title: "Dívida preservada", dueDate: new Date(), subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), payerName: "Aluno sintético", createdByUserId: f.owner.id } });
    const input = { workspaceId: f.workspace.id, studentMemberId: f.member.id, actorUserId: f.owner.id, reason: "Encerramento sintético" };
    expect(await cancelGymStudent(input)).toMatchObject({ cancelledEnrollmentsCount: 1, alreadyCancelled: false });
    expect(await cancelGymStudent(input)).toMatchObject({ cancelledEnrollmentsCount: 0, alreadyCancelled: true });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "CANCELLED", autoRenew: false, subscriptionStatus: "INACTIVE", accessGranted: false });
    expect(await prisma.workspaceMember.findUnique({ where: { id: f.member.id } })).toMatchObject({ isActive: true, role: "TRAINER" });
    expect(await prisma.workspaceRoleGrant.findMany({ where: { memberId: f.member.id, revokedAt: null } })).toMatchObject([{ role: "TRAINER" }]);
    expect(await prisma.gymInvoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: f.user.id } })).toMatchObject({ name: f.user.name, role: "USER" });
  });
  it("recepção não entrega financeiro a instrutor e leitura não autoriza desligar aluno", async () => {
    const f = await fixture(); const trainer = await prisma.user.create({ data: {} });
    await prisma.workspaceMember.create({ data: { userId: trainer.id, workspaceId: f.workspace.id, unitId: f.unit.id, role: "TRAINER" } });
    const snapshot = await getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: trainer.id });
    expect(snapshot.students.every(student => student.financialStatus === null)).toBe(true);
    await expect(cancelGymStudent({ workspaceId: f.workspace.id, studentMemberId: f.member.id, actorUserId: trainer.id, reason: "Tentativa inválida" })).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toHaveProperty("status", "ACTIVE");
  });
  it("assinatura externa exige reconciliação e cancelamento futuro não é antecipado", async () => {
    const f = await fixture(); const input = { workspaceId: f.workspace.id, studentMemberId: f.member.id, actorUserId: f.owner.id, reason: "Encerramento sintético" };
    await expect(cancelGymStudent({ ...input, immediate: false })).rejects.toMatchObject({ statusCode: 400 });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { providerSubscriptionId: "synthetic-legacy", recurrenceMode: "PROVIDER" } });
    await expect(cancelGymStudent(input)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toHaveProperty("status", "ACTIVE");
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
  });
});
