import { beforeEach, describe, expect, it, vi } from "vitest";
const { db } = vi.hoisted(() => {
  const model = (...names: string[]) => Object.fromEntries(names.map(name => [name, vi.fn()]));
  const db: any = {
    workspace: model("findUnique"), user: model("findUnique"),
    workspaceMember: model("findUnique", "findFirst", "findMany", "count", "upsert", "update", "updateMany"),
    workspaceInvitation: model("findUnique", "count", "create", "updateMany"),
    workspaceRoleGrant: model("findFirst", "create", "update", "updateMany"),
    gymUnit: model("findFirst", "findMany"), gymStaffProfile: model("upsert"), auditLog: model("create"), $transaction: vi.fn(),
  }; return { db };
});
vi.mock("@/lib/prisma", () => ({ default: db }));
import { staffService, StaffService } from "../application/staff-service";
describe("GYM-030: equipe e convites com autoridade persistida", () => {
  const workspaceId = "ws-1", actor = "owner-1";
  const staff = (id = "trainer-1") => ({ id, userId: `user-${id}`, workspaceId, isActive: true, role: "TRAINER", roleGrants: [], unitId: null });
  const invitation = () => ({ id: "invite-1", workspaceId, unitId: null, email: "joao@example.com", role: "TRAINER", invitedBy: actor, status: "PENDING", expiresAt: new Date(Date.now() + 3600000), workspace: { id: workspaceId, name: "Academia" }, unit: null });
  beforeEach(() => {
    vi.resetAllMocks(); db.$transaction.mockImplementation(async (cb: any) => cb(db));
    db.workspace.findUnique.mockResolvedValue({ id: workspaceId, type: "GYM", isActive: true, ownerId: actor, subscription: { status: "ACTIVE", endDate: null, maxStaff: 5 } });
    db.user.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id, role: "USER", email: "joao@example.com" }));
    db.workspaceMember.findUnique.mockImplementation(async ({ where }: any) => where.userId_workspaceId?.userId === actor ? { id: "member-owner", role: "OWNER", isActive: true, unitId: null, roleGrants: [] } : null);
    db.workspaceMember.findFirst.mockResolvedValue(null); db.workspaceMember.findMany.mockResolvedValue([]);
    db.workspaceMember.count.mockResolvedValue(1); db.workspaceInvitation.count.mockResolvedValue(0);
    db.workspaceInvitation.updateMany.mockResolvedValue({ count: 1 });
    db.workspaceInvitation.create.mockImplementation(async ({ data }: any) => ({ id: "invite-1", ...data }));
    db.workspaceRoleGrant.findFirst.mockResolvedValue(null); db.workspaceMember.upsert.mockResolvedValue({ id: "member-joao" });
    db.workspaceMember.updateMany.mockResolvedValue({ count: 2 }); db.gymUnit.findMany.mockResolvedValue([]);
  });
  it.each(["STUDENT", "OWNER"] as const)("recusa convite de %s", async role => {
    await expect(staffService.inviteStaffMember({ workspaceId, invitedById: actor, email: "joao@example.com", role })).rejects.toMatchObject({ statusCode: 403, code: "INVALID_ROLE" });
    expect(db.workspaceInvitation.create).not.toHaveBeenCalled();
  });
  it("contabiliza equipe e convites pendentes na quota", async () => {
    db.workspaceMember.count.mockResolvedValue(4); db.workspaceInvitation.count.mockResolvedValue(1);
    await expect(staffService.inviteStaffMember({ workspaceId, invitedById: actor, email: "joao@example.com", role: "TRAINER" })).rejects.toMatchObject({ code: "STAFF_LIMIT_REACHED" });
    expect(db.workspaceInvitation.create).not.toHaveBeenCalled();
  });
  it("armazena hash do token e normaliza destinatário", async () => {
    const result = await staffService.inviteStaffMember({ workspaceId, invitedById: actor, email: "Joao@Example.com", role: "TRAINER" });
    expect(result.rawToken).toMatch(/^[a-f0-9]{64}$/); expect(result.invitation).toMatchObject({ email: "joao@example.com", tokenHash: StaffService.hashToken(result.rawToken) });
    expect(result.invitation.tokenHash).not.toBe(result.rawToken); expect(result.inviteUrl).toContain(result.rawToken);
    expect(db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "GYM_STAFF_INVITED:invite-1", entityId: workspaceId }) });
  });
  it("consulta pública mascara e-mail e revalida remetente", async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue({ ...invitation(), tokenHash: "secret" });
    const result = await staffService.getInvitationByToken("a".repeat(64));
    expect(result.email).toBe("jo***@example.com"); expect(result).not.toHaveProperty("tokenHash");
    expect(db.workspaceMember.findUnique).toHaveBeenCalled(); expect(db.workspaceInvitation.updateMany).not.toHaveBeenCalled();
  });
  it("consulta de convite expirado não modifica registros", async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue({ ...invitation(), expiresAt: new Date(0) });
    await expect(staffService.getInvitationByToken("a".repeat(64))).rejects.toMatchObject({ statusCode: 410, code: "INVITATION_EXPIRED" });
    expect(db.workspaceInvitation.updateMany).not.toHaveBeenCalled();
  });
  it("aceite reivindica convite e cria vínculo e permissão", async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue(invitation());
    expect(await staffService.acceptInvitation("a".repeat(64), "user-joao")).toMatchObject({ success: true, memberId: "member-joao", role: "TRAINER" });
    expect(db.workspaceInvitation.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ id: "invite-1", status: "PENDING" }), data: expect.objectContaining({ status: "ACCEPTED" }) });
    expect(db.workspaceRoleGrant.create).toHaveBeenCalledWith({ data: expect.objectContaining({ memberId: "member-joao", role: "TRAINER", grantedBy: actor }) });
  });
  it("aceite concorrente não cria membro após perder reivindicação", async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue(invitation()); db.workspaceInvitation.updateMany.mockResolvedValue({ count: 0 });
    await expect(staffService.acceptInvitation("a".repeat(64), "user-joao")).rejects.toMatchObject({ code: "INVITATION_NOT_PENDING" });
    expect(db.workspaceMember.upsert).not.toHaveBeenCalled();
  });
  it("protege titular registrado antes do desligamento", async () => {
    db.workspaceMember.findFirst.mockResolvedValue({ ...staff(), userId: actor, role: "OWNER" });
    await expect(staffService.offboardStaffMember({ workspaceId, memberId: "trainer-1", actorUserId: actor, reason: "Saída" })).rejects.toMatchObject({ code: "CANNOT_REMOVE_LAST_OWNER" });
    expect(db.workspaceMember.update).not.toHaveBeenCalled();
  });
  it("desliga com repasse e preserva permissões estudantis", async () => {
    db.workspaceMember.findFirst.mockResolvedValueOnce(staff()).mockResolvedValueOnce(staff("trainer-2"));
    db.workspaceMember.findMany.mockResolvedValue([{ id: "s1", unitId: null }, { id: "s2", unitId: null }]);
    expect(await staffService.offboardStaffMember({ workspaceId, memberId: "trainer-1", actorUserId: actor, reason: "Saída", replacementStaffMemberId: "trainer-2" })).toMatchObject({ success: true, reassignedStudentsCount: 2, remainsStudent: false });
    expect(db.workspaceMember.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["s1", "s2"] } }, data: { assignedStaffId: "trainer-2" } });
    expect(db.workspaceRoleGrant.updateMany).toHaveBeenCalledWith({ where: { memberId: "trainer-1", role: { not: "STUDENT" }, revokedAt: null }, data: expect.objectContaining({ revokedBy: actor }) });
    expect(db.workspaceMember.update).toHaveBeenCalledWith({ where: { id: "trainer-1" }, data: { isActive: false, role: "TRAINER" } });
  });
  it("repasse altera somente alunos da carteira de origem", async () => {
    db.workspaceMember.findFirst.mockResolvedValueOnce(staff()).mockResolvedValueOnce(staff("trainer-2")); db.workspaceMember.findMany.mockResolvedValue([{ id: "s1", unitId: null }, { id: "s2", unitId: null }]);
    expect(await staffService.reassignStudents({ workspaceId, actorUserId: actor, fromStaffMemberId: "trainer-1", toStaffMemberId: "trainer-2", studentMemberIds: ["s1", "s2"] })).toMatchObject({ count: 2 });
    expect(db.workspaceMember.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["s1", "s2"] }, workspaceId, assignedStaffId: "trainer-1" }, data: { assignedStaffId: "trainer-2" } });
  });
  it("recusa aluno alheio sem alterar atribuições", async () => {
    db.workspaceMember.findFirst.mockResolvedValue(staff()); db.workspaceMember.findMany.mockResolvedValue([{ id: "s1", unitId: null }]);
    await expect(staffService.reassignStudents({ workspaceId, actorUserId: actor, fromStaffMemberId: "trainer-1", toStaffMemberId: "trainer-2", studentMemberIds: ["s1", "foreign"] })).rejects.toMatchObject({ code: "STUDENT_NOT_FOUND" });
    expect(db.workspaceMember.updateMany).not.toHaveBeenCalled();
  });
  it("recusa ator sem vínculo", async () => {
    await expect(staffService.inviteStaffMember({ workspaceId, invitedById: "outsider", email: "joao@example.com", role: "TRAINER" })).rejects.toMatchObject({ code: "NOT_A_MEMBER" });
    expect(db.workspaceInvitation.create).not.toHaveBeenCalled();
  });
});
