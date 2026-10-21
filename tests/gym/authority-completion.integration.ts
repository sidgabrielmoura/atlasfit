import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { assertActorAuthority } from "@/modules/workspaces/application/actor-authority";
import { assertGymOperationalWorkspace } from "@/modules/workspaces/application/gym-license";
import { getGymUnitAccess } from "@/modules/workspaces/application/gym-unit-access";
import { createGymUnit, updateGymUnit } from "@/modules/workspaces/application/gym-unit-commands";
import { getGymStudentSelectors, getGymOwnershipCandidates } from "@/modules/workspaces/application/gym-selectors";
import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff } from "@/modules/workspaces/application/staff-mutations";
import { mutateGymRole, transferWorkspaceOwner, offboardGymStaff } from "@/modules/workspaces/application/team-lifecycle";
import { backfillService } from "@/modules/workspaces/application/backfill-service";
import { GymService } from "@/modules/workspaces/application/gym-service";
import { gymPlanService } from "@/modules/workspaces/application/plan-service";
import { gymAssessmentService } from "@/modules/workspaces/application/gym-assessment-service";
import { reserveGymStorage, finalizeGymStorage, gymStorageUsage } from "@/modules/workspaces/application/gym-storage";
import { reconcileGymStorage, deleteGymStorageOrphan } from "@/modules/workspaces/application/gym-storage-reconciliation";
import { attachGymProgressPhoto } from "@/modules/workspaces/application/gym-progress-photo";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { withAuditIdentity } from "@/lib/audit-context";
import { storageService } from "@/lib/storage.service";
import { updateWorkspaceAdministration } from "@/modules/workspaces/application/workspace-administration";
import { SuperAdminGymService } from "@/modules/workspaces/application/superadmin-service";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";
import { assertChatConversation } from "@/modules/workspaces/application/chat-authority";
import { checkStorageQuota } from "@/lib/storage-quota.service";
import { getGymChatContacts } from "@/modules/workspaces/application/gym-chat-contacts";
import { recordGymProgress, removeGymEvolutionRecord } from "@/modules/workspaces/application/gym-progress-commands";
import { getGymStudentFinance } from "@/modules/workspaces/application/gym-student-finance";
import { manualSubscriptionService } from "@/modules/workspaces/application/manual-subscription-service";
import { processLocalEnrollmentClosures } from "@/modules/workspaces/application/enrollment-closure-job";
import { updateGymStudent } from "@/modules/workspaces/application/gym-student-commands";
import type { WorkspaceContext } from "@/modules/workspaces/domain/types";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function user() { return prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, birthDate: new Date("1990-01-15T00:00:00Z") } }); }
async function fixture() {
  const owner = await user(); const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "Sete tópicos sintéticos", slug: randomUUID(), subscription: { create: { status: "ACTIVE", maxStaff: 50, maxStudents: 50, maxUnits: 3, storageLimitMb: 1 } } } });
  const ownerMember = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  const a = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "A" } });
  const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "B" } });
  const learner = await user();
  const student = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: learner.id, role: "STUDENT", unitId: a.id, studentProfile: { create: {} } } });
  return { owner, admin, workspace, ownerMember, a, b, learner, student };
}
const authority = (workspaceId: string, actor: string, unitId?: string) => serializableTransaction(tx => assertActorAuthority(tx, workspaceId, actor, "workspace.manage", unitId));

describe("GYM PostgreSQL — conclusão dos sete tópicos de autoridade", () => {
  it("edição estudantil não desativa titular legado nem equipe com grant em outra unidade", async () => {
    const f = await fixture();
    const context: WorkspaceContext = { userId: f.owner.id, userEmail: null, userRole: "USER", workspaceId: f.workspace.id, workspaceName: f.workspace.name, workspaceSlug: f.workspace.slug, workspaceType: "GYM", memberId: f.ownerMember.id, memberRole: "OWNER", roles: ["OWNER"], capabilities: new Set(), hasCapability: () => true, isOwner: true, isActive: true, isSuperAdmin: false };
    await prisma.workspaceMember.update({ where: { id: f.ownerMember.id }, data: { role: "STUDENT", unitId: f.a.id, studentProfile: { create: {} } } });
    await expect(updateGymStudent({ workspaceId: f.workspace.id, memberId: f.ownerMember.id, actorContext: context, isActive: false })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await prisma.workspaceRoleGrant.create({ data: { memberId: f.student.id, role: "TRAINER", unitId: f.b.id } });
    await expect(updateGymStudent({ workspaceId: f.workspace.id, memberId: f.student.id, actorContext: context, isActive: false })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await prisma.workspaceMember.count({ where: { id: { in: [f.ownerMember.id, f.student.id] }, isActive: true } })).toBe(2);
  });
  it("chat, histórico e realtime seguem a unidade e a carteira atual mesmo após mudança de unidade", async () => {
    const f = await fixture(); const actor = await user(), other = await user();
    const manager = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: actor.id, role: "MANAGER", unitId: f.a.id } });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: other.id, role: "TRAINER", unitId: f.b.id } });
    const ids = (await getGymChatContacts(f.workspace.id, actor.id)).map(contact => contact.id);
    expect(ids).toContain(f.owner.id); expect(ids).toContain(f.learner.id); expect(ids).not.toContain(other.id);
    const conversation = await prisma.conversation.create({ data: { workspaceId: f.workspace.id, type: "DIRECT", participants: { create: [{ userId: actor.id }, { userId: f.learner.id }] } } });
    await assertChatConversation(conversation.id, actor.id);
    const initial = await resolveRealtimeCapabilities(actor.id);
    expect(initial).toHaveProperty(`conversation:${conversation.id}`);
    expect(initial[`workspace:${f.workspace.id}:presence`]).toBeUndefined();
    expect(initial[`workspace:${f.workspace.id}:user:${other.id}:presence`]).toBeUndefined();
    expect(initial[`workspace:${f.workspace.id}:user:${f.learner.id}:presence`]).toEqual(["subscribe"]);
    await prisma.workspaceMember.update({ where: { id: manager.id }, data: { unitId: f.b.id } });
    await expect(assertChatConversation(conversation.id, actor.id)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
    expect((await resolveRealtimeCapabilities(actor.id))[`conversation:${conversation.id}`]).toBeUndefined();
  });
  it("medidas e remoções são locais, revalidam autoridade e revertem junto com auditoria sem dados de saúde no log", async () => {
    const f = await fixture(), foreign = await fixture();
    const progress = await recordGymProgress(f.workspace.id, f.student.id, f.learner.id, { action: "logProgress", weight: "75.5", notes: "saude-sintetica-nao-auditar" });
    expect(progress.weight).toBe(75.5);
    await expect(recordGymProgress(f.workspace.id, f.student.id, f.learner.id, { action: "logProgress", weight: "abc" })).rejects.toMatchObject({ statusCode: 400 });
    await removeGymEvolutionRecord(foreign.workspace.id, foreign.student.id, foreign.learner.id, "progress", progress.id);
    expect(await prisma.studentProgress.findUnique({ where: { id: progress.id } })).not.toBeNull();
    await expect(withAuditIdentity({ actorUserId: "missing-audit-actor", effectiveUserId: f.learner.id, impersonated: true }, () => removeGymEvolutionRecord(f.workspace.id, f.student.id, f.learner.id, "progress", progress.id))).rejects.toBeDefined();
    expect(await prisma.studentProgress.findUnique({ where: { id: progress.id } })).not.toBeNull();
    await removeGymEvolutionRecord(f.workspace.id, f.student.id, f.learner.id, "progress", progress.id);
    expect(await prisma.studentProgress.findUnique({ where: { id: progress.id } })).toBeNull();
    const logs = await prisma.auditLog.findMany({ where: { entityId: progress.id } });
    expect(logs).toHaveLength(2); expect(JSON.stringify(logs)).not.toContain("saude-sintetica-nao-auditar");
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "EXPIRED" } });
    await expect(getGymStudentFinance(f.workspace.id, f.student.id, f.learner.id)).rejects.toMatchObject({ code: "INVALID_STATUS" });
    expect(await prisma.workspaceMember.findFirst({ where: { workspaceId: f.workspace.id, userId: f.learner.id, role: "STUDENT", isActive: true } })).toBeNull();
    const personal = await prisma.workspace.create({ data: { ownerId: f.owner.id, type: "PERSONAL", slug: randomUUID(), name: "Personal preservado", members: { create: { userId: f.learner.id, role: "STUDENT" } } } });
    expect(await prisma.workspaceMember.findFirst({ where: { workspaceId: personal.id, userId: f.learner.id, role: "STUDENT", isActive: true } })).not.toBeNull();
  });
  it("jobs excluem suspensão e licença vencida antes do lote; regularização retoma apenas contratos elegíveis", async () => {
    const f = await fixture(); const now = new Date();
    const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Plano de job", versions: { create: { name: "Versão", priceInCents: BigInt(1000), termsText: "Termos sintéticos" } } }, include: { versions: true } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.student.id, unitId: f.a.id, planVersionId: plan.versions[0].id, status: "ACTIVE", startDate: new Date(now.getTime() - 86400000), endDate: new Date(now.getTime() - 1000), nextDueDate: now, subscriptionStatus: "ACTIVE", priceInCents: BigInt(1000), autoRenew: false } });
    for (const state of ["suspended", "expired"] as const) {
      await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: state !== "suspended" } });
      await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: state === "expired" ? "EXPIRED" : "ACTIVE" } });
      expect(await manualSubscriptionService.processDue(now, f.workspace.id)).toMatchObject({ processed: 0, failures: [] });
      expect(await processLocalEnrollmentClosures(f.workspace.id, now)).toMatchObject({ totalProcessed: 0 });
      expect((await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe("ACTIVE");
    }
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "ACTIVE" } });
    expect(await processLocalEnrollmentClosures(f.workspace.id, now)).toMatchObject({ expiredCount: 1 });
    expect(await processLocalEnrollmentClosures(f.workspace.id, now)).toMatchObject({ expiredCount: 0 });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: enrollment.id } })).toBe(0);
  });
  it("papel legado local não ganha autoridade global; grants revogados não restauram o legado", async () => {
    const f = await fixture(); const actor = await user();
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: actor.id, role: "MANAGER", unitId: f.a.id } });
    await authority(f.workspace.id, actor.id, f.a.id);
    await expect(authority(f.workspace.id, actor.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(authority(f.workspace.id, actor.id, f.b.id)).rejects.toMatchObject({ statusCode: 403 });
    const scope = await serializableTransaction(tx => getGymUnitAccess(tx, f.workspace.id, actor.id, "students.read"));
    expect(scope.units.map(unit => unit.id)).toEqual([f.a.id]); expect(scope.includeUnassigned).toBe(false);
    await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "OWNER", unitId: f.a.id, revokedAt: new Date() } });
    await expect(authority(f.workspace.id, actor.id, f.a.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(authority(f.workspace.id, actor.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("seletores mantêm titular registrado e escopo legado; coproprietário local não administra globalmente", async () => {
    const f = await fixture(); const local = await user(); const legacy = await user();
    await prisma.workspaceMember.update({ where: { id: f.ownerMember.id }, data: { role: "STUDENT", roleGrants: { create: { role: "OWNER", revokedAt: new Date() } } } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: local.id, role: "OWNER", unitId: f.a.id, roleGrants: { create: { role: "OWNER", unitId: f.a.id } } } });
    const trainer = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: legacy.id, role: "TRAINER", unitId: f.a.id } });
    const selectors = await getGymStudentSelectors(f.workspace.id, local.id);
    expect(selectors.units.map(unit => unit.id)).toEqual([f.a.id]);
    expect(selectors.trainers.find(row => row.id === f.ownerMember.id)).toMatchObject({ role: "OWNER", unitIds: [f.a.id] });
    const global = await getGymStudentSelectors(f.workspace.id, f.owner.id);
    expect(global.trainers.find(row => row.id === trainer.id)?.unitIds).toEqual([f.a.id]);
    expect((await getGymOwnershipCandidates(f.workspace.id, f.owner.id)).some(row => row.id === f.ownerMember.id)).toBe(true);
    await expect(authority(f.workspace.id, local.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(member.unitId).toBe(f.a.id);
  });
  it("coproprietários históricos não passam pela concessão comum; rebaixamento revoga todo o conjunto anterior", async () => {
    const f = await fixture(); const manager = await user(); const historical = await user(); const worker = await user();
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: manager.id, role: "MANAGER" } });
    const old = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: historical.id, role: "OWNER", roleGrants: { create: { role: "RECEPTIONIST", unitId: f.a.id } } } });
    await expect(mutateGymRole({ workspaceId: f.workspace.id, memberId: old.id, actorUserId: manager.id, role: "FINANCE", revoke: false })).rejects.toMatchObject({ code: "INVALID_ROLE" });
    await expect(updateGymStaff({ workspaceId: f.workspace.id, memberId: old.id, actorUserId: manager.id, role: "TRAINER" })).rejects.toMatchObject({ code: "INVALID_ROLE" });
    await expect(offboardGymStaff({ workspaceId: f.workspace.id, memberId: old.id, actorUserId: manager.id, reason: "Teste sintético" })).rejects.toMatchObject({ statusCode: 403 });
    await expect(transferWorkspaceOwner({ workspaceId: f.workspace.id, currentOwnerUserId: f.owner.id, targetUserId: historical.id, auditActorId: manager.id })).rejects.toMatchObject({ statusCode: 403 });
    const staff = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: worker.id, role: "TRAINER", unitId: f.a.id, roleGrants: { create: [{ role: "TRAINER", unitId: f.a.id }, { role: "FINANCE", unitId: f.b.id }] } } });
    await updateGymStaff({ workspaceId: f.workspace.id, memberId: staff.id, actorUserId: f.owner.id, role: "RECEPTIONIST", unitId: f.a.id });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: staff.id, role: { in: ["TRAINER", "FINANCE"] }, revokedAt: null } })).toBe(0);
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: staff.id, revokedBy: f.owner.id, revokedAt: { not: null } } })).toBe(2);
  });
  it("migração explícita preserva unidade e idempotência; serviços legados exigem ator", async () => {
    const f = await fixture(); const actor = await user();
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: actor.id, role: "MANAGER", unitId: f.a.id } });
    await expect(backfillService.backfillLegacyRoleGrants(f.workspace.id)).rejects.toMatchObject({ statusCode: 401 });
    await backfillService.backfillLegacyRoleGrants(f.workspace.id, f.admin.id);
    expect(await backfillService.backfillLegacyRoleGrants(f.workspace.id, f.admin.id)).toEqual({ backfilledCount: 0 });
    expect(await prisma.workspaceRoleGrant.findFirstOrThrow({ where: { memberId: member.id } })).toMatchObject({ unitId: f.a.id, grantedBy: f.admin.id });
    await expect(authority(f.workspace.id, actor.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(new GymService().createUnit(f.workspace.id, { name: "Sem ator" })).rejects.toMatchObject({ statusCode: 401 });
    await expect(gymPlanService.listPlans(f.workspace.id)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("suspensão bloqueia superadmin operacional, chat e realtime; recuperação administrativa continua disponível", async () => {
    const f = await fixture();
    const conversation = await prisma.conversation.create({ data: { workspaceId: f.workspace.id, participants: { create: { userId: f.owner.id } } } });
    await updateWorkspaceAdministration(f.workspace.id, { isActive: false, expectedIsActive: true }, f.admin.id);
    for (const actor of [f.owner.id, f.admin.id]) await expect(authority(f.workspace.id, actor)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    await expect(assertChatConversation(conversation.id, f.owner.id)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    expect(await resolveRealtimeCapabilities(f.owner.id)).not.toHaveProperty(`workspace:${f.workspace.id}:finance`);
    await SuperAdminGymService.updateGymConfig({ workspaceId: f.workspace.id, adminUserId: f.admin.id, subscription: { status: "ACTIVE" } });
    await updateWorkspaceAdministration(f.workspace.id, { isActive: true, expectedIsActive: false }, f.admin.id);
    await authority(f.workspace.id, f.owner.id);
  });
  it("trial vencido, término, PAST_DUE e licença ausente bloqueiam operação sem criar trial por leitura", async () => {
    const f = await fixture(); const expired = new Date(Date.now() - 1000);
    for (const data of [{ status: "TRIAL" as const, trialEndsAt: expired, endDate: null }, { status: "ACTIVE" as const, trialEndsAt: null, endDate: expired }, { status: "PAST_DUE" as const, trialEndsAt: null, endDate: null }]) {
      await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data });
      await expect(authority(f.workspace.id, f.owner.id)).rejects.toMatchObject({ code: "INVALID_STATUS" });
      await expect(authority(f.workspace.id, f.admin.id)).rejects.toMatchObject({ code: "INVALID_STATUS" });
    }
    await prisma.workspaceSubscription.delete({ where: { workspaceId: f.workspace.id } });
    await expect(assertGymOperationalWorkspace(f.workspace.id)).rejects.toMatchObject({ code: "INVALID_STATUS" });
    expect(await prisma.workspaceSubscription.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("quota de unidades concorre atomicamente, incluindo reativação; downgrade preserva histórico", async () => {
    const f = await fixture();
    const attempts = await Promise.allSettled(["C", "D"].map(name => createGymUnit(f.workspace.id, { name: `Unidade ${name}` }, f.owner.id)));
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.gymUnit.count({ where: { workspaceId: f.workspace.id, isActive: true } })).toBe(3);
    await updateGymUnit(f.workspace.id, f.b.id, { isActive: false }, f.owner.id);
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { maxUnits: 0 } });
    await expect(updateGymUnit(f.workspace.id, f.b.id, { isActive: true }, f.owner.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.gymUnit.count({ where: { workspaceId: f.workspace.id } })).toBe(3);
    await expect(updateGymUnit(f.workspace.id, f.a.id, { isActive: false }, f.owner.id)).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });
  it("convites reservam vagas, aceite revalida downgrade e papel de equipe não evita quota", async () => {
    const f = await fixture(); await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { maxStaff: 2 } });
    const a = await user(); const b = await user();
    const invite = (email: string) => inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.owner.id, email, role: "TRAINER", unitId: f.a.id });
    const attempts = await Promise.allSettled([invite(a.email!), invite(b.email!)]);
    const accepted = attempts.find(result => result.status === "fulfilled");
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    if (!accepted || accepted.status !== "fulfilled") throw new Error("Convite esperado.");
    const recipient = accepted.value.invitation.email === a.email ? a : b;
    await expect(mutateGymRole({ workspaceId: f.workspace.id, memberId: f.student.id, actorUserId: f.owner.id, role: "TRAINER", unitId: f.a.id, revoke: false })).rejects.toMatchObject({ code: "STAFF_LIMIT_REACHED" });
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { maxStaff: 1 } });
    await expect(acceptGymStaffInvitation(accepted.value.rawToken, recipient.id)).rejects.toMatchObject({ code: "STAFF_LIMIT_REACHED" });
    expect((await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: accepted.value.invitation.id } })).status).toBe("PENDING");
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { maxStaff: 2 } });
    await acceptGymStaffInvitation(accepted.value.rawToken, recipient.id);
    expect(await prisma.workspaceInvitation.count({ where: { workspaceId: f.workspace.id, status: "PENDING" } })).toBe(0);
  });
  it("reservas de marca/chat concorrem com arquivos; expiração não esconde órfão e tamanho declarado não substitui conferência", async () => {
    const f = await fixture();
    const base = { workspaceId: f.workspace.id, actorUserId: f.owner.id, size: 600_000 };
    const a = `workspace/${f.workspace.id}/logos/a.png`; const b = `workspace/${f.workspace.id}/chat/${f.owner.id}/b.pdf`;
    const attempts = await Promise.allSettled([reserveGymStorage({ ...base, objectKey: a, target: "logo" }), reserveGymStorage({ ...base, objectKey: b, target: "chat_attachment" })]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await checkStorageQuota(f.workspace.id, undefined, 600_000)).allowed).toBe(false);
    const row = await prisma.gymStorageObject.findFirstOrThrow({ where: { workspaceId: f.workspace.id } });
    await expect(serializableTransaction(tx => finalizeGymStorage(tx, { ...base, objectKey: row.objectKey, target: row.target, size: 600_001 }))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await prisma.gymStorageObject.update({ where: { objectKey: row.objectKey }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(600_000));
    await expect(reserveGymStorage({ ...base, objectKey: `workspace/${f.workspace.id}/logos/blocked.png`, target: "logo" })).rejects.toMatchObject({ code: "STORAGE_EXCEEDED" });
    const deletion = vi.spyOn(storageService, "deleteObject").mockResolvedValue(undefined);
    try { await deleteGymStorageOrphan(f.workspace.id, row.objectKey, f.admin.id); } finally { deletion.mockRestore(); }
    expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(0));
    await reserveGymStorage({ ...base, objectKey: `workspace/${f.workspace.id}/files/c.pdf`, target: "student_file", studentUserId: f.learner.id });
    expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(600_000));
  });
  it("finalização de foto usa metadata real, não duplica contabilização e rejeita operador alheio", async () => {
    const f = await fixture(); const key = `workspace/${f.workspace.id}/students/${f.learner.id}/progress/a.png`;
    const metadata = vi.spyOn(storageService, "getObjectMetadata").mockResolvedValue({ size: 600_000, contentType: "image/png", eTag: undefined });
    try {
      await reserveGymStorage({ workspaceId: f.workspace.id, actorUserId: f.learner.id, objectKey: key, target: "progress_photo", size: 600_000, studentUserId: f.learner.id });
      const photo = await attachGymProgressPhoto({ workspaceId: f.workspace.id, studentMemberId: f.student.id, actorUserId: f.learner.id, objectKey: key, photoUrl: `/api/storage/file?key=${encodeURIComponent(key)}` });
      expect(photo).toMatchObject({ size: 600_000, mimeType: "image/png" });
      expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(600_000));
      await expect(attachGymProgressPhoto({ workspaceId: f.workspace.id, studentMemberId: f.student.id, actorUserId: (await user()).id, objectKey: key, photoUrl: photo.photoUrl })).rejects.toMatchObject({ statusCode: 403 });
    } finally { metadata.mockRestore(); }
  });
  it("inventário histórico não presume tamanho; reconciliação permite downgrade sem apagar dados", async () => {
    const f = await fixture(); const key = `workspace/${f.workspace.id}/logos/legacy.png`;
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { logoKey: key } });
    await expect(gymStorageUsage(prisma, f.workspace.id)).rejects.toMatchObject({ code: "STORAGE_RECONCILIATION_REQUIRED" });
    const metadata = vi.spyOn(storageService, "getObjectMetadata").mockResolvedValue({ size: 2_000_000, contentType: "image/png", eTag: undefined });
    try {
      await expect(reconcileGymStorage(f.workspace.id, f.owner.id)).rejects.toMatchObject({ statusCode: 403 });
      expect(await reconcileGymStorage(f.workspace.id, f.admin.id)).toMatchObject({ verifiedObjects: 1, unmappedObjects: 0 });
      expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(2_000_000));
      expect((await checkStorageQuota(f.workspace.id, undefined, 1)).allowed).toBe(false);
      await expect(deleteGymStorageOrphan(f.workspace.id, key, f.admin.id)).rejects.toMatchObject({ code: "INVALID_STATUS" });
      expect((await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).logoKey).toBe(key);
    } finally { metadata.mockRestore(); }
  });
  it("falha de exclusão física mantém capacidade e claim; retry só libera após confirmação", async () => {
    const f = await fixture(); const key = `workspace/${f.workspace.id}/logos/orphan.png`;
    await prisma.gymStorageObject.create({ data: { workspaceId: f.workspace.id, actorUserId: f.owner.id, objectKey: key, target: "logo", size: BigInt(600_000), status: "FINALIZED" } });
    const deletion = vi.spyOn(storageService, "deleteObject").mockRejectedValue(new Error("Falha sintética de storage"));
    try {
      await expect(deleteGymStorageOrphan(f.workspace.id, key, f.admin.id)).rejects.toThrow("Falha sintética");
      expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(600_000));
      deletion.mockResolvedValue(undefined);
      await deleteGymStorageOrphan(f.workspace.id, key, f.admin.id);
      expect(await gymStorageUsage(prisma, f.workspace.id)).toBe(BigInt(0));
    } finally { deletion.mockRestore(); }
  });
  it("auditoria separa ator real e conta representada e acompanha before/after; falha reverte a escrita", async () => {
    const f = await fixture();
    await withAuditIdentity({ actorUserId: f.admin.id, effectiveUserId: f.owner.id, impersonated: true }, () => createGymUnit(f.workspace.id, { name: "Unidade auditada" }, f.owner.id));
    const log = await prisma.auditLog.findFirstOrThrow({ where: { userId: f.admin.id, action: "GYM_UNIT_CREATED" }, orderBy: { createdAt: "desc" } });
    expect(log.metadata).toMatchObject({ actorUserId: f.admin.id, effectiveUserId: f.owner.id, impersonated: true, phase: "LOCAL_COMMIT" });
    const second = await fixture();
    await expect(withAuditIdentity({ actorUserId: `missing-${randomUUID()}`, effectiveUserId: second.owner.id, impersonated: true }, () => createGymUnit(second.workspace.id, { name: "Deve reverter" }, second.owner.id))).rejects.toMatchObject({ code: "P2003" });
    expect(await prisma.gymUnit.count({ where: { workspaceId: second.workspace.id } })).toBe(2);
    await SuperAdminGymService.updateGymConfig({ workspaceId: f.workspace.id, adminUserId: f.admin.id, subscription: { maxStudents: 0 } });
    const license = await prisma.auditLog.findFirstOrThrow({ where: { entityId: f.workspace.id, action: { startsWith: "SUPERADMIN_GYM_CONFIG_UPDATE:" } }, orderBy: { createdAt: "desc" } });
    expect(license.metadata).toMatchObject({ before: { maxStudents: 50 }, after: { maxStudents: 0 } });
    expect(JSON.stringify(license.metadata)).not.toContain("email");
  });
  it("avaliação e auditoria pertencem à mesma transação", async () => {
    const f = await fixture();
    await expect(withAuditIdentity({ actorUserId: `missing-${randomUUID()}`, effectiveUserId: f.owner.id, impersonated: true }, () => gymAssessmentService.createPhysicalEvaluation({ workspaceId: f.workspace.id, studentMemberId: f.student.id, evaluatorUserId: f.owner.id, type: "Avaliação sintética", weight: 80, height: 180 }))).rejects.toMatchObject({ code: "P2003" });
    expect(await prisma.physicalEvaluation.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
});
