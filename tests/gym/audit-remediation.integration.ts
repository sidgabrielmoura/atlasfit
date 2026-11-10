import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { saveGymTemplateEditor } from "@/modules/workspaces/application/gym-template-editor";
import { getGymStudent } from "@/modules/workspaces/application/gym-student-queries";
import { updateGymEnrollment } from "@/modules/workspaces/application/enrollment-update";
import { GymPlanService } from "@/modules/workspaces/application/plan-service";
import { confirmCreditPurchase } from "@/modules/payments/abacate-confirmation";
import { processGymPlatformWebhook } from "@/modules/payments/gym-platform-webhook";
import { issueManualInvoice } from "@/modules/workspaces/application/manual-invoice-service";
import { commitGymMigrationJob } from "@/modules/workspaces/application/gym-migration-commit";
import { commitImportJob } from "@/lib/migration/commit.service";
import { GeminiMigrationExtractor } from "@/lib/gemini/extractor";
import * as geminiClient from "@/lib/gemini/client";
import { persistImportSource } from "@/lib/migration/source-upload";
import { rateLimit, pruneRateLimitBuckets } from "@/lib/rate-limit";
import { getGymDashboardMetrics } from "@/modules/workspaces/application/gym-dashboard-metrics";
import { GET, PUT, DELETE } from "@/app/api/gym/workouts/[id]/route";
import { POST as duplicate } from "@/app/api/gym/workouts/[id]/duplicate/route";
import { DELETE as removeStudent } from "@/app/api/gym/students/[id]/route";
import { GET as statement, POST as legacyPayment, PUT as legacyRecurrence } from "@/app/api/gym/students/[id]/finance/route";

const session = vi.hoisted(() => ({ workspaceId: "", userId: "" }));
vi.mock("@/lib/audited-request", () => ({ withAuditedRequest: (handler: unknown) => handler }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: session.userId } })), signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/modules/workspaces/application/guard", () => ({
  requireGymWorkspaceAccess: async (options: { workspaceId: string }) => {
    if (options.workspaceId !== session.workspaceId) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Sem vínculo.");
    return { workspaceId: session.workspaceId, userId: session.userId };
  },
  handleWorkspaceAccessError: (error: unknown) => error instanceof WorkspaceAccessError ? error.toResponse() : null,
}));

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável.");
afterAll(() => prisma.$disconnect());
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (url: string, method = "GET", data?: unknown) => new Request(`http://localhost${url}`, { method, ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
async function fixture(type: "GYM" | "PERSONAL" = "GYM") {
  const owner = await prisma.user.create({ data: { name: "Titular sintético", birthDate: new Date("1990-01-15") } });
  const workspace = await prisma.workspace.create({ data: { name: "Auditoria sintética", slug: randomUUID(), type, ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStudents: 50 } }, settings: { create: { timezone: "America/Sao_Paulo" } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Matriz" } });
  const user = await prisma.user.create({ data: { name: "Aluno homônimo", birthDate: new Date("1990-01-15"), weight: 999, height: 999, objective: "GLOBAL-NÃO-EXPOR" } });
  const student = await prisma.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: { registrationNumber: randomUUID(), healthData: { objective: "Objetivo local" } } } } });
  const receptionist = await prisma.user.create({ data: { name: "Recepção" } });
  const staff = await prisma.workspaceMember.create({ data: { userId: receptionist.id, workspaceId: workspace.id, role: "RECEPTIONIST", unitId: unit.id } });
  const group = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
  const exercise = await prisma.exercise.create({ data: { name: "Exercício oficial", muscleGroupId: group.id, isOfficial: true, status: "APPROVED" } });
  const fields = { workspaceId: workspace.id, name: "Modelo sintético", goal: "Força", difficulty: "Iniciante", duration: "30 min", groups: [], exercises: [{ exerciseId: exercise.id, sets: 3, reps: "10", rest: "60s" }] };
  const asOwner = () => Object.assign(session, { workspaceId: workspace.id, userId: owner.id });
  asOwner();
  return { owner, workspace, unit, user, student, receptionist, staff, exercise, fields, asOwner };
}

describe("Auditoria GYM — regressões HTTP e econômicas em PostgreSQL real", () => {
  it("GET, PUT, DELETE e duplicação recusam ID de treino de outra academia", async () => {
    const a = await fixture(), b = await fixture();
    const workout = await saveGymTemplateEditor(b.owner.id, b.fields);
    a.asOwner();
    const path = `/api/gym/workouts/${workout.id}`;
    const responses = [
      await GET(request(`${path}?workspaceId=${a.workspace.id}`), params(workout.id)),
      await PUT(request(path, "PUT", { ...a.fields, name: "Tentativa" }), params(workout.id)),
      await DELETE(request(`${path}?workspaceId=${a.workspace.id}`, "DELETE"), params(workout.id)),
      await duplicate(request(`${path}/duplicate`, "POST", { workspaceId: a.workspace.id }), params(workout.id)),
    ];
    expect(responses.map(response => response.status)).toEqual([404, 404, 404, 404]);
    expect((await prisma.workout.findUniqueOrThrow({ where: { id: workout.id } })).isActive).toBe(true);
    expect(await prisma.workout.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });
  it("a API de biblioteca não lê ficha individual; exclusão de modelo é reversível e preserva linhas", async () => {
    const f = await fixture(), template = await saveGymTemplateEditor(f.owner.id, f.fields);
    const prescribed = await prisma.workout.create({ data: { workspaceId: f.workspace.id, studentId: f.user.id, creatorId: f.owner.id, name: "Individual", goal: "Força", difficulty: "Iniciante", duration: "30 min" } });
    expect((await GET(request(`/api/gym/workouts/${prescribed.id}?workspaceId=${f.workspace.id}`), params(prescribed.id))).status).toBe(404);
    expect((await DELETE(request(`/api/gym/workouts/${template.id}?workspaceId=${f.workspace.id}`, "DELETE"), params(template.id))).status).toBe(204);
    expect((await prisma.workout.findUniqueOrThrow({ where: { id: template.id } })).isActive).toBe(false);
    expect(await prisma.workoutExercise.count({ where: { workoutId: template.id } })).toBe(1);
  });
  it("DELETE da lista não apaga funcionário e exclui aluno permanentemente com suas faturas e treinos", async () => {
    const f = await fixture();
    expect((await removeStudent(request(`/api/gym/students/${f.staff.id}?workspaceId=${f.workspace.id}`, "DELETE"), params(f.staff.id))).status).toBe(404);
    const invoice = await issueManualInvoice({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.student.id, idempotencyKey: randomUUID(), title: "Histórico", dueDate: "2027-01-10", items: [{ itemType: "SERVICE", description: "Serviço", unitPriceInCents: 10000 }] });
    expect((await removeStudent(request(`/api/gym/students/${f.student.id}?workspaceId=${f.workspace.id}`, "DELETE"), params(f.student.id))).status).toBe(200);
    expect(await prisma.gymStudentProfile.findUnique({ where: { memberId: f.student.id } })).toBeNull();
    expect(await prisma.gymInvoice.findUnique({ where: { id: invoice.id } })).toBeNull();
    expect(await prisma.workspaceMember.findUnique({ where: { id: f.student.id } })).toBeNull();
    expect((await prisma.workspaceMember.findUniqueOrThrow({ where: { id: f.staff.id } })).isActive).toBe(true);
  });
  it("ficha usa faturas por vínculo; homônimo e pagamento legado não alteram o extrato", async () => {
    const f = await fixture();
    const invoice = await issueManualInvoice({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.student.id, idempotencyKey: randomUUID(), title: "Mensalidade", dueDate: "2027-01-10", items: [{ itemType: "SERVICE", description: "Serviço", unitPriceInCents: 15000 }] });
    await prisma.workspacePayment.create({ data: { workspaceId: f.workspace.id, studentName: "Aluno homônimo", planName: "Legado", amount: 99999, status: "pago", method: "PIX" } });
    const response = await statement(request(`/api/gym/students/${f.student.id}/finance?workspaceId=${f.workspace.id}`), params(f.student.id));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totals).toMatchObject({ outstandingInCents: "15000", receivedInCents: "0" });
    expect(data.invoices.map((item: { id: string }) => item.id)).toEqual([invoice.id]);
    expect((await legacyPayment(request("/api/gym/students/x/finance", "POST", { workspaceId: f.workspace.id }))).status).toBe(410);
    expect((await legacyRecurrence(request("/api/gym/students/x/finance", "PUT", { workspaceId: f.workspace.id }))).status).toBe(410);
    expect(await prisma.workspacePayment.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
  it("recepção não recebe saúde; gestão recebe medidas e objetivo da academia atual", async () => {
    const f = await fixture();
    await prisma.studentProgress.create({ data: { workspaceId: f.workspace.id, studentId: f.user.id, weight: 80, height: 175 } });
    const receptionist = await getGymStudent(f.workspace.id, f.student.id, { userId: f.receptionist.id } as never);
    expect(receptionist).not.toHaveProperty("weight"); expect(receptionist).not.toHaveProperty("objective");
    const owner = await getGymStudent(f.workspace.id, f.student.id, { userId: f.owner.id } as never);
    expect(owner).toMatchObject({ weight: 80, height: 175, objective: "Objetivo local" });
    await prisma.gymStudentProfile.update({ where: { memberId: f.student.id }, data: { privacyRestrictedAt: new Date() } });
    expect(await getGymStudent(f.workspace.id, f.student.id, { userId: f.owner.id } as never)).not.toHaveProperty("weight");
  });
  it("contrato aceito é imutável por PATCH e recepção não publica preço de catálogo", async () => {
    const f = await fixture();
    const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Plano", versions: { create: { name: "Plano", priceInCents: BigInt(10000), termsText: "Condições" } } }, include: { versions: true } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.student.id, unitId: f.unit.id, planVersionId: plan.versions[0].id, priceInCents: BigInt(10000), status: "ACTIVE", acceptance: { create: { workspaceId: f.workspace.id, signerUserId: f.user.id, termsSnapshot: "Preço aceito", termsVersion: "1" } } } });
    await expect(updateGymEnrollment({ workspaceId: f.workspace.id, enrollmentId: enrollment.id, actorUserId: f.receptionist.id, customPriceInCents: 1 })).rejects.toMatchObject({ code: "ENROLLMENT_REVISION_REQUIRED" });
    expect((await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).priceInCents).toBe(BigInt(10000));
    await expect(new GymPlanService().createPlan({ workspaceId: f.workspace.id, actorUserId: f.receptionist.id, name: "Preço contornado", priceInCents: 1, billingCycle: "MONTHLY", termsText: "Termos" })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("uma compra GYM credita somente a academia; PERSONAL credita somente o usuário; replay é neutro", async () => {
    for (const type of ["GYM", "PERSONAL"] as const) {
      const f = await fixture(type), purchase = await prisma.creditPurchase.create({ data: { workspaceId: f.workspace.id, userId: f.owner.id, amountInCents: 1000, credits: 100 } });
      const beforeUser = (await prisma.user.findUniqueOrThrow({ where: { id: f.owner.id } })).importCredits;
      const beforeWorkspace = (await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).importCredits;
      await prisma.$transaction(tx => confirmCreditPurchase(tx, purchase.id));
      expect(await prisma.$transaction(tx => confirmCreditPurchase(tx, purchase.id))).toBe(false);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: f.owner.id } })).importCredits - beforeUser).toBe(type === "GYM" ? 0 : 100);
      expect((await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).importCredits - beforeWorkspace).toBe(type === "GYM" ? 100 : 0);
    }
  });
  it("licença GYM ativa/renova/cancela sem criar assinatura pessoal e recusa valor divergente", async () => {
    const f = await fixture(), plan = await prisma.plan.create({ data: { name: "Licença GYM", price: 100, type: "GYM" } });
    const order = await prisma.transaction.create({ data: { userId: f.owner.id, workspaceId: f.workspace.id, platformPlanId: plan.id, expectedAmountInCents: 10000, amount: 100, status: "PENDING" } });
    const payload = (id: string, event: string, amount = 10000) => ({ id, event, devMode: false, data: { payment: { id: randomUUID(), amount }, subscription: { id: "subs_" + order.id, externalId: order.id, amount } } });
    const first = payload(randomUUID(), "subscription.completed");
    await processGymPlatformWebhook(first, first.data.subscription, first.data.subscription.id);
    expect(await prisma.subscription.findUnique({ where: { userId: f.owner.id } })).toBeNull();
    const before = await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } });
    const renew = payload(randomUUID(), "subscription.renewed");
    await processGymPlatformWebhook(renew, renew.data.subscription, renew.data.subscription.id);
    const renewed = await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } });
    expect(renewed.endDate!.getTime()).toBeGreaterThan(before.endDate!.getTime());
    await processGymPlatformWebhook(renew, renew.data.subscription, renew.data.subscription.id);
    expect((await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } })).endDate).toEqual(renewed.endDate);
    const resend = { ...renew, id: randomUUID() };
    await processGymPlatformWebhook(resend, resend.data.subscription, resend.data.subscription.id);
    expect((await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } })).endDate).toEqual(renewed.endDate);
    const invalid = payload(randomUUID(), "subscription.renewed", 1);
    await expect(processGymPlatformWebhook(invalid, invalid.data.subscription, invalid.data.subscription.id)).rejects.toThrow("GYM_PAYMENT_AMOUNT_MISMATCH");
    const obsoleteOrder = await prisma.transaction.create({ data: { userId: f.owner.id, workspaceId: f.workspace.id, platformPlanId: plan.id, expectedAmountInCents: 10000, amount: 100, status: "APPROVED" } });
    const refund = { id: randomUUID(), event: "checkout.refunded", data: { checkout: { externalId: obsoleteOrder.id } } };
    await processGymPlatformWebhook(refund, refund.data.checkout);
    expect((await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } })).status).toBe("ACTIVE");
    const cancel = payload(randomUUID(), "subscription.cancelled");
    await processGymPlatformWebhook(cancel, cancel.data.subscription, cancel.data.subscription.id);
    expect((await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: f.workspace.id } })).status).toBe("CANCELED");
  });
  it("commit genérico recusa academia; commit GYM cria perfil/unidade e não sobrescreve saúde global", async () => {
    const f = await fixture();
    const job = await prisma.importJob.create({ data: { workspaceId: f.workspace.id, createdByUserId: f.owner.id, status: "READY", previewValidated: true, records: { create: { entityType: "STUDENT", temporaryEntityId: "student-1", source: "DETERMINISTIC", status: "READY", reviewStatus: "APPROVED", normalizedData: { name: "Novo aluno", email: `${randomUUID()}@example.invalid`, birthDate: "1990-01-15", weight: 81, objective: "Objetivo importado" } } } } });
    await expect(commitImportJob(job.id, f.workspace.id, job.commitVersion)).rejects.toMatchObject({ code: "INVALID_IMPORT" });
    await commitGymMigrationJob({ workspaceId: f.workspace.id, actorUserId: f.owner.id, jobId: job.id, commitVersion: job.commitVersion, unitId: f.unit.id });
    const imported = await prisma.workspaceMember.findFirstOrThrow({ where: { workspaceId: f.workspace.id, user: { name: "Novo aluno" } }, include: { studentProfile: true, user: true } });
    expect(imported.unitId).toBe(f.unit.id); expect(imported.studentProfile).not.toBeNull();
    expect(imported.user.weight).toBeNull();
    expect(await prisma.studentProgress.findFirst({ where: { workspaceId: f.workspace.id, studentId: imported.userId, weight: 81 } })).not.toBeNull();
  });
  it("GYM e PERSONAL aceitam as mesmas fontes e usam a mesma extração por IA", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: '{"students":[]}', usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } });
    const client = vi.spyOn(geminiClient, "getGeminiClient").mockReturnValue({ models: { generateContent } } as unknown as ReturnType<typeof geminiClient.getGeminiClient>);
    try {
      for (const type of ["GYM", "PERSONAL"] as const) {
        const f = await fixture(type);
        const job = await prisma.importJob.create({ data: { workspaceId: f.workspace.id, createdByUserId: f.owner.id } });
        for (const sourceType of ["IMAGE", "PDF", "TEXT"] as const) await persistImportSource({ importJobId: job.id, type: sourceType, textContent: "Material sintético" }, f.workspace.id);
        const result = await new GeminiMigrationExtractor().extract({ importJobId: job.id, userId: f.owner.id, textContent: "Treino A", inlineFiles: [{ mimeType: "image/png", dataBase64: "c3ludGhldGlj" }, { mimeType: "application/pdf", dataBase64: "c3ludGhldGlj" }] });
        expect(result.students).toEqual([]);
        expect(await prisma.importSource.count({ where: { importJobId: job.id } })).toBe(3);
      }
      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(generateContent.mock.calls[0][0].contents).toEqual(generateContent.mock.calls[1][0].contents);
      expect(generateContent.mock.calls[0][0].contents[0].parts).toEqual([{ text: "DOCUMENTO TEXTUAL:\nTreino A" }, { inlineData: { mimeType: "image/png", data: "c3ludGhldGlj" } }, { inlineData: { mimeType: "application/pdf", data: "c3ludGhldGlj" } }]);
    } finally { client.mockRestore(); }
  });
  it("limite compartilhado admite apenas cinco de vinte chamadas concorrentes; limpeza preserva janela ativa", async () => {
    const randomKey = randomUUID();
    vi.stubEnv("RATE_LIMIT_STORE", "postgres");
    try {
      const result = await Promise.all(Array.from({ length: 20 }, () => rateLimit(randomKey, 5, 3600000)));
      expect(result.filter(row => row.success)).toHaveLength(5);
      await prisma.rateLimitBucket.create({ data: { key: "expired-" + randomUUID(), count: 1, resetAt: new Date(0) } });
      expect(await pruneRateLimitBuckets()).toBeGreaterThanOrEqual(1);
      expect((await rateLimit(randomKey, 5, 3600000)).success).toBe(false);
    } finally { vi.unstubAllEnvs(); }
  });
  it("dashboard usa dia da academia e hora do acesso; recusas/saídas não contam e o risco ordena a última entrada", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-05T02:30:00Z"));
    try {
      const f = await fixture();
      const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Mensal", versions: { create: { name: "Mensal", priceInCents: BigInt(1000), termsText: "Sintético" } } }, include: { versions: true } });
      const add = async (memberId: string, when: string) => {
        await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, studentMemberId: memberId, planVersionId: plan.versions[0].id, status: "ACTIVE", activatedAt: new Date("2026-09-01"), startDate: new Date("2026-09-01"), endDate: new Date("2026-10-01"), autoRenew: true, priceInCents: BigInt(1000) } });
        await prisma.gymAccessLog.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, studentMemberId: memberId, accessedAt: new Date(when) } });
      };
      await add(f.student.id, "2026-11-05T01:30:00Z");
      await prisma.gymAccessLog.createMany({ data: [
        { workspaceId: f.workspace.id, unitId: f.unit.id, studentMemberId: f.student.id, accessedAt: new Date("2026-11-04T01:30:00Z") },
        { workspaceId: f.workspace.id, unitId: f.unit.id, studentMemberId: f.student.id, granted: false },
        { workspaceId: f.workspace.id, unitId: f.unit.id, studentMemberId: f.student.id, direction: "EXIT" },
      ] });
      const old = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, role: "STUDENT", userId: (await prisma.user.create({ data: { name: "Ausente recente" } })).id, createdAt: new Date("2026-01-01") } });
      const oldest = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, role: "STUDENT", userId: (await prisma.user.create({ data: { name: "Ausente há mais tempo" } })).id } });
      await add(old.id, "2026-10-20T12:00:00Z"); await add(oldest.id, "2026-09-20T12:00:00Z");
      const data = await getGymDashboardMetrics({ workspaceId: f.workspace.id, actorUserId: f.owner.id });
      expect(data.checkinsTodayCount).toBe(1);
      expect(data.topStudentsWeek.map(row => ({ id: row.id, sessions: row.sessions }))).toEqual([{ id: f.student.id, sessions: 2 }]);
      expect(data.inactiveStudents.map(row => row.id)).toEqual([oldest.id, old.id]);
    } finally { vi.useRealTimers(); }
  });
});
