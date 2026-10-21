import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getGymReceptionSnapshot } from "@/modules/workspaces/application/gym-reception-query";
import { getGymUnitAccess } from "@/modules/workspaces/application/gym-unit-access";
import { resolveAccessRoles, resolveNavigationRoles } from "@/modules/workspaces/domain/access-roles";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });

async function fixture() {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Recepção sintética", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } } } });
  const a = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "A" } });
  const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "B" } });
  const operator = await prisma.user.create({ data: {} });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.id, role: "MANAGER", unitId: a.id } });
  const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "RECEPTIONIST", unitId: a.id, grantedBy: owner.id } });
  const addStudent = async (unitId: string, name: string) => {
    const user = await prisma.user.create({ data: { name, password: "synthetic-secret", cpfCnpj: "synthetic-sensitive-cpf" } });
    const student = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, unitId, role: "STUDENT", billingPrice: 150, lastActive: new Date("2000-01-01"), studentProfile: { create: { registrationNumber: randomUUID() } } } });
    return { user, student };
  };
  const local = await addStudent(a.id, "Aluno local"); const other = await addStudent(b.id, "Aluno de outra unidade");
  return { owner, workspace, a, b, operator, member, grant, local, other, addStudent };
}

describe("Recepção — escopo de unidade e fatos apresentados", () => {
  it("grant local anuncia a jornada sem conceder acesso global ou a outra unidade", async () => {
    const f = await fixture();
    expect(resolveNavigationRoles("MANAGER", [f.grant], [f.a.id, f.b.id])).toEqual(["RECEPTIONIST"]);
    expect(resolveAccessRoles("MANAGER", [f.grant])).toEqual([]);
    const snapshot = await getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id });
    expect(snapshot.units).toEqual([{ id: f.a.id, name: "A", canReadFinance: true }]);
    expect(snapshot.students.map(item => item.id)).toEqual([f.local.student.id]);
    expect(snapshot.students[0]).toMatchObject({ status: "NOT_ENROLLED", financialStatus: "NONE", planName: "Sem matrícula" });
    expect(snapshot.students[0]).not.toHaveProperty("lastAccess");
    expect(snapshot.students[0]).not.toHaveProperty("cpf"); expect(snapshot.students[0]).not.toHaveProperty("password");
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id, unitId: f.b.id })).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceRoleGrant.update({ where: { id: f.grant.id }, data: { revokedAt: new Date() } });
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id })).rejects.toMatchObject({ statusCode: 403 });
    expect(resolveNavigationRoles("MANAGER", [{ ...f.grant, revokedAt: new Date() }], [f.a.id])).toEqual([]);
  });
  it("titular mantém todas as unidades; legado vinculado não atravessa unidade e aluno não é operador", async () => {
    const f = await fixture();
    const ownerScope = await prisma.$transaction(tx => getGymUnitAccess(tx, f.workspace.id, f.owner.id, "students.read"));
    expect(ownerScope.units.map(item => item.id)).toEqual([f.a.id, f.b.id]);
    const legacy = await prisma.user.create({ data: {} });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: legacy.id, role: "RECEPTIONIST", unitId: f.b.id } });
    expect((await getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: legacy.id })).selectedUnitId).toBe(f.b.id);
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: legacy.id, unitId: f.a.id })).rejects.toMatchObject({ statusCode: 403 });
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.local.user.id })).rejects.toMatchObject({ statusCode: 403 });
    await prisma.gymUnit.update({ where: { id: f.a.id }, data: { isActive: false } });
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id })).rejects.toMatchObject({ statusCode: 403 });
    expect(resolveNavigationRoles("MANAGER", [f.grant], [f.b.id])).toEqual([]);
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.owner.id })).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });
  it("matrícula e saldo vêm do contrato/fatura; consulta não gera cobrança", async () => {
    const f = await fixture();
    const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Plano real" } });
    const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Condições contratadas", priceInCents: BigInt(10000), durationDays: 90, termsText: "Condições sintéticas" } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.local.student.id, planVersionId: version.id, unitId: f.a.id, priceInCents: version.priceInCents, status: "PAUSED" } });
    const invoice = await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.local.student.id, studentUserId: f.local.user.id, enrollmentId: enrollment.id, invoiceNumber: randomUUID(), title: "Mensalidade", dueDate: new Date(Date.now() - 86400000), subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), paidAmountInCents: BigInt(5000), balanceRemainingInCents: BigInt(5000), payerName: "Aluno local", createdByUserId: f.owner.id } });
    const read = () => getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id });
    expect((await read()).students[0]).toMatchObject({ status: "PAUSED", planName: version.name, financialStatus: "OVERDUE" });
    await prisma.gymInvoice.update({ where: { id: invoice.id }, data: { dueDate: new Date(Date.now() + 86400000) } });
    expect((await read()).students[0].financialStatus).toBe("OPEN");
    await prisma.gymInvoice.update({ where: { id: invoice.id }, data: { balanceRemainingInCents: BigInt(0), paidAmountInCents: BigInt(10000), status: "PAID" } });
    expect((await read()).students[0].financialStatus).toBe("SETTLED");
    await prisma.gymInvoice.update({ where: { id: invoice.id }, data: { status: "CANCELLED" } });
    expect((await read()).students[0].financialStatus).toBe("NONE");
    expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
  it("paginação é limitada e estável; contexto estrangeiro e parâmetros adulterados são recusados", async () => {
    const f = await fixture();
    for (let index = 0; index < 30; index++) await f.addStudent(f.a.id, `Aluno ${index}`);
    const first = await getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id });
    const second = await getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id, page: 2 });
    expect(first).toMatchObject({ total: 31, page: 1, hasNext: true }); expect(first.students).toHaveLength(30);
    expect(second).toMatchObject({ total: 31, page: 2, hasNext: false }); expect(second.students).toHaveLength(1);
    expect(new Set([...first.students, ...second.students].map(item => item.id)).size).toBe(31);
    const outsider = await prisma.user.create({ data: {} });
    await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: outsider.id })).rejects.toMatchObject({ statusCode: 403 });
    for (const page of [0, 1.5, 10001, NaN]) await expect(getGymReceptionSnapshot({ workspaceId: f.workspace.id, actorUserId: f.operator.id, page })).rejects.toMatchObject({ statusCode: 400 });
  });
});
