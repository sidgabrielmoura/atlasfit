import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { GymAnalyticsService as reports } from "@/modules/workspaces/application/gym-analytics-service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture() {
  const owner = await prisma.user.create({ data: { email: `report-owner-${randomUUID()}@example.invalid` } });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Academia dos relatórios", slug: randomUUID() } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  const a = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade A" } });
  const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade B" } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano" } });
  const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Plano", priceInCents: BigInt(1000), durationDays: 365, termsText: "Condições sintéticas dos relatórios" } });
  const members = [];
  const invoices = [];
  for (const [index, unit] of [a, b, a].entries()) {
    const user = await prisma.user.create({ data: { name: `Aluno ${index}`, email: `report-student-${randomUUID()}@example.invalid`, password: "nao-exportar", medicalConditions: "saude-nao-exportar" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, role: "STUDENT", userId: user.id, studentProfile: { create: {} } } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, unitId: unit.id, studentMemberId: member.id, planVersionId: version.id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 30 * 86400000), priceInCents: BigInt(1000), status: "ACTIVE", accessGranted: true } });
    const invoice = await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, enrollmentId: enrollment.id, studentMemberId: member.id, studentUserId: user.id, invoiceNumber: randomUUID(), title: `Obrigação ${index}`, dueDate: new Date(), subtotalInCents: BigInt(1000), totalInCents: BigInt(1000), balanceRemainingInCents: BigInt(1000), payerName: `Aluno ${index}`, createdByUserId: owner.id } });
    members.push(member); invoices.push(invoice);
  }
  const paidAt = new Date();
  await prisma.gymPayment.create({ data: { workspaceId: workspace.id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: BigInt(1600), payerName: "Pagador sintético", receivedByUserId: owner.id, paidAt, allocations: { create: [{ invoiceId: invoices[0].id, allocatedAmountInCents: BigInt(600) }, { invoiceId: invoices[1].id, allocatedAmountInCents: BigInt(1000) }] } } });
  const actor = await prisma.user.create({ data: { email: `report-actor-${randomUUID()}@example.invalid` } });
  const staff = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: actor.id, unitId: a.id, role: "MANAGER" } });
  return { owner, actor, staff, workspace, a, b, members, invoices, period: { startDate: new Date(paidAt.getTime() - 1000), endDate: new Date(paidAt.getTime() + 1000) } };
}

describe("GYM PostgreSQL — indicadores e exportação autorizados", () => {
  it("papel legado local não consulta global; grants substituem legado, preservam parcelas e revogam consultas", async () => {
    const f = await fixture();
    const input = { workspaceId: f.workspace.id, actorUserId: f.actor.id, ...f.period };
    const local = await reports.getOverview(input);
    expect(local.access).toEqual({ financial: true, unitIds: [f.a.id], includeUnassigned: false });
    expect(local.cashFlow.grossReceivedInCents).toBe(600);
    expect(local.executive.activeStudentsCount).toBe(2);
    const csv = await reports.exportData({ ...input, exportType: "INVOICES" });
    expect(csv.rowCount).toBe(2); expect(csv.content).not.toContain(f.invoices[1].invoiceNumber);
    for (const operation of [() => reports.getOverview({ ...input, unitId: f.b.id }), () => reports.exportData({ ...input, unitId: f.b.id, exportType: "PAYMENTS" })]) await expect(operation()).rejects.toMatchObject({ statusCode: 403 });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: f.staff.id, unitId: f.b.id, role: "FINANCE" } });
    const changed = await reports.getOverview(input);
    expect(changed.access.unitIds).toEqual([f.b.id]); expect(changed.cashFlow.grossReceivedInCents).toBe(1000);
    const received = await reports.exportData({ ...input, exportType: "PAYMENTS" });
    expect(received.content).toContain('"10.00"'); expect(received.content).not.toContain('"16.00"');
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    await expect(reports.getOverview(input)).rejects.toMatchObject({ statusCode: 403 });
    await expect(reports.exportData({ ...input, exportType: "STUDENTS" })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("treinador vê somente carteira da unidade, não obtém financeiro por parâmetros e respeita papéis acumulados", async () => {
    const f = await fixture();
    await prisma.workspaceMember.update({ where: { id: f.staff.id }, data: { role: "TRAINER" } });
    await prisma.workspaceMember.updateMany({ where: { id: { in: [f.members[0].id, f.members[1].id] } }, data: { assignedStaffId: f.staff.id } });
    const input = { workspaceId: f.workspace.id, actorUserId: f.actor.id, ...f.period };
    const own = await reports.getOverview({ ...input, includeFinancial: true });
    expect(own.access.financial).toBe(false); expect(own.executive.activeStudentsCount).toBe(1);
    expect(own.executive.mrrInCents).toBe(0); expect(own.cashFlow.grossReceivedInCents).toBe(0);
    const csv = await reports.exportData({ ...input, exportType: "STUDENTS" });
    expect(csv.rowCount).toBe(1); expect(csv.content).toContain("Aluno 0"); expect(csv.content).not.toContain("Aluno 1"); expect(csv.content).not.toContain("saude-nao-exportar"); expect(csv.content).not.toContain("nao-exportar");
    await expect(reports.exportData({ ...input, exportType: "ENROLLMENTS" })).rejects.toMatchObject({ statusCode: 403 });
    const peer = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, unitId: f.a.id, role: "TRAINER", userId: (await prisma.user.create({ data: {} })).id } });
    await expect(reports.getOverview({ ...input, assignedStaffId: peer.id })).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceRoleGrant.create({ data: { memberId: f.staff.id, unitId: f.a.id, role: "TRAINER" } });
    await prisma.workspaceRoleGrant.create({ data: { memberId: f.staff.id, unitId: f.b.id, role: "FINANCE" } });
    expect((await reports.getOverview(input)).access).toMatchObject({ financial: true, unitIds: [f.b.id] });
    expect((await reports.getOverview({ ...input, unitId: f.a.id })).access).toMatchObject({ financial: false, unitIds: [f.a.id] });
  });
  it("academia estrangeira, suspensão e alvo estrangeiro são recusados sem exportar dados", async () => {
    const [f, other] = await Promise.all([fixture(), fixture()]);
    const input = { workspaceId: f.workspace.id, actorUserId: f.actor.id, ...f.period };
    await expect(reports.getOverview({ ...input, workspaceId: other.workspace.id })).rejects.toMatchObject({ statusCode: 403 });
    await expect(reports.exportData({ ...input, exportType: "STUDENTS", assignedStaffId: other.staff.id })).rejects.toMatchObject({ statusCode: 404 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(reports.getOverview(input)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    await expect(reports.exportData({ ...input, exportType: "PAYMENTS" })).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });
});
