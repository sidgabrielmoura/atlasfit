import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { listGymStaff, getGymStaffMember, listGymInvitations, getGymStaffPageData } from "@/modules/workspaces/application/gym-staff-query";
import { inviteGymStaff, acceptGymStaffInvitation, revokeGymInvitation, updateGymStaff } from "@/modules/workspaces/application/staff-mutations";
import { offboardGymStaff } from "@/modules/workspaces/application/team-lifecycle";
import { staffService } from "@/modules/workspaces/application/staff-service";
import { gymStaffListSchema } from "@/modules/workspaces/domain/gym-staff-contract";
import { gymInvitationReturn } from "@/lib/auth/invitation-return";
import { EntitlementsService } from "@/modules/workspaces/application/entitlements-service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function account(name = "Conta sintética") { return prisma.user.create({ data: { name, email: `${randomUUID()}@example.invalid`, password: "synthetic-not-a-credential" } }); }
async function fixture() {
  const owner = await account();
  const workspace = await prisma.workspace.create({ data: { type: "GYM", name: "Equipe sintética", slug: `staff-${randomUUID()}`, ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStaff: 50 } } } });
  const a = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade A" } });
  const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade B" } });
  const manager = await account();
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: manager.id, role: "MANAGER", unitId: a.id, roleGrants: { create: { role: "MANAGER", unitId: a.id } } } });
  return { owner, workspace, a, b, manager, member };
}

describe("GYM PostgreSQL — equipe e convites por unidade", () => {
  it("consulta e SSR compartilham escopo atual, DTO mínimo, paginação e papéis acumulados sem expor outra unidade", async () => {
    const f = await fixture(); const other = await fixture();
    const visible = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account("Profissional visível")).id, role: "TRAINER", unitId: f.a.id } });
    const hidden = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account("Profissional protegido")).id, role: "TRAINER", unitId: f.b.id } });
    const multiple = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "TRAINER", unitId: f.a.id, roleGrants: { create: [{ role: "TRAINER", unitId: f.a.id }, { role: "TRAINER", unitId: f.b.id }] } } });
    const studentTrainer = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "STUDENT", unitId: f.a.id, studentProfile: { create: {} }, roleGrants: { create: [{ role: "STUDENT", unitId: f.a.id }, { role: "TRAINER", unitId: f.a.id }] } } });
    const revoked = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "TRAINER", unitId: f.a.id, roleGrants: { create: { role: "TRAINER", unitId: f.a.id, revokedAt: new Date() } } } });
    for (const unitId of [f.a.id, f.b.id]) await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "STUDENT", unitId, assignedStaffId: visible.id, studentProfile: { create: {} } } });
    const input = { workspaceId: f.workspace.id, actorUserId: f.manager.id };
    const list = await listGymStaff(input); gymStaffListSchema.parse(list);
    expect(list.data.map(row => row.id)).toEqual(expect.arrayContaining([visible.id, multiple.id, studentTrainer.id]));
    expect(list.data.map(row => row.id)).not.toContain(hidden.id); expect(list.data.map(row => row.id)).not.toContain(revoked.id);
    expect(list.data.find(row => row.id === visible.id)?._count.assignedStudents).toBe(1);
    expect(list.data.find(row => row.id === multiple.id)).toMatchObject({ canManage: false, roleGrants: [{ role: "TRAINER", unitId: f.a.id }] });
    expect(JSON.stringify(list)).not.toContain('"password"'); expect(JSON.stringify(list)).not.toContain('"tokenHash"');
    await expect(getGymStaffMember(f.workspace.id, hidden.id, f.manager.id)).rejects.toMatchObject({ statusCode: 404 });
    const detail = await getGymStaffMember(f.workspace.id, visible.id, f.manager.id); expect(detail.assignedStudents).toHaveLength(1);
    expect((await getGymStaffPageData(f.workspace.id, f.manager.id))).toMatchObject({ canManageGlobal: false, units: [{ id: f.a.id, name: f.a.name }] });
    await expect(listGymStaff({ ...input, unitId: f.b.id })).rejects.toMatchObject({ statusCode: 403 });
    await expect(listGymStaff({ ...input, actorUserId: other.owner.id })).rejects.toMatchObject({ statusCode: 403 });
    const page = await listGymStaff({ ...input, limit: 1 }); expect(page.data).toHaveLength(1); expect(page.total).toBe(list.total);
    await expect(listGymStaff({ ...input, page: -1 })).rejects.toMatchObject({ statusCode: 400 });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.member.id }, data: { revokedAt: new Date() } });
    await expect(listGymStaff(input)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(listGymStaff({ ...input, actorUserId: f.owner.id })).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });

  it("convite é do destinatário, respeita unidade, disputa aceite/revogação atomicamente e consulta expirada não grava estado", async () => {
    const f = await fixture(); const recipient = await account(); const wrong = await account();
    const invited = await inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.manager.id, unitId: f.a.id, email: recipient.email || "", role: "TRAINER", cref: "CREF-SINTETICO", jobTitle: "Treinador" });
    const preview = await staffService.getInvitationByToken(invited.rawToken); expect(preview.email).not.toBe(recipient.email);
    expect(gymInvitationReturn(invited.inviteUrl)).toBe(invited.inviteUrl);
    for (const destination of ["https://example.invalid", "//example.invalid", "/personal/finance", invited.inviteUrl + "&next=https://example.invalid"]) expect(gymInvitationReturn(destination)).toBeNull();
    await expect(acceptGymStaffInvitation(invited.rawToken, wrong.id)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    const attempts = await Promise.allSettled([acceptGymStaffInvitation(invited.rawToken, recipient.id), acceptGymStaffInvitation(invited.rawToken, recipient.id)]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const accepted = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { workspaceId: f.workspace.id, userId: recipient.id } }, include: { staffProfile: true } });
    expect(accepted).toMatchObject({ unitId: f.a.id, staffProfile: { cref: "CREF-SINTETICO", jobTitle: "Treinador" } });
    const b = await inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.owner.id, unitId: f.b.id, email: (await account()).email || "", role: "TRAINER" });
    expect((await listGymInvitations(f.workspace.id, f.manager.id)).data.map(row => row.id)).not.toContain(b.invitation.id);
    await expect(revokeGymInvitation(b.invitation.id, f.workspace.id, f.manager.id)).rejects.toMatchObject({ statusCode: 403 });
    const raceRecipient = await account();
    const race = await inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.manager.id, unitId: f.a.id, email: raceRecipient.email || "", role: "TRAINER" });
    const competed = await Promise.allSettled([acceptGymStaffInvitation(race.rawToken, raceRecipient.id), revokeGymInvitation(race.invitation.id, f.workspace.id, f.manager.id)]);
    expect(competed.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const state = await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: race.invitation.id } });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, userId: raceRecipient.id } })).toBe(state.status === "ACCEPTED" ? 1 : 0);
    await prisma.workspaceInvitation.update({ where: { id: b.invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(staffService.getInvitationByToken(b.rawToken)).rejects.toMatchObject({ statusCode: 410 });
    expect((await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: b.invitation.id } })).status).toBe("PENDING");
    expect((await listGymInvitations(f.workspace.id, f.owner.id)).data.map(row => row.id)).not.toContain(b.invitation.id);
  });

  it("desligamento não revoga grants de unidade alheia, não amplia elegibilidade legada nem restaura aluno revogado; preserva PERSONAL", async () => {
    const f = await fixture(); const user = await account();
    const target = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: user.id, role: "TRAINER", unitId: f.a.id, studentProfile: { create: {} }, roleGrants: { create: [{ role: "TRAINER", unitId: f.a.id }, { role: "TRAINER", unitId: f.b.id }, { role: "STUDENT", unitId: f.a.id, revokedAt: new Date() }] } } });
    const personal = await prisma.workspace.create({ data: { ownerId: user.id, type: "PERSONAL", name: "Privado sintético", slug: `private-${randomUUID()}`, members: { create: { userId: user.id, role: "OWNER" } } } });
    const input = { workspaceId: f.workspace.id, memberId: target.id, actorUserId: f.manager.id, reason: "Encerramento sintético" };
    await expect(offboardGymStaff(input)).rejects.toMatchObject({ statusCode: 403 });
    const invalidUpdate = { ...input, cref: "ALTERADO" };
    await expect(updateGymStaff(invalidUpdate)).rejects.toMatchObject({ statusCode: 400 });
    await expect(updateGymStaff({ workspaceId: f.workspace.id, memberId: target.id, actorUserId: f.manager.id, cref: "ALTERADO" })).rejects.toMatchObject({ statusCode: 403 });
    const learner = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "STUDENT", unitId: f.b.id, assignedStaffId: target.id, studentProfile: { create: {} } } });
    const legacy = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "TRAINER", unitId: f.a.id } });
    await expect(offboardGymStaff({ ...input, actorUserId: f.owner.id, replacementStaffMemberId: legacy.id })).rejects.toMatchObject({ code: "INVALID_REPLACEMENT" });
    expect((await prisma.workspaceMember.findUniqueOrThrow({ where: { id: learner.id } })).assignedStaffId).toBe(target.id);
    expect((await prisma.workspaceMember.findUniqueOrThrow({ where: { id: target.id } })).isActive).toBe(true);
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: target.id, role: "TRAINER", revokedAt: null } })).toBe(2);
    const ownerMember = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { workspaceId: f.workspace.id, userId: f.owner.id } } });
    await expect(offboardGymStaff({ ...input, memberId: ownerMember.id, actorUserId: f.owner.id })).rejects.toMatchObject({ code: "CANNOT_REMOVE_LAST_OWNER" });
    expect(await offboardGymStaff({ ...input, actorUserId: f.owner.id })).toMatchObject({ remainsStudent: false, reassignedStudentsCount: 1 });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: target.id, role: "STUDENT", revokedAt: null } })).toBe(0);
    expect((await prisma.workspaceMember.findUniqueOrThrow({ where: { id: target.id } })).isActive).toBe(false);
    expect(await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId: personal.id, userId: user.id } } })).toMatchObject({ isActive: true, role: "OWNER" });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ password: "synthetic-not-a-credential" });
    const combined = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await account()).id, role: "TRAINER", unitId: f.a.id, studentProfile: { create: {} }, roleGrants: { create: [{ role: "TRAINER", unitId: f.a.id }, { role: "STUDENT", unitId: f.a.id }] } } });
    expect(await offboardGymStaff({ ...input, memberId: combined.id, actorUserId: f.owner.id })).toMatchObject({ remainsStudent: true });
    expect(await prisma.workspaceMember.findUnique({ where: { id: combined.id } })).toMatchObject({ isActive: true, role: "STUDENT" });
    expect((await EntitlementsService.resolveEntitlements(f.workspace.id)).usage.staffCount).toBe(3);
  });
});
