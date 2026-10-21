import { randomUUID, createHmac } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { confirmCreditPurchase, settleCreditPurchase, claimAbacateEvent } from "@/modules/payments/abacate-confirmation";
import { personalPaymentSummary } from "@/lib/personal-payment-summary";
import { personalTrainingSummary } from "@/lib/personal-training-summary";
import { studentTrainingSummary, studentProgressSummary } from "@/lib/student-training-summary";
import { retainImportSourcePayloads } from "@/lib/migration/source-retention";
import { recordCronResult } from "@/lib/cron-health";
import { walletTransactionsQuery } from "@/modules/payments/wallet-transactions-query";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";
import { getGymDashboardMetrics } from "@/modules/workspaces/application/gym-dashboard-metrics";
import { POST as renewalWebhook } from "@/app/api/webhooks/abacatepay/route";
import { commitImportJob } from "@/lib/migration/commit.service";
import { GET as chatMessages } from "@/app/api/chat/messages/route";
import { GET as chatAvatar } from "@/app/api/chat/avatar/route";
import { processRecurringPayments } from "@/lib/recurrence";

vi.mock("@/lib/ably", () => ({ publishToChannel: vi.fn(async () => {}), ablyRest: null }));
const identity = vi.hoisted(() => ({ id: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => identity.id ? { user: { id: identity.id, role: "TRAINER" } } : null) }));
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Requires the disposable local test database.");
afterAll(async () => { await prisma.$disconnect(); });

async function personal(type: "PERSONAL" | "GYM" = "PERSONAL") {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: "Synthetic owner", role: "TRAINER" } });
  const workspace = await prisma.workspace.create({ data: { ownerId: user.id, name: "Synthetic workspace", slug: randomUUID(), type, ...(type === "GYM" ? { subscription: { create: { status: "ACTIVE", maxStaff: 20, maxUnits: 5 } } } : {}) } });
  await prisma.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" } });
  return { user, workspace };
}

describe("database efficiency — real PostgreSQL invariants", () => {
  it("credits: concurrent reconciliation/webhooks have one winner and rollback permits a retry", async () => {
    const f = await personal();
    const purchase = await prisma.creditPurchase.create({ data: { userId: f.user.id, workspaceId: f.workspace.id, credits: 25, amountInCents: 1000 } });
    await expect(prisma.$transaction(async tx => { await confirmCreditPurchase(tx, purchase.id); throw new Error("rollback"); })).rejects.toThrow("rollback");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).importCredits).toBe(0);
    const results = await Promise.all(Array.from({ length: 20 }, () => settleCreditPurchase(purchase.id)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).importCredits).toBe(25);
    expect(await settleCreditPurchase(purchase.id)).toBe(false);
  });

  it("renewal: a repeated event and a manual resend of the same payment extend only once", async () => {
    const f = await personal();
    const plan = await prisma.plan.create({ data: { name: "Synthetic plan", price: 99, interval: "month" } });
    const endDate = new Date(Date.now() + 86400000);
    const subscription = await prisma.subscription.create({ data: { userId: f.user.id, planId: plan.id, status: "active", endDate, abacateSubscriptionId: `subs_${randomUUID()}` } });
    const payload = { id: randomUUID(), event: "subscription.renewed", devMode: false, data: { payment: { id: randomUUID() }, subscription: { id: subscription.abacateSubscriptionId, metadata: { userId: f.user.id } } } };
    const send = (body: typeof payload) => { const raw = JSON.stringify(body); return renewalWebhook(new Request("https://example.invalid/api/webhooks/abacatepay", { method: "POST", body: raw, headers: { "x-webhook-signature": createHmac("sha256", process.env.ABACATEPAY_WEBHOOK_SECRET!).update(raw).digest("hex") } })); };
    const responses = await Promise.all(Array.from({ length: 6 }, () => send(payload)));
    expect(responses.every(response => response.status === 200)).toBe(true);
    expect((await send({ ...payload, id: randomUUID() })).status).toBe(200);
    const current = await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } });
    const expected = new Date(endDate); expected.setDate(expected.getDate() + 30);
    expect(current.endDate?.toISOString()).toBe(expected.toISOString());
    expect(await prisma.transaction.count({ where: { userId: f.user.id } })).toBe(1);
    // Different legitimate cycles for one account must serialize, rather than losing one extension.
    const next = { ...payload, id: randomUUID(), data: { ...payload.data, payment: { id: randomUUID() } } };
    const later = { ...payload, id: randomUUID(), data: { ...payload.data, payment: { id: randomUUID() } } };
    expect((await Promise.all([send(next), send(later)])).every(response => response.status === 200)).toBe(true);
    expected.setDate(expected.getDate() + 60);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } })).endDate?.toISOString()).toBe(expected.toISOString());
  });

  it("receipts reject changed facts and are rolled back with failed financial effects", async () => {
    const payload = { id: randomUUID(), event: "subscription.renewed", data: { amount: 1000 } };
    await expect(prisma.$transaction(async tx => { await claimAbacateEvent(tx, payload); throw new Error("rollback"); })).rejects.toThrow("rollback");
    expect(await prisma.$transaction(tx => claimAbacateEvent(tx, payload))).toBe(true);
    expect(await prisma.$transaction(tx => claimAbacateEvent(tx, payload))).toBe(false);
    await expect(prisma.$transaction(tx => claimAbacateEvent(tx, { ...payload, data: { amount: 2000 } }))).rejects.toThrow("FINGERPRINT_CONFLICT");
  });

  it("payment aggregates preserve all-time fallback and seven complete month buckets", async () => {
    const f = await personal(), now = new Date("2026-10-19T12:00:00Z");
    await prisma.workspacePayment.createMany({ data: [
      { workspaceId: f.workspace.id, studentName: "Synthetic", planName: "Plan", method: "PIX", status: "pago", amount: 100, createdAt: new Date("2026-10-01T12:00:00Z") },
      { workspaceId: f.workspace.id, studentName: "Synthetic", planName: "Plan", method: "PIX", status: "pago", amount: 50, createdAt: new Date("2026-04-15T12:00:00Z") },
      { workspaceId: f.workspace.id, studentName: "Synthetic", planName: "Plan", method: "PIX", status: "atrasado", amount: 25, createdAt: now },
    ] });
    const result = await personalPaymentSummary(f.workspace.id, now);
    expect(result.mrr).toBe(100); expect(result.avgTicket).toBe(100); expect(result.churnRate).toBe(50);
    expect(result.months).toHaveLength(7); expect(result.months[0].revenue).toBe(50);
    const next = await personalPaymentSummary(f.workspace.id, new Date("2026-11-19T12:00:00Z"));
    expect(next.avgTicket).toBe(75); expect(next.churnRate).toBe(33.3);
  });

  it("training aggregates ignore malformed JSON, preserve streak history and use the maximum set", async () => {
    const f = await personal();
    const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
    const exercise = await prisma.exercise.create({ data: { name: "Synthetic squat", muscleGroupId: muscle.id } });
    const workout = await prisma.workout.create({ data: { workspaceId: f.workspace.id, studentId: f.user.id, name: "Synthetic", goal: "Strength", difficulty: "Beginner", duration: "30 min", exercises: { create: { exerciseId: exercise.id, sets: 3, reps: "10", rest: "60s", order: 0 } } }, include: { exercises: true } });
    const now = new Date(), yesterday = new Date(now.getTime() - 86400000);
    await prisma.workoutLog.createMany({ data: [
      { workspaceId: f.workspace.id, workoutId: workout.id, studentId: f.user.id, completedAt: yesterday, createdAt: yesterday, effortScore: 3, loads: { [workout.exercises[0].id]: ["40", "20"] } },
      { workspaceId: f.workspace.id, workoutId: workout.id, studentId: f.user.id, completedAt: now, createdAt: now, effortScore: 4, loads: { [workout.exercises[0].id]: ["50kg", "bad", "30"] } },
      { workspaceId: f.workspace.id, workoutId: workout.id, studentId: f.user.id, loads: ["malformed"] },
    ] });
    const summary = await personalTrainingSummary(f.workspace.id, new Date(Date.now() + 1000));
    expect(summary.records[0].maxLoad).toBe(50);
    expect(summary.feedback.reduce((sum, row) => sum + row._count._all, 0)).toBe(2);
    const student = await studentTrainingSummary(f.workspace.id, f.user.id);
    expect(student.streak).toBe(2); expect(student.bestStreak).toBe(2);
    expect(student.records[0]).toMatchObject({ maxLoad: 50, previousBest: 40 });
    await prisma.studentProgress.createMany({ data: [
      { workspaceId: f.workspace.id, studentId: f.user.id, date: new Date("2020-01-01T12:00:00Z"), weight: 100 },
      { workspaceId: f.workspace.id, studentId: f.user.id, date: new Date("2026-10-01T12:00:00Z"), weight: 90 },
      { workspaceId: f.workspace.id, studentId: f.user.id, date: new Date("2026-10-19T12:00:00Z"), weight: 80 },
    ] });
    const progress = await studentProgressSummary(f.workspace.id, f.user.id);
    expect(progress.first?.weight).toBe(100); expect(progress.points).toHaveLength(2); expect(progress.points.at(-1)?.weight).toBe(80);
  });

  it("heartbeat storage is bounded and retention preserves review jobs, hashes and metadata", async () => {
    const auditBefore = await prisma.auditLog.count({ where: { entity: "SYSTEM_JOB", entityId: "deliveries" } });
    for (let i = 0; i < 5; i++) await recordCronResult("deliveries", i !== 4, i);
    expect(await prisma.scheduledJobState.count({ where: { id: "deliveries" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entity: "SYSTEM_JOB", entityId: "deliveries" } })).toBe(auditBefore);
    const f = await personal(), past = new Date(Date.now() - 120 * 86400000);
    const cancelled = await prisma.importJob.create({ data: { workspaceId: f.workspace.id, status: "CANCELLED", updatedAt: past, sources: { create: { type: "TEXT", textContent: "synthetic cancelled input", sha256: "retained-hash" } } } });
    const review = await prisma.importJob.create({ data: { workspaceId: f.workspace.id, status: "REVIEW", updatedAt: past, sources: { create: { type: "TEXT", textContent: "synthetic review input" } } } });
    process.env.IMPORT_SOURCE_RETENTION_DAYS = "90";
    await retainImportSourcePayloads();
    expect(await prisma.importSource.findFirst({ where: { importJobId: cancelled.id }, select: { textContent: true, sha256: true } })).toEqual({ textContent: null, sha256: "retained-hash" });
    expect((await prisma.importSource.findFirstOrThrow({ where: { importJobId: review.id } })).textContent).not.toBeNull();
    delete process.env.IMPORT_SOURCE_RETENTION_DAYS;
  });

  it("wallet pagination reaches rows beyond the old 200-record cutoff and respects account scope", async () => {
    const f = await personal();
    const account = await prisma.paymentProviderAccount.create({ data: { personalUserId: f.user.id, provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID() } });
    await prisma.studentBilling.createMany({ data: Array.from({ length: 230 }, (_, i) => ({ providerAccountId: account.id, studentUserId: f.user.id, idempotencyKey: randomUUID(), billingReference: randomUUID(), title: `Synthetic ${i}`, grossAmountInCents: BigInt(1000), personalNetEstimatedInCents: BigInt(900), feeRuleVersionId: "test", paymentMethod: "PIX" as const, dueDate: new Date(), status: "PENDING" as const, createdAt: new Date(Date.now() - i * 1000) })) });
    const query = { accountId: account.id, page: 15, pageSize: 15, search: "", typeFilter: "ALL", statusFilter: "ALL", methodFilter: "ALL" };
    const result = await walletTransactionsQuery(query);
    expect(result.pagination.totalItems).toBe(230); expect(result.transactions).toHaveLength(15);
    expect((await walletTransactionsQuery({ ...query, accountId: randomUUID() })).transactions).toHaveLength(0);
    expect((await walletTransactionsQuery({ ...query, page: 1, search: "Synthetic 229" })).transactions).toHaveLength(1);
  });

  it("personal token capabilities are batched, selected-tenant only and immediately reflect membership revocation", async () => {
    const f = await personal();
    const conversation = await prisma.conversation.create({ data: { workspaceId: f.workspace.id, type: "DIRECT", participants: { create: { userId: f.user.id } } } });
    const allowed = await resolveRealtimeCapabilities(f.user.id, f.workspace.id);
    expect(allowed[`conversation:${conversation.id}`]).toEqual(["subscribe"]);
    expect((await resolveRealtimeCapabilities(f.user.id, null))[`conversation:${conversation.id}`]).toBeUndefined();
    await prisma.workspaceMember.updateMany({ where: { workspaceId: f.workspace.id, userId: f.user.id }, data: { isActive: false } });
    expect((await resolveRealtimeCapabilities(f.user.id, f.workspace.id))[`conversation:${conversation.id}`]).toBeUndefined();
  });

  it("every gym dashboard block respects unit, portfolio and financial scope, including split receipts", async () => {
    const f = await personal("GYM");
    const a = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "A" } });
    const b = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "B" } });
    const actor = await prisma.user.create({ data: { name: "Synthetic staff" } });
    const staff = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: actor.id, unitId: a.id, role: "FINANCE" } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Scoped plan" } });
    const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Scoped plan", priceInCents: BigInt(1000), durationDays: 365, termsText: "Synthetic terms" } });
    const invoices = [];
    for (const [i, unit] of [a, b, a].entries()) {
      const user = await prisma.user.create({ data: { name: `Scoped synthetic ${i}` } });
      const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: user.id, unitId: unit.id, role: "STUDENT", assignedStaffId: i === 0 ? staff.id : null, streak: 3, createdAt: new Date(Date.now() - 30 * 86400000), studentProfile: { create: {} } } });
      const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: member.id, unitId: unit.id, planVersionId: version.id, priceInCents: BigInt(1000), startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000 * 30), status: "ACTIVE", accessGranted: true } });
      invoices.push(await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, enrollmentId: enrollment.id, studentMemberId: member.id, studentUserId: user.id, invoiceNumber: randomUUID(), title: "Synthetic", dueDate: new Date(), subtotalInCents: BigInt(1000), totalInCents: BigInt(1000), balanceRemainingInCents: BigInt(1000), payerName: "Synthetic", createdByUserId: f.user.id } }));
      await prisma.gymAccessLog.create({ data: { workspaceId: f.workspace.id, unitId: unit.id, studentMemberId: member.id } });
    }
    await prisma.gymPayment.create({ data: { workspaceId: f.workspace.id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), status: "CONFIRMED", paymentMethod: "CASH", amountInCents: BigInt(1600), paidAt: new Date(), payerName: "Synthetic", receivedByUserId: f.user.id, allocations: { create: [{ invoiceId: invoices[0].id, allocatedAmountInCents: BigInt(600) }, { invoiceId: invoices[1].id, allocatedAmountInCents: BigInt(1000) }] } } });
    const finance = await getGymDashboardMetrics({ workspaceId: f.workspace.id, actorUserId: actor.id });
    expect(finance.revenueHistory.at(-1)?.current).toBe(6);
    expect(JSON.stringify(finance.recentActivity)).not.toContain("Scoped synthetic 1");
    await prisma.workspaceMember.update({ where: { id: staff.id }, data: { role: "TRAINER" } });
    const trainer = await getGymDashboardMetrics({ workspaceId: f.workspace.id, actorUserId: actor.id });
    expect(trainer.overview.access.financial).toBe(false);
    expect(trainer.planDistribution.every(plan => plan.revenue === 0)).toBe(true);
    expect(trainer.revenueHistory.every(month => !month.current && !month.previous)).toBe(true);
    expect(trainer.checkinsTodayCount).toBe(1);
    const output = JSON.stringify(trainer);
    expect(output).not.toContain("Scoped synthetic 1"); expect(output).not.toContain("Scoped synthetic 2");
  });

  it("import confirmation is atomic and replay-safe without password hashing in its transaction", async () => {
    const f = await personal();
    const email = `${randomUUID()}@example.invalid`;
    const job = await prisma.importJob.create({ data: { workspaceId: f.workspace.id, createdByUserId: f.user.id, status: "READY", previewValidated: true, records: { create: { entityType: "STUDENT", temporaryEntityId: "s1", status: "READY", reviewStatus: "APPROVED", normalizedData: { name: "Synthetic import", email, birthDate: "1990-01-01" } } } } });
    const results = await Promise.allSettled([commitImportJob(job.id, f.workspace.id, 1), commitImportJob(job.id, f.workspace.id, 1)]);
    expect(results.some(result => result.status === "fulfilled")).toBe(true);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.password).toBeNull(); expect(user.setupTokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    expect((await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("COMPLETED");
    expect(await commitImportJob(job.id, f.workspace.id, 1)).toMatchObject({ alreadyCommitted: true });
  });

  it("chat pages with equal timestamps neither skip nor duplicate messages and enforce a maximum", async () => {
    const f = await personal(); identity.id = f.user.id;
    const conversation = await prisma.conversation.create({ data: { workspaceId: f.workspace.id, participants: { create: { userId: f.user.id } } } });
    const createdAt = new Date();
    await prisma.message.createMany({ data: Array.from({ length: 130 }, (_, i) => ({ id: randomUUID(), conversationId: conversation.id, senderId: f.user.id, content: `Synthetic ${i}`, createdAt })) });
    let cursor = ""; const seen = new Set<string>();
    do {
      const response = await chatMessages(new Request(`https://example.invalid/api/chat/messages?conversationId=${conversation.id}&limit=30${cursor ? `&cursor=${cursor}` : ""}`));
      expect(response.status).toBe(200);
      const page = await response.json();
      for (const message of page.messages) { expect(seen.has(message.id)).toBe(false); seen.add(message.id); }
      cursor = page.nextCursor || "";
    } while (cursor);
    expect(seen.size).toBe(130);
    const large = await chatMessages(new Request(`https://example.invalid/api/chat/messages?conversationId=${conversation.id}&limit=99999`));
    expect((await large.json()).messages).toHaveLength(100);
    await prisma.user.update({ where: { id: f.user.id }, data: { image: "data:image/png;base64,dGVzdA==" } });
    const allowedAvatar = await chatAvatar(new Request(`https://example.invalid/api/chat/avatar?conversationId=${conversation.id}&userId=${f.user.id}`));
    expect(allowedAvatar.status).toBe(200); expect(allowedAvatar.headers.get("Cache-Control")).toContain("private");
    expect(await allowedAvatar.text()).toBe("test");
    expect((await chatAvatar(new Request(`https://example.invalid/api/chat/avatar?conversationId=${conversation.id}&userId=foreign`))).status).toBe(403);
    await prisma.workspaceMember.updateMany({ where: { workspaceId: f.workspace.id, userId: f.user.id }, data: { isActive: false } });
    expect((await chatAvatar(new Request(`https://example.invalid/api/chat/avatar?conversationId=${conversation.id}&userId=${f.user.id}`))).status).toBe(403);
    identity.id = "";
  });

  it("a permanently invalid recurrence backs off without blocking a healthy student or duplicating debt", async () => {
    const f = await personal();
    const invalid = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await prisma.user.create({ data: {} })).id, role: "STUDENT", billingControlType: "CONFIRMATION", billingIsActive: true, billingPrice: 0, billingNextDueDate: new Date(Date.now() - 5 * 86400000) } });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await prisma.user.create({ data: {} })).id, role: "STUDENT", billingControlType: "CONFIRMATION", billingIsActive: true, billingPrice: 100, billingNextDueDate: new Date(Date.now() - 86400000) } });
    expect(await processRecurringPayments(f.workspace.id)).toMatchObject({ processed: 1, failed: 1 });
    const after = await prisma.workspaceMember.findUniqueOrThrow({ where: { id: invalid.id } });
    expect(after.billingFailureCount).toBe(1); expect(after.billingRetryAt?.getTime()).toBeGreaterThan(Date.now());
    expect(await processRecurringPayments(f.workspace.id)).toMatchObject({ processed: 0, failed: 0 });
    expect(await prisma.workspacePayment.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
});
