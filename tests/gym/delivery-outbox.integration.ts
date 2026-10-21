import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { enqueueDelivery, processDelivery, DeliveryError, minimizeDeliveredPayloads } from "@/lib/delivery/outbox";
import { decryptSubAccountApiKey, encryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";
import { webhookProcessor } from "@/modules/payments/webhooks/webhook-processor";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige o banco descartável específico.");
process.env.ASAAS_WEBHOOK_SECRET = "synthetic-webhook-secret";
process.env.ASAAS_ENVIRONMENT = "sandbox";
const headers = { "asaas-access-token": process.env.ASAAS_WEBHOOK_SECRET };
afterAll(() => prisma.$disconnect());
const enqueue = (key = randomUUID(), payload: unknown = { value: "synthetic" }) => serializableTransaction(tx => enqueueDelivery(tx, { requestKey: key, channel: "EMAIL", payload }));

async function billingFixture() {
  const owner = await prisma.user.create({ data: { name: "Personal sintético", email: `${randomUUID()}@example.test` } });
  const student = await prisma.user.create({ data: { name: "Aluno sintético", email: `${randomUUID()}@example.test` } });
  const workspace = await prisma.workspace.create({ data: { name: "Assessoria sintética", slug: randomUUID(), ownerId: owner.id, type: "PERSONAL" } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT" } });
  const account = await prisma.paymentProviderAccount.create({ data: { personalUserId: owner.id, provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID(), activationFeeStatus: "NOT_APPLICABLE" } });
  const obligation = await prisma.workspacePayment.create({ data: { workspaceId: workspace.id, studentName: student.name!, planName: "Mês atual", amount: 100, method: "PIX", status: "pendente" } });
  const next = await prisma.workspacePayment.create({ data: { workspaceId: workspace.id, studentName: student.name!, planName: "Mês seguinte", amount: 100, method: "PIX", status: "pendente" } });
  const billing = await prisma.studentBilling.create({ data: { providerAccountId: account.id, workspaceId: workspace.id, workspacePaymentId: obligation.id, studentUserId: student.id, providerBillingId: randomUUID(), idempotencyKey: randomUUID(), billingReference: randomUUID(), title: "Mensalidade sintética", grossAmountInCents: BigInt(10000), personalNetEstimatedInCents: BigInt(9500), feeRuleVersionId: "synthetic", paymentMethod: "PIX", status: "PENDING", dueDate: new Date() } });
  const body = (event = "PAYMENT_RECEIVED", id = randomUUID()) => JSON.stringify({ id, event, dateCreated: "2026-10-07T12:00:00Z", payment: { id: billing.providerBillingId } });
  return { billing, obligation, next, account, body };
}

describe("Fila durável e recuperação de webhook", () => {
  it("replay sem data do provedor conserva a primeira recepção em vez da hora do retry",async()=>{
    const f=await billingFixture(),id=randomUUID(),receivedAt=new Date(Date.now()-600000);
    const body=JSON.stringify({id,event:"PAYMENT_CONFIRMED",payment:{id:f.billing.providerBillingId}});
    const hash=(await import("node:crypto")).createHash("sha256").update(body).digest("hex");
    const event=await prisma.paymentWebhookEvent.create({data:{provider:"ASAAS",environment:"SANDBOX",providerEventId:id,eventType:"PAYMENT_CONFIRMED",resourceType:"PAYMENT",resourceId:f.billing.providerBillingId,authenticityValidated:true,payloadHash:hash,payloadEncrypted:encryptSubAccountApiKey(body).encrypted,processingStatus:"QUEUED",receivedAt}});
    expect(await webhookProcessor.replayEvent(event.id)).toMatchObject({status:"PROCESSED"});
    expect((await prisma.studentBilling.findUniqueOrThrow({where:{id:f.billing.id}})).confirmedAt).toEqual(receivedAt);
  });
  it("deduplica enqueue concorrente, cifra o conteúdo e rejeita chave divergente", async () => {
    const key = randomUUID();
    const jobs = await Promise.all(Array.from({ length: 8 }, () => enqueue(key)));
    expect(new Set(jobs.map(job => job.id)).size).toBe(1);
    expect(jobs[0].payloadEncrypted).not.toContain("synthetic");
    expect(JSON.parse(decryptSubAccountApiKey(jobs[0].payloadEncrypted!))).toEqual({ value: "synthetic" });
    await expect(enqueue(key, { value: "different" })).rejects.toMatchObject({ code: "DELIVERY_IDEMPOTENCY_CONFLICT" });
    const { billing } = await billingFixture();
    for (const payload of [{ workspaceId: billing.workspaceId }, { guard: { kind: "NOTIFICATION", workspaceId: billing.workspaceId } }]) {
      const legacy = await enqueue(randomUUID(), payload);
      await prisma.deliveryOutbox.update({ where: { id: legacy.id }, data: { status: "SENT", providerReceiptId: "legacy-receipt", completedAt: new Date() } });
      const replay = () => serializableTransaction(tx => enqueueDelivery(tx, { requestKey: legacy.requestKey, channel: "EMAIL", payload, workspaceId: billing.workspaceId! }));
      const retries = await Promise.all([replay(), replay()]);
      expect(retries.every(job => job.id === legacy.id && job.workspaceId === billing.workspaceId && job.status === "SENT" && job.providerReceiptId === "legacy-receipt")).toBe(true);
      await expect(serializableTransaction(tx => enqueueDelivery(tx, { requestKey: legacy.requestKey, channel: "EMAIL", payload, workspaceId: randomUUID() }))).rejects.toMatchObject({ code: "DELIVERY_IDEMPOTENCY_CONFLICT" });
    }
    await expect(serializableTransaction(tx => enqueueDelivery(tx, { requestKey: key, channel: "EMAIL", payload: { value: "synthetic" }, workspaceId: billing.workspaceId! }))).rejects.toMatchObject({ code: "DELIVERY_IDEMPOTENCY_CONFLICT" });
    const tokenHash = randomUUID();
    await prisma.verificationToken.create({ data: { identifier: "synthetic-legacy-invite", token: tokenHash, expires: new Date(Date.now() + 60000), workspaceId: billing.workspaceId } });
    const invitePayload = { guard: { kind: "GYM_STUDENT_INVITE", tokenHash } };
    const invitation = await enqueue(randomUUID(), invitePayload);
    expect(await serializableTransaction(tx => enqueueDelivery(tx, { requestKey: invitation.requestKey, channel: "EMAIL", payload: invitePayload, workspaceId: billing.workspaceId! }))).toMatchObject({ id: invitation.id, workspaceId: billing.workspaceId });
  });
  it("uma falha de transação não deixa entrega órfã", async () => {
    const key = randomUUID();
    await expect(serializableTransaction(async tx => { await enqueueDelivery(tx, { requestKey: key, channel: "EMAIL", payload: {} }); throw new Error("rollback"); })).rejects.toThrow("rollback");
    expect(await prisma.deliveryOutbox.count({ where: { requestKey: key } })).toBe(0);
  });
  it("workers concorrentes enviam uma vez; erro recuperável respeita backoff", async () => {
    const job = await enqueue();
    const now = new Date();
    let calls = 0;
    const handler = async () => { calls++; return { receiptId: "synthetic-ack" }; };
    const results = await Promise.all(Array.from({ length: 8 }, () => processDelivery(job.id, handler, now)));
    expect(calls).toBe(1); expect(results.filter(result => result.status === "SENT")).toHaveLength(1);
    const failed = await enqueue();
    const failedAt = new Date();
    expect(await processDelivery(failed.id, async () => { throw new Error("sensitive provider response"); }, failedAt)).toMatchObject({ status: "RETRY", code: "DELIVERY_FAILED" });
    expect(await processDelivery(failed.id, handler, failedAt)).toMatchObject({ status: "NOT_CLAIMED" });
    expect(await processDelivery(failed.id, handler, new Date(failedAt.getTime() + 31_000))).toMatchObject({ status: "SENT" });
    expect(await prisma.deliveryOutbox.findUnique({ where: { id: failed.id } })).toMatchObject({ attempts: 2, lastErrorCode: null });
  });
  it("recupera lease vencida e impede que worker antigo sobrescreva o recibo", async () => {
    const job = await enqueue(); const now = new Date();
    let release!: () => void; let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { started = resolve; });
    const old = processDelivery(job.id, async () => { started(); await gate; return { receiptId: "old" }; }, now);
    await ready;
    expect(await processDelivery(job.id, async () => ({ receiptId: "new" }), new Date(now.getTime() + 121_000))).toMatchObject({ status: "SENT" });
    release(); expect(await old).toMatchObject({ status: "LEASE_REPLACED" });
    expect(await prisma.deliveryOutbox.findUnique({ where: { id: job.id } })).toMatchObject({ providerReceiptId: "new", attempts: 2 });
  });
  it("resultado incerto vai para revisão e a minimização preserva recibo/chave", async () => {
    const job = await enqueue();
    expect(await processDelivery(job.id, async () => { throw new DeliveryError("UNCERTAIN_TRANSFER", true); })).toMatchObject({ status: "REVIEW_REQUIRED" });
    expect(await processDelivery(job.id, async () => ({}))).toMatchObject({ status: "NOT_CLAIMED" });
    const sent = await enqueue(); const old = new Date(Date.now() - 3 * 86_400_000);
    await processDelivery(sent.id, async () => ({ receiptId: "retained" }), new Date());
    await prisma.deliveryOutbox.update({ where: { id: sent.id }, data: { completedAt: old } });
    await minimizeDeliveredPayloads(new Date(Date.now() - 2 * 86_400_000));
    expect(await prisma.deliveryOutbox.findUnique({ where: { id: sent.id } })).toMatchObject({ payloadEncrypted: null, providerReceiptId: "retained", requestKey: sent.requestKey });
    expect((await prisma.deliveryOutbox.findUniqueOrThrow({ where: { id: job.id } })).payloadEncrypted).not.toBeNull();
  });
  it("recebimentos duplicados baixam somente a obrigação vinculada e retêm os envios", async () => {
    const f = await billingFixture(); const body = f.body();
    const results = await Promise.all([webhookProcessor.receiveWebhook(headers, body), webhookProcessor.receiveWebhook(headers, body)]);
    expect(results.map(result => result.status).sort()).toEqual(["DUPLICATE", "PROCESSED"]);
    expect(await webhookProcessor.receiveWebhook(headers, f.body())).toMatchObject({ status: "PROCESSED" });
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.obligation.id } })).toMatchObject({ status: "pago" });
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.next.id } })).toMatchObject({ status: "pendente" });
    expect(await prisma.walletLedgerEntry.count({ where: { billingId: f.billing.id } })).toBe(1);
    expect(await prisma.deliveryOutbox.count({ where: { requestKey: { startsWith: `billing:${f.billing.id}:` } } })).toBe(4);
    expect(await prisma.deliveryOutbox.count({ where: { channel: "EMAIL", webhookId: results[0].eventId } })).toBe(2);
  });
  it("PROCESSING antigo recupera; vínculo ausente e estorno parcial não fabricam baixas", async () => {
    const f = await billingFixture();
    const result = await webhookProcessor.receiveWebhook(headers, f.body("PAYMENT_CONFIRMED"));
    expect(result.status).toBe("PROCESSED");
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.obligation.id } })).toMatchObject({ status: "pendente" });
    await prisma.paymentWebhookEvent.update({ where: { id: result.eventId }, data: { processingStatus: "PROCESSING", processingStartedAt: new Date(Date.now() - 600_000), processedAt: null } });
    expect(await webhookProcessor.replayEvent(result.eventId)).toMatchObject({ status: "PROCESSED" });
    await prisma.studentBilling.update({ where: { id: f.billing.id }, data: { workspacePaymentId: null } });
    expect(await webhookProcessor.receiveWebhook(headers, f.body())).toMatchObject({ status: "REVIEW_REQUIRED" });
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.obligation.id } })).toMatchObject({ status: "pendente" });
    expect(await webhookProcessor.receiveWebhook(headers, f.body("PAYMENT_PARTIALLY_REFUNDED"))).toMatchObject({ status: "REVIEW_REQUIRED" });
    expect(await prisma.walletLedgerEntry.count({ where: { billingId: f.billing.id, direction: "DEBIT" } })).toBe(0);
  });
  it("sync de consulta e webhook usam a mesma baixa; CONFIRMED não paga a obrigação", async () => {
    const f = await billingFixture();
    const snapshot = { billingId: f.billing.id, providerAccountId: f.account.id, payment: { id: f.billing.providerBillingId, status: "CONFIRMED", confirmedDate: "2026-10-07" } };
    expect(await webhookProcessor.recordProviderPaymentSnapshot(snapshot)).toMatchObject({ status: "PROCESSED" });
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.obligation.id } })).toMatchObject({ status: "pendente" });
    expect(await prisma.studentBilling.findUnique({ where: { id: f.billing.id } })).toMatchObject({ paidAt: null, settledAt: null });
    await Promise.all([
      webhookProcessor.recordProviderPaymentSnapshot({ ...snapshot, payment: { id: f.billing.providerBillingId, status: "RECEIVED", paymentDate: "2026-10-07" } }),
      webhookProcessor.receiveWebhook(headers, f.body()),
    ]);
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.obligation.id } })).toMatchObject({ status: "pago" });
    expect(await prisma.workspacePayment.findUnique({ where: { id: f.next.id } })).toMatchObject({ status: "pendente" });
    expect(await prisma.walletLedgerEntry.count({ where: { billingId: f.billing.id } })).toBe(1);
    expect(await prisma.deliveryOutbox.count({ where: { requestKey: `billing:${f.billing.id}:student-receipt` } })).toBe(1);
    await expect(webhookProcessor.recordProviderPaymentSnapshot({ ...snapshot, providerAccountId: randomUUID() })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("payload histórico ausente ou divergente encerra retries em revisão, sem novos efeitos", async () => {
    const f = await billingFixture();
    const first = await webhookProcessor.receiveWebhook(headers, f.body("PAYMENT_CONFIRMED"));
    const before = await prisma.walletLedgerEntry.count({ where: { billingId: f.billing.id } });
    await prisma.paymentWebhookEvent.update({ where: { id: first.eventId }, data: { processingStatus: "QUEUED", payloadEncrypted: null, processedAt: null } });
    expect(await webhookProcessor.replayEvent(first.eventId)).toMatchObject({ status: "REVIEW_REQUIRED" });
    expect(await prisma.paymentWebhookEvent.findUnique({ where: { id: first.eventId } })).toMatchObject({ lastErrorSanitized: "WEBHOOK_PAYLOAD_REVIEW_REQUIRED", nextRetryAt: null });
    expect(await prisma.walletLedgerEntry.count({ where: { billingId: f.billing.id } })).toBe(before);
    expect(await webhookProcessor.replayEvent(first.eventId)).toMatchObject({ status: "REVIEW_REQUIRED" });
  });
});
