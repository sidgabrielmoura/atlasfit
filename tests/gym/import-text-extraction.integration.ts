import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { processImportJob } from "@/lib/migration/extraction.service";
import { getReviewRecords } from "@/lib/migration/review.service";
import { publishToChannel } from "@/lib/ably";
import { publishImportCreditBalance } from "@/lib/migration/credit-realtime.service";

const provider = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/gemini/client", () => ({ getGeminiClient: () => ({ models: { generateContent: provider.generate } }) }));
vi.mock("@/lib/ably", () => ({ publishToChannel: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/service", () => ({ NotificationService: { sendNotification: vi.fn(async () => {}) } }));
vi.mock("@/lib/emails/service", () => ({ EmailService: { sendImportJobCompletedTrainer: vi.fn(async () => {}) } }));
const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("Requires disposable PostgreSQL.");
afterAll(() => prisma.$disconnect());

async function fixture() {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", name: "Texto sintético", slug: randomUUID(), ownerId: owner.id, importCredits: 1000 } });
  const email = `${randomUUID()}@example.invalid`;
  const text = `aluno: Aluno Demonstração\ntelefone: 11999999999\nemail:${email}\n12345678909\n\nsegunda: peito e tríceps, supino barra reta 4x12, supino inclinado 4x10, tríceps pulley 4x12, tríceps testa 4x10`;
  const job = await prisma.importJob.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, sources: { create: { type: "TEXT", textContent: text } } } });
  return { job, workspace, email };
}

describe("Texto bruto GYM — da fonte aos dados dos cards", () => {
  it("preserva aluno, contato, CPF, segunda-feira e os quatro exercícios na revisão", async () => {
    const f = await fixture();
    const exercises = ["supino barra reta", "supino inclinado", "tríceps pulley", "tríceps testa"].map((name, index) => ({ name, sets: 4, reps: index % 2 ? "10" : "12" }));
    provider.generate.mockResolvedValue({ text: JSON.stringify({ students: [{ name: "Aluno Demonstração", email: f.email, phone: "[ATLAS_CONTACT_1]", cpfCnpj: "[ATLAS_DOCUMENT_2]", workouts: [{ name: "peito e tríceps", dayOfWeek: 1, exercises }] }] }), usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } });
    const result = await processImportJob(f.job.id, f.workspace.id);
    expect(result?.status).toBe("REVIEW");
    const { records } = await getReviewRecords({ jobId: f.job.id });
    expect(records).toHaveLength(2);
    expect(records.find(record => record.entityType === "STUDENT")?.normalizedData).toMatchObject({ name: "Aluno Demonstração", email: f.email, phone: "5511999999999", cpfCnpj: "12345678909" });
    expect(records.find(record => record.entityType === "WORKOUT")?.normalizedData).toMatchObject({ name: "peito e tríceps", dayOfWeek: 1, exercises: exercises.map(exercise => expect.objectContaining(exercise)) });
    expect(provider.generate.mock.calls[0][0].contents[0].parts[0].text).toContain("supino barra reta 4x12");
    const events = vi.mocked(publishToChannel).mock.calls;
    const debit = events.find(([channel, name]) => channel === `migration:${f.workspace.id}` && name === "import:credits_updated");
    const saved = await prisma.importJob.findUniqueOrThrow({ where: { id: f.job.id } });
    expect(debit?.[2]).toMatchObject({ workspaceId: f.workspace.id, quotaBalance: { credits: 1000 - saved.creditsConsumed, remaining: 1000 - saved.creditsConsumed } });
    const progress = events.filter(([channel, name]) => channel === `migration:${f.workspace.id}` && name === "job_updated").map(([, , data]) => data as any);
    expect(progress).toContainEqual(expect.objectContaining({ status: "PROCESSING", processingStep: "NORMALIZING", creditsConsumed: saved.creditsConsumed }));
    expect(progress.at(-1)).toMatchObject({ status: "REVIEW", progressPercentage: 100, creditsConsumed: saved.creditsConsumed });
  });
  it("resposta vazia tenta o fallback e não cria cards nem desconta créditos se continuar vazia", async () => {
    const f = await fixture(); provider.generate.mockReset().mockResolvedValue({ text: '{"students":[{"temporaryId":"student_1","workouts":[{"temporaryId":"workout_1"}]}]}' });
    await expect(processImportJob(f.job.id, f.workspace.id)).rejects.toThrow();
    expect(provider.generate).toHaveBeenCalledTimes(2);
    expect(await prisma.importRecord.count({ where: { importJobId: f.job.id } })).toBe(0);
    expect((await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).importCredits).toBe(1000);
    expect((await prisma.importJob.findUniqueOrThrow({ where: { id: f.job.id } })).status).toBe("FAILED");
  });
  it("saldo do personal é publicado somente no canal privado do usuário", async () => {
    const owner = await prisma.user.create({ data: { importCredits: 73 } });
    const workspace = await prisma.workspace.create({ data: { type: "PERSONAL", name: "Saldo privado sintético", slug: randomUUID(), ownerId: owner.id } });
    vi.mocked(publishToChannel).mockClear();
    await publishImportCreditBalance(workspace.id, owner.id);
    expect(publishToChannel).toHaveBeenCalledExactlyOnceWith(`user:${owner.id}`, "import:credits_updated", expect.objectContaining({ workspaceId: workspace.id, quotaBalance: expect.objectContaining({ credits: 73 }) }));
  });
});
