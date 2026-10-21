import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { activateGymEnrollment } from "@/modules/workspaces/application/enrollment-activation";
import { createGymEnrollment } from "@/modules/workspaces/application/enrollment-creation";
import { pauseGymEnrollment, resumeGymEnrollment, processScheduledGymPauses } from "@/modules/workspaces/application/enrollment-pause";
import { generateLocalCycleInvoice, manualSubscriptionService } from "@/modules/workspaces/application/manual-subscription-service";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());
async function fixture(studentUserId?: string) {
  const owner = await prisma.user.create({ data: { name: "Operador sintético da política" } });
  const student = studentUserId ? await prisma.user.findUniqueOrThrow({ where: { id: studentUserId } }) : await prisma.user.create({ data: { name: "Aluno sintético", birthDate: new Date("1990-01-15"), cpfCnpj: "12345678909", email: `policy-${randomUUID()}@example.invalid`, whatsapp: "11900000000" } });
  const gym = await prisma.workspace.create({ data: { ownerId: owner.id, name: "Políticas de matrícula sintéticas", slug: randomUUID(), type: "GYM", members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE" } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: gym.id, name: "Unidade sintética" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: student.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: gym.id, name: "Plano sintético", versions: { create: { name: "Versão sintética", priceInCents: BigInt(10000), durationDays: 365, termsText: "Contrato exclusivamente sintético." } } }, include: { versions: true } });
  const now = new Date();
  const enrollment = () => prisma.gymEnrollment.create({ data: { workspaceId: gym.id, studentMemberId: member.id, unitId: unit.id, planVersionId: plan.versions[0].id, priceInCents: BigInt(10000), status: "PENDING_ACTIVATION", startDate: new Date(now.getTime() - 60000), endDate: new Date(now.getTime() + 365 * 86400000), nextDueDate: now, recurrenceMode: "LOCAL", subscriptionStatus: "ACTIVE", acceptance: { create: { workspaceId: gym.id, signerUserId: student.id, termsSnapshot: "Aceite sintético", termsVersion: "1" } } } });
  const activate = (enrollmentId: string) => activateGymEnrollment({ workspaceId: gym.id, enrollmentId, actorUserId: owner.id, overrideReason: "Liberação inicial exclusivamente sintética" });
  return { owner, student, gym, unit, member, plan, now, enrollment, activate };
}

describe("Políticas aprovadas de matrícula e pausa", () => {
  it("duas ativações independentes simultâneas deixam uma única matrícula vigente", async () => {
    const f = await fixture(); const a = await f.enrollment(), b = await f.enrollment();
    const results = await Promise.allSettled([f.activate(a.id), f.activate(b.id)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(r => r.status === "rejected");
    expect(failed?.status === "rejected" && failed.reason).toMatchObject({ statusCode: 409, code: "ACTIVE_ENROLLMENT_EXISTS" });
    expect(await prisma.gymEnrollment.count({ where: { studentMemberId: f.member.id, status: { in: ["ACTIVE", "PAUSED"] } } })).toBe(1);
    expect(await prisma.gymEnrollmentEvent.count({ where: { workspaceId: f.gym.id, toStatus: "ACTIVE" } })).toBe(1);
  });
  it("matrícula vigente impede novo cadastro independente; cancelada permite contrato novo preservando histórico", async () => {
    const f = await fixture(), active = await f.enrollment(); await f.activate(active.id);
    const create = () => createGymEnrollment({ workspaceId: f.gym.id, studentMemberId: f.member.id, planVersionId: f.plan.versions[0].id, actorUserId: f.owner.id });
    await expect(create()).rejects.toMatchObject({ code: "ACTIVE_ENROLLMENT_EXISTS" });
    expect(await prisma.gymEnrollment.count({ where: { studentMemberId: f.member.id } })).toBe(1);
    await prisma.gymEnrollment.update({ where: { id: active.id }, data: { status: "CANCELLED", accessGranted: false } });
    expect(await create()).toMatchObject({ status: "PENDING_ACCEPTANCE" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: active.id } })).toMatchObject({ status: "CANCELLED" });
    expect(await prisma.gymContractAcceptance.count({ where: { enrollmentId: active.id } })).toBe(1);
  });
  it("pausa conserva a matrícula vigente e bloqueia outra ativação; duplicidade legada bloqueia retomada", async () => {
    const f = await fixture(), original = await f.enrollment(), pending = await f.enrollment(); await f.activate(original.id);
    const command = { workspaceId: f.gym.id, enrollmentId: original.id, actorUserId: f.owner.id };
    await pauseGymEnrollment({ ...command, startDate: f.now, endDate: new Date(f.now.getTime() + 3600000), reason: "Pausa sintética" }, f.now);
    await expect(f.activate(pending.id)).rejects.toMatchObject({ code: "ACTIVE_ENROLLMENT_EXISTS" });
    // Deliberately simulate a historical writer; no automatic cancellation is allowed.
    await prisma.gymEnrollment.update({ where: { id: pending.id }, data: { status: "ACTIVE", activatedAt: f.now, accessGranted: true } });
    await expect(resumeGymEnrollment(command, new Date(f.now.getTime() + 60000))).rejects.toMatchObject({ code: "ACTIVE_ENROLLMENT_EXISTS" });
    await expect(manualSubscriptionService.cycle({ workspaceId: f.gym.id, enrollmentId: pending.id, actorUserId: f.owner.id })).rejects.toMatchObject({ code: "ACTIVE_ENROLLMENT_EXISTS" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: original.id } })).toMatchObject({ status: "PAUSED", accessGranted: false });
    expect(await prisma.gymEnrollmentPause.findFirst({ where: { enrollmentId: original.id } })).toMatchObject({ resumedAt: null });
  });
  it("o mesmo usuário pode ter uma matrícula ativa em cada academia", async () => {
    const f = await fixture(), g = await fixture(f.student.id);
    const a = await f.enrollment(), b = await g.enrollment();
    await Promise.all([f.activate(a.id), g.activate(b.id)]);
    expect(await prisma.gymEnrollment.count({ where: { studentMember: { userId: f.student.id }, status: "ACTIVE" } })).toBe(2);
  });
  it("intervalo de pausa suspende emissão antes do job de estado, sem apagar dívida ou avançar ciclo", async () => {
    const f = await fixture(), enrollment = await f.enrollment(); await f.activate(enrollment.id);
    const start = new Date(f.now.getTime() + 3600000), end = new Date(start.getTime() + 3600000);
    const command = { workspaceId: f.gym.id, enrollmentId: enrollment.id, actorUserId: f.owner.id };
    await pauseGymEnrollment({ ...command, startDate: start, endDate: end, reason: "Pausa futura sintética" }, f.now);
    const debt = await prisma.gymInvoice.create({ data: { workspaceId: f.gym.id, enrollmentId: enrollment.id, studentMemberId: f.member.id, studentUserId: f.student.id, invoiceNumber: randomUUID(), title: "Dívida preservada", dueDate: f.now, subtotalInCents: BigInt(7000), totalInCents: BigInt(7000), balanceRemainingInCents: BigInt(7000), payerName: f.student.name!, createdByUserId: f.owner.id } });
    const generate = (now: Date) => serializableTransaction(tx => generateLocalCycleInvoice(tx, { ...command, dueDate: f.now }, false, now));
    await expect(generate(start)).rejects.toMatchObject({ statusCode: 409, code: "BILLING_PAUSED" });
    const result = await manualSubscriptionService.processDue(start, f.gym.id);
    expect(result).toMatchObject({ processed: 0, failures: [] });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: enrollment.id } })).toMatchObject({ status: "ACTIVE", cycleCount: 0, nextDueDate: f.now });
    expect(await prisma.gymInvoice.findUnique({ where: { id: debt.id } })).toMatchObject({ balanceRemainingInCents: BigInt(7000), status: "OPEN" });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
    await processScheduledGymPauses(f.gym.id, start);
    await expect(generate(start)).rejects.toMatchObject({ code: "BILLING_PAUSED" });
    await resumeGymEnrollment(command, end);
    const invoice = await generate(end);
    expect(invoice.totalInCents).toBe(BigInt(10000));
    expect(await prisma.gymInvoice.findUnique({ where: { id: debt.id } })).toMatchObject({ balanceRemainingInCents: BigInt(7000) });
    expect(await generate(end)).toMatchObject({ id: invoice.id });
  });
  it("pausa futura não bloqueia geração antecipadamente, e replay preserva obrigações anteriores durante pausa", async () => {
    const f = await fixture(), enrollment = await f.enrollment(); await f.activate(enrollment.id);
    const command = { workspaceId: f.gym.id, enrollmentId: enrollment.id, actorUserId: f.owner.id };
    const start = new Date(f.now.getTime() + 3600000), end = new Date(start.getTime() + 3600000);
    await pauseGymEnrollment({ ...command, startDate: start, endDate: end, reason: "Pausa futura sintética" }, f.now);
    const invoice = await serializableTransaction(tx => generateLocalCycleInvoice(tx, { ...command, dueDate: f.now }, false, f.now));
    expect(await serializableTransaction(tx => generateLocalCycleInvoice(tx, { ...command, dueDate: f.now }, false, start))).toMatchObject({ id: invoice.id });
    const state = await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    await expect(serializableTransaction(tx => generateLocalCycleInvoice(tx, { ...command, dueDate: state.nextDueDate! }, false, start))).rejects.toMatchObject({ code: "BILLING_PAUSED" });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
  });
});
