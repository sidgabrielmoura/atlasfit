import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ userId: "", workspaceId: "" }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: session.userId, role: "USER" } }) }));
import prisma from "@/lib/prisma";
import { WorkspaceContextService, calculateDefaultRoute } from "@/modules/workspaces/application/context-service";
import { assertGymPersonalAffiliation, createPrivatePersonalWorkspace, getPersonalWorkspaceAllowance } from "@/modules/workspaces/application/personal-affiliation";
import { gymPersonalAgenda } from "@/modules/workspaces/application/gym-personal-agenda";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("Disposable database required.");
afterAll(() => prisma.$disconnect());
afterEach(() => vi.restoreAllMocks());
async function fixture() {
  const owner = await prisma.user.create({ data: { name: "Titular sintético" } });
  const user = await prisma.user.create({ data: { name: "Personal afiliado", role: "USER", birthDate: new Date("1990-01-15") } });
  const workspace = await prisma.workspace.create({ data: { name: "Academia sintética", slug: randomUUID(), type: "GYM", ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStaff: 20, maxStudents: 50 } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "TRAINER", unitId: unit.id, roleGrants: { create: { role: "TRAINER", unitId: unit.id } } } });
  return { user, owner, workspace, member, unit };
}
const own = (userId: string) => createPrivatePersonalWorkspace(userId, { name: "Assessoria privada", slug: `private-${randomUUID()}` });
describe("PERSONAL afiliado — isolamento e jornada autônoma", () => {
  it("licença GYM permite USER com TRAINER local sem criar trial ou mudar GlobalRole", async () => {
    const f = await fixture();
    expect((await assertGymPersonalAffiliation(f.workspace.id, f.user.id)).id).toBe(f.member.id);
    expect(calculateDefaultRoute("GYM", ["TRAINER", "STUDENT"])).toBe("/personal/academy");
    expect(await prisma.freeTrial.findUnique({ where: { userId: f.user.id } })).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).role).toBe("USER");
    await prisma.freeTrial.create({ data: { userId: f.user.id, endDate: new Date("2020-01-01"), isActive: false } });
    await assertGymPersonalAffiliation(f.workspace.id, f.user.id);
  });
  it("grant revogado não recupera papel legado; suspensão e licença expirada recusam afiliação", async () => {
    const f = await fixture();
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.member.id }, data: { revokedAt: new Date() } });
    await expect(assertGymPersonalAffiliation(f.workspace.id, f.user.id)).rejects.toMatchObject({ statusCode: 403 });
    const suspended = await fixture(); await prisma.workspace.update({ where: { id: suspended.workspace.id }, data: { isActive: false } });
    await expect(assertGymPersonalAffiliation(suspended.workspace.id, suspended.user.id)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    const expired = await fixture(); await prisma.workspaceSubscription.update({ where: { workspaceId: expired.workspace.id }, data: { endDate: new Date("2020-01-01") } });
    await expect(assertGymPersonalAffiliation(expired.workspace.id, expired.user.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("leitura de quota não provisiona trial; criação concorrente produz uma assessoria e um trial", async () => {
    const f = await fixture(); expect(await getPersonalWorkspaceAllowance(f.user.id)).toMatchObject({ current: 0, limit: 1, firstTrialEligible: true });
    expect(await prisma.freeTrial.count({ where: { userId: f.user.id } })).toBe(0);
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => own(f.user.id)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.workspace.count({ where: { ownerId: f.user.id, type: "PERSONAL" } })).toBe(1);
    expect(await prisma.freeTrial.count({ where: { userId: f.user.id } })).toBe(1);
    const workspace = await prisma.workspace.findFirstOrThrow({ where: { ownerId: f.user.id, type: "PERSONAL" }, include: { members: true } });
    expect(workspace.members.map(member => member.userId)).toEqual([f.user.id]);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).role).toBe("USER");
  });
  it("excluir e recriar não renova trial; trial vencido ou revogado impede nova criação", async () => {
    const f = await fixture(), created = await own(f.user.id);
    const trial = await prisma.freeTrial.findUniqueOrThrow({ where: { userId: f.user.id } });
    await prisma.workspace.delete({ where: { id: created.workspace.id } }); await own(f.user.id);
    expect(await prisma.freeTrial.findUnique({ where: { userId: f.user.id } })).toMatchObject({ id: trial.id, endDate: trial.endDate });
    await prisma.freeTrial.update({ where: { id: trial.id }, data: { isActive: false } });
    await expect(own(f.user.id)).rejects.toMatchObject({ statusCode: 403 });
    expect((await prisma.freeTrial.findUniqueOrThrow({ where: { id: trial.id } })).endDate).toEqual(trial.endDate);
  });
  it("plano pessoal vigente amplia quota; plano vencido não herda licença GYM", async () => {
    const f = await fixture(); await own(f.user.id);
    const plan = await prisma.plan.create({ data: { name: "Dois espaços", price: 1, maxWorkspaces: 2 } });
    await prisma.subscription.create({ data: { userId: f.user.id, planId: plan.id, status: "active", endDate: new Date(Date.now() + 86400000) } });
    const results = await Promise.allSettled(Array.from({ length: 3 }, () => own(f.user.id)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    await prisma.subscription.update({ where: { userId: f.user.id }, data: { endDate: new Date("2020-01-01") } });
    await prisma.freeTrial.update({ where: { userId: f.user.id }, data: { isActive: false } });
    expect(await getPersonalWorkspaceAllowance(f.user.id)).toMatchObject({ entitled: false, limit: 0 });
    await assertGymPersonalAffiliation(f.workspace.id, f.user.id);
  });
  it("agenda pertence ao autor; IDs de outro autor ou tenant não podem ser usados", async () => {
    const a = await fixture(), b = await fixture();
    const task = await gymPersonalAgenda(a.workspace.id, a.user.id, "POST", { title: "Lembrete", time: "09:00", type: "lembrete", date: "2026-10-12" });
    expect("id" in task).toBe(true); const taskId = "id" in task ? task.id : "";
    expect(await gymPersonalAgenda(a.workspace.id, a.user.id, "GET", "2026-10-12")).toMatchObject({ dailyAgenda: [{ id: taskId }] });
    await expect(gymPersonalAgenda(b.workspace.id, b.user.id, "PATCH", { completed: true }, taskId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(gymPersonalAgenda(a.workspace.id, b.user.id, "DELETE", {}, taskId)).rejects.toMatchObject({ statusCode: 403 });
    await gymPersonalAgenda(a.workspace.id, a.user.id, "PATCH", { completed: true }, taskId);
    expect(await prisma.trainerTask.findUnique({ where: { id: taskId } })).toMatchObject({ authorId: a.user.id, completed: true });
    await gymPersonalAgenda(a.workspace.id, a.user.id, "DELETE", {}, taskId);
    expect(await prisma.trainerTask.findUnique({ where: { id: taskId } })).toBeNull();
  });
  it("agenda não reintroduz aulas/financeiro nem aceita ator adulterado ou data civil inválida", async () => {
    const f = await fixture(); const input = { title: "Teste", time: "09:00", type: "lembrete", date: "2026-10-12" };
    for (const data of [{ ...input, type: "aula" }, { ...input, type: "financeiro" }, { ...input, date: "2026-02-30" }, { ...input, authorId: f.owner.id }]) await expect(gymPersonalAgenda(f.workspace.id, f.user.id, "POST", data)).rejects.toThrow();
    expect(await prisma.trainerTask.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("banco recusa autor de outro tenant e mudança de autor em tarefa GYM", async () => {
    const a = await fixture(), b = await fixture();
    await expect(prisma.trainerTask.create({ data: { workspaceId: a.workspace.id, authorId: b.user.id, title: "Autor estrangeiro", time: "09:00", type: "lembrete" } })).rejects.toThrow();
    const task = await prisma.trainerTask.create({ data: { workspaceId: a.workspace.id, authorId: a.user.id, title: "Autor imutável", time: "09:00", type: "lembrete" } });
    await expect(prisma.trainerTask.update({ where: { id: task.id }, data: { authorId: a.owner.id } })).rejects.toThrow();
    expect(await prisma.trainerTask.findUnique({ where: { id: task.id } })).toMatchObject({ authorId: a.user.id });
  });
  it("agenda de aluno revalida atribuição atual e omite tarefa após transferência", async () => {
    const f = await fixture(); const student = await prisma.user.create({ data: { name: "Aluno sintético" } });
    const member = await prisma.workspaceMember.create({ data: { userId: student.id, workspaceId: f.workspace.id, role: "STUDENT", unitId: f.unit.id, assignedStaffId: f.member.id, studentProfile: { create: {} } } });
    const task = await gymPersonalAgenda(f.workspace.id, f.user.id, "POST", { title: "Avaliação", time: "10:00", type: "avaliação", date: "2026-10-12", studentId: student.id });
    await prisma.workspaceMember.update({ where: { id: member.id }, data: { assignedStaffId: null } });
    expect(await gymPersonalAgenda(f.workspace.id, f.user.id, "GET", "2026-10-12")).toMatchObject({ dailyAgenda: [] });
    await expect(gymPersonalAgenda(f.workspace.id, f.user.id, "PATCH", { completed: true }, "id" in task ? task.id : "")).rejects.toMatchObject({ statusCode: 403 });
  });
  it("contexto GYM bloqueia APIs pessoais; expiração PERSONAL retorna 402 e academia continua acessível", async () => {
    const f = await fixture(), created = await own(f.user.id); session.userId = f.user.id; session.workspaceId = f.workspace.id;
    vi.spyOn(WorkspaceContextService, "getActiveWorkspaceIdFromCookie").mockImplementation(async () => session.workspaceId);
    expect((await personalCommercialContextResponse())?.status).toBe(403);
    session.workspaceId = created.workspace.id; expect(await personalCommercialContextResponse()).toBeNull();
    await prisma.freeTrial.update({ where: { userId: f.user.id }, data: { isActive: false } });
    expect((await personalCommercialContextResponse())?.status).toBe(402);
    expect(await personalCommercialContextResponse({ allowExpired: true })).toBeNull();
    session.workspaceId = f.workspace.id; await assertGymPersonalAffiliation(f.workspace.id, f.user.id);
    const foreign = await fixture(); session.workspaceId = (await own(foreign.user.id)).workspace.id;
    expect((await personalCommercialContextResponse())?.status).toBe(403);
  });
});
