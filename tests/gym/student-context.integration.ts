import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getGymStudentFinance } from "@/modules/workspaces/application/gym-student-finance";
import { manualFinanceService } from "@/modules/workspaces/application/manual-finance-service";
import { hasStudentMembership, studentMembershipWhere } from "@/modules/workspaces/domain/student-membership";
import { workoutActions, workoutStore } from "@/stores/workout.store";
import { workspaceActions } from "@/stores/workspace.store";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { workspaceActions.clear(); await prisma.$disconnect(); });

describe("Contexto estudantil — banco e isolamento da execução", () => {
  it("histórico STUDENT revogado é autoritativo, inclusive com perfil e papel legado", async () => {
    const owner = await prisma.user.create({ data: {} }); const user = await prisma.user.create({ data: {} });
    const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", subscription: { create: { status: "ACTIVE" } }, name: "Academia revogação", slug: randomUUID() } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", studentProfile: { create: {} } } });
    expect(await prisma.workspaceMember.count({ where: { id: member.id, ...studentMembershipWhere } })).toBe(1);
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "STUDENT", revokedAt: new Date(), grantedBy: owner.id } });
    expect(await prisma.workspaceMember.count({ where: { id: member.id, ...studentMembershipWhere } })).toBe(0);
    await expect(getGymStudentFinance(workspace.id, member.id, user.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(hasStudentMembership({ role: "STUDENT", studentProfile: {}, roleGrants: [{ role: "STUDENT", revokedAt: new Date() }] })).toBe(false);
    expect(hasStudentMembership({ role: "STUDENT", studentProfile: {}, roleGrants: [{ role: "TRAINER", revokedAt: new Date() }] })).toBe(false);
    expect(hasStudentMembership({ role: "STUDENT", unitId: "unit-A", studentProfile: {}, roleGrants: [{ role: "STUDENT", unitId: "unit-B", revokedAt: null }] })).toBe(false);
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: null } });
    expect(await prisma.workspaceMember.count({ where: { id: member.id, ...studentMembershipWhere } })).toBe(1);
    await expect(getGymStudentFinance(workspace.id, member.id, user.id)).resolves.toMatchObject({ kind: "GYM_MANUAL" });
  });
  it("extrato mantém saldos e recebimentos na mesma fotografia durante uma baixa concorrente", async () => {
    const owner = await prisma.user.create({ data: {} }); const user = await prisma.user.create({ data: {} });
    const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", subscription: { create: { status: "ACTIVE" } }, name: "Academia fotografia", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } } } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT" } });
    const account = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, name: "Conta interna", accountType: "BANK_ACCOUNT" } });
    const invoice = await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, studentUserId: user.id, invoiceNumber: randomUUID(), title: "Obrigação concorrente", dueDate: new Date(), subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), payerName: "Aluno sintético", createdByUserId: owner.id } });
    const payment = manualFinanceService.recordPayment({ workspaceId: workspace.id, actorUserId: owner.id, financialAccountId: account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 3000, allocations: [{ invoiceId: invoice.id, amountInCents: 3000 }], idempotencyKey: randomUUID() });
    const [, statements] = await Promise.all([payment, Promise.all(Array.from({ length: 8 }, () => getGymStudentFinance(workspace.id, member.id, user.id)))]);
    for (const statement of statements) {
      const received = BigInt(statement.totals.receivedInCents); const remaining = BigInt(statement.totals.outstandingInCents);
      expect(received + remaining).toBe(BigInt(10000)); expect(BigInt(statement.invoices[0].balanceInCents)).toBe(remaining);
      expect(statement.invoices[0].receipts.reduce((sum, receipt) => sum + BigInt(receipt.amountInCents), BigInt(0))).toBe(received);
    }
    expect((await getGymStudentFinance(workspace.id, member.id, user.id)).totals).toMatchObject({ receivedInCents: "3000", outstandingInCents: "7000" });
  });
  it("reload preserva execução do mesmo workspace e troca ou logout limpa cargas e timers", () => {
    workspaceActions.clear(); workoutStore.workspaceId = "personal-A"; workoutStore.totalTimer = 55; workoutStore.allWorkoutLoads = { exercise: ["25"] };
    const personal = { id: "personal-A", name: "Assessoria", slug: "a", type: "PERSONAL" as const, logo: "", primaryColor: "#123456", plan: "test" };
    workspaceActions.setActiveWorkspace(personal); expect(workoutStore.totalTimer).toBe(55); expect(workoutStore.allWorkoutLoads).toEqual({ exercise: ["25"] });
    workspaceActions.setActiveWorkspace({ ...personal, id: "gym-B", type: "GYM" }); expect(workoutStore.totalTimer).toBe(0); expect(workoutStore.allWorkoutLoads).toEqual({}); expect(workoutStore.workspaceId).toBe("gym-B");
    workoutStore.allWorkoutReps = { exercise: ["10"] }; workoutStore.restTimer = 30; workspaceActions.clear(); expect(workoutStore.workspaceId).toBeNull(); expect(workoutStore.allWorkoutReps).toEqual({}); expect(workoutStore.restTimer).toBe(0);
  });
});
