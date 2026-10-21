import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { pauseGymEnrollment, resumeGymEnrollment, processScheduledGymPauses } from "@/modules/workspaces/application/enrollment-pause";
import { activateGymEnrollment } from "@/modules/workspaces/application/enrollment-activation";
import { processLocalEnrollmentClosures } from "@/modules/workspaces/application/enrollment-closure-job";
import { calculatePauseExtension } from "@/modules/workspaces/domain/enrollment-lifecycle";
import { gymCalendarInstant } from "@/modules/workspaces/domain/gym-calendar-date";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
const hour = 3600000;
async function fixture() {
  const now = new Date();
  const owner = await prisma.user.create({ data: { name: "Operador de pausa sintético" } });
  const student = await prisma.user.create({ data: { name: "Aluno de pausa sintético", birthDate: new Date("1990-01-15T00:00:00Z") } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "GYM pausa", slug: `pause-${randomUUID()}`, members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE" } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade pausa" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano pausa", versions: { create: { name: "Versão pausa", priceInCents: BigInt(10000), termsText: "Termos sintéticos" } } }, include: { versions: true } });
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, unitId: unit.id, planVersionId: plan.versions[0].id, priceInCents: BigInt(10000), status: "ACTIVE", accessGranted: true, activatedAt: now, startDate: new Date(now.getTime() - 24 * hour), endDate: new Date(now.getTime() + 30 * 24 * hour), acceptance: { create: { workspaceId: workspace.id, signerUserId: student.id, termsSnapshot: "Aceite sintético preservado", termsVersion: "1" } } } });
  const command = { workspaceId: workspace.id, enrollmentId: enrollment.id, actorUserId: owner.id };
  return { now, owner, student, workspace, unit, member, enrollment, command };
}
describe("Pausa GYM — autoridade, agendamento e fatos preservados", () => {
  it("pausa futura mantém acesso; concorrência inicia/encerra uma vez e estende somente o tempo efetivo", async () => {
    const f = await fixture(); const start = new Date(f.now.getTime() + hour), end = new Date(f.now.getTime() + 3 * hour);
    const input = { ...f.command, startDate: start, endDate: end, reason: "Viagem", extendEndDate: true };
    await Promise.all([pauseGymEnrollment(input, f.now), pauseGymEnrollment(input, f.now)]);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "ACTIVE", accessGranted: true });
    expect(await prisma.gymEnrollmentPause.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    const effectiveStart = new Date(start.getTime() + hour / 2);
    await Promise.all([processScheduledGymPauses(f.workspace.id, effectiveStart), processScheduledGymPauses(f.workspace.id, effectiveStart)]);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "PAUSED", accessGranted: false });
    await expect(activateGymEnrollment({ ...f.command, overrideReason: "Não deve contornar pausa" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id, reason: { startsWith: "PAUSE_STARTED:" } } })).toBe(1);
    await Promise.all([processLocalEnrollmentClosures(f.workspace.id, new Date(end.getTime() + hour)), processLocalEnrollmentClosures(f.workspace.id, new Date(end.getTime() + hour))]);
    const updated = await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } });
    expect(updated).toMatchObject({ status: "ACTIVE", accessGranted: true });
    expect(updated.endDate?.getTime()).toBe(f.enrollment.endDate!.getTime() + end.getTime() - effectiveStart.getTime());
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id, reason: { startsWith: "PAUSE_RESUMED:" } } })).toBe(1);
    expect(await prisma.gymContractAcceptance.findUnique({ where: { enrollmentId: f.enrollment.id } })).toMatchObject({ termsSnapshot: "Aceite sintético preservado" });
    expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("encerrar programação não concede dias; zero duração e retomada repetida não fabricam extensão", async () => {
    const f = await fixture(); const input = { ...f.command, startDate: new Date(f.now.getTime() + hour), endDate: new Date(f.now.getTime() + 3 * hour), reason: "Programação", extendEndDate: true };
    await pauseGymEnrollment(input, f.now);
    await Promise.all([resumeGymEnrollment(f.command, f.now), resumeGymEnrollment(f.command, f.now)]);
    expect((await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).endDate).toEqual(f.enrollment.endDate);
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id, reason: { startsWith: "PAUSE_SCHEDULE_CANCELLED:" } } })).toBe(1);
    const past = new Date(f.now.getTime() - hour);
    await pauseGymEnrollment({ ...input, startDate: past }, f.now);
    const resumed = await resumeGymEnrollment(f.command, f.now);
    expect(resumed.endDate).toEqual(f.enrollment.endDate);
    expect(calculatePauseExtension({ currentEndDate: f.enrollment.endDate, pauseStartDate: f.now, pauseEndDate: past })).toEqual(f.enrollment.endDate);
    expect(gymCalendarInstant("2026-10-04", "America/Sao_Paulo").toISOString()).toBe("2026-10-04T03:00:00.000Z");
    expect(gymCalendarInstant("2026-10-04", "Asia/Tokyo").toISOString()).toBe("2026-10-03T15:00:00.000Z");
    expect(() => gymCalendarInstant("2026-10-04", "invalid/timezone")).toThrow("fuso horário");
  });
  it("nega intervalo inválido, sobreposição, tenant/unidade alheios e permissões revogadas no domínio", async () => {
    const f = await fixture(), other = await fixture();
    const input = { ...f.command, startDate: f.now, endDate: new Date(f.now.getTime() + hour), reason: "Pausa", extendEndDate: false };
    await expect(pauseGymEnrollment({ ...input, endDate: f.now }, f.now)).rejects.toMatchObject({ statusCode: 400 });
    await expect(pauseGymEnrollment({ ...input, workspaceId: other.workspace.id }, f.now)).rejects.toMatchObject({ statusCode: 404 });
    const operator = await prisma.user.create({ data: { name: "Operador local sintético" } });
    // Tenant constraints reject cross-workspace units before the service is called.
    await expect(prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: operator.id, role: "MANAGER", unitId: other.unit.id } })).rejects.toThrow("GYM tenant relation mismatch");
    const outsideUnit = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Unidade fora da carteira" } });
    const staff = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: operator.id, role: "MANAGER", unitId: outsideUnit.id, roleGrants: { create: { role: "MANAGER", unitId: outsideUnit.id } } } });
    await expect(pauseGymEnrollment({ ...input, actorUserId: operator.id }, f.now)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: staff.id }, data: { unitId: f.unit.id } });
    await pauseGymEnrollment({ ...input, actorUserId: operator.id }, f.now);
    await expect(pauseGymEnrollment({ ...input, reason: "Outra pausa" }, f.now)).rejects.toMatchObject({ statusCode: 409 });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: staff.id }, data: { revokedAt: f.now } });
    await expect(resumeGymEnrollment({ ...f.command, actorUserId: operator.id }, f.now)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { recurrenceMode: "PROVIDER" } });
    await expect(resumeGymEnrollment(f.command, f.now)).rejects.toMatchObject({ code: "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED" });
    expect(await prisma.gymEnrollmentPause.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
  });
  it("não usa retomada para ativar contrato pendente, sem aceite, vínculo revogado ou academia suspensa", async () => {
    const f = await fixture(); const input = { ...f.command, startDate: f.now, endDate: new Date(f.now.getTime() + hour), reason: "Pausa" };
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { status: "PENDING_ACTIVATION", accessGranted: false } });
    await expect(resumeGymEnrollment(f.command, f.now)).rejects.toMatchObject({ statusCode: 409 });
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { status: "ACTIVE", accessGranted: true } });
    await pauseGymEnrollment(input, f.now);
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { isActive: false } });
    await expect(resumeGymEnrollment(f.command, f.now)).rejects.toMatchObject({ code: "ACTIVATION_CONDITION_NOT_MET" });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { isActive: true } });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(resumeGymEnrollment(f.command, f.now)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "PAUSED", accessGranted: false });
  });
});
