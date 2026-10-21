import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { webhookProcessor } from "@/modules/payments/webhooks/webhook-processor";
import { decryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";
import { resolvePersonalBillingStudent } from "@/modules/payments/webhooks/personal-billing-student";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige o banco descartável específico.");
const headers = { "asaas-access-token": "synthetic-webhook-secret" };
process.env.ASAAS_WEBHOOK_SECRET = headers["asaas-access-token"];
process.env.ASAAS_ENVIRONMENT = "sandbox";
afterAll(() => prisma.$disconnect());

async function fixture(type: "PERSONAL" | "GYM") {
  const owner = await prisma.user.create({ data: { name: "Titular sintético" } });
  const workspace = await prisma.workspace.create({ data: { name: "Workspace sintético", slug: randomUUID(), ownerId: owner.id, type } });
  const account = await prisma.paymentProviderAccount.create({ data: { workspaceId: type === "GYM" ? workspace.id : null, personalUserId: type === "PERSONAL" ? owner.id : null, provider: "ASAAS", environment: "SANDBOX", providerAccountId: `synthetic-${randomUUID()}` } });
  return { owner, workspace, account };
}

describe("Webhooks reais no banco; nenhum comando externo", () => {
  it("IDs de transferência ambíguos não escolhem a primeira conta nem compensam uma reserva alheia",async()=>{
    const a=await fixture("PERSONAL"),b=await fixture("PERSONAL"),providerTransferId=randomUUID();
    const payout=(f:typeof a)=>prisma.walletPayoutRequest.create({data:{providerAccountId:f.account.id,requestedByUserId:f.owner.id,idempotencyKey:randomUUID(),amountInCents:BigInt(1000),destinationMasked:"Synthetic",destinationFingerprint:randomUUID(),providerTransferId,status:"PROCESSING"}});
    const payouts=await Promise.all([payout(a),payout(b)]);
    const body=JSON.stringify({id:randomUUID(),event:"TRANSFER_FAILED",transfer:{id:providerTransferId}});
    const result=await webhookProcessor.receiveWebhook(headers,body);
    expect(result.status).toBe("FAILED_RETRYABLE");
    expect(await prisma.walletPayoutRequest.count({where:{id:{in:payouts.map(row=>row.id)},status:"PROCESSING"}})).toBe(2);
    expect(await prisma.walletLedgerEntry.count({where:{payoutId:{in:payouts.map(row=>row.id)}}})).toBe(0);
    await prisma.paymentWebhookEvent.update({where:{id:result.eventId},data:{processingAttempts:11,nextRetryAt:null}});
    expect(await webhookProcessor.replayEvent(result.eventId)).toMatchObject({status:"REVIEW_REQUIRED"});
    expect(await prisma.paymentWebhookEvent.findUniqueOrThrow({where:{id:result.eventId}})).toMatchObject({processedAt:null,lastErrorSanitized:"TRANSFER_AMBIGUOUS_LINK_REVIEW_REQUIRED"});
  });
  it("eventos GYM e retries concorrentes ficam criptografados em revisão, sem wallet/baixa automática", async () => {
    const f = await fixture("GYM");
    const student = await prisma.user.create({ data: { name: "Aluno sintético" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: student.id, role: "STUDENT" } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Legado" } });
    const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Contrato", priceInCents: BigInt(10000), termsText: "Condições" } });
    const subscriptionId = `synthetic-sub-${randomUUID()}`;
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: member.id, planVersionId: version.id, providerSubscriptionId: subscriptionId, recurrenceMode: "PROVIDER", priceInCents: BigInt(10000), status: "PENDING_ACTIVATION" } });
    const body = JSON.stringify({ id: randomUUID(), event: "PAYMENT_RECEIVED", payment: { id: randomUUID(), subscription: subscriptionId, value: 0.01 } });
    const [a, b] = await Promise.all([webhookProcessor.receiveWebhook(headers, body), webhookProcessor.receiveWebhook(headers, body)]);
    expect(a).toMatchObject({ status: "REVIEW_REQUIRED" }); expect(b.eventId).toBe(a.eventId);
    const retained = await prisma.paymentWebhookEvent.findUniqueOrThrow({ where: { id: a.eventId } });
    expect(retained).toMatchObject({ gymWorkspaceId: f.workspace.id, processingStatus: "REVIEW_REQUIRED", processedAt: null });
    if (!retained.payloadEncrypted) throw new Error("Payload não foi preservado");
    expect(decryptSubAccountApiKey(retained.payloadEncrypted)).toBe(body);
    expect(await webhookProcessor.replayEvent(a.eventId)).toMatchObject({ status: "REVIEW_REQUIRED" });
    await expect(webhookProcessor.receiveWebhook(headers, body.replace('0.01', '1.01'))).rejects.toMatchObject({ statusCode: 400 });
    await expect(webhookProcessor.receiveWebhook({}, body)).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: enrollment.id } })).toMatchObject({ status: "PENDING_ACTIVATION", providerSubscriptionId: subscriptionId });
    expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.walletLedgerEntry.count({ where: { providerAccountId: f.account.id } })).toBe(0);
    const transfer = await prisma.walletPayoutRequest.create({ data: { providerAccountId: f.account.id, requestedByUserId: f.owner.id, idempotencyKey: randomUUID(), amountInCents: BigInt(1000), destinationMasked: "Destino sintético", destinationFingerprint: randomUUID(), providerTransferId: randomUUID(), status: "PROCESSING" } });
    const transferEvent = await webhookProcessor.receiveWebhook(headers, JSON.stringify({ id: randomUUID(), event: "TRANSFER_FAILED", transfer: { id: transfer.providerTransferId } }));
    expect(transferEvent.status).toBe("REVIEW_REQUIRED");
    expect(await prisma.walletPayoutRequest.findUnique({ where: { id: transfer.id } })).toMatchObject({ status: "PROCESSING" });
  });

  it("falha de saque PERSONAL compensa a reserva uma vez e eventos atrasados não regressam estado", async () => {
    const f = await fixture("PERSONAL");
    const payout = await prisma.walletPayoutRequest.create({ data: { providerAccountId: f.account.id, requestedByUserId: f.owner.id, idempotencyKey: randomUUID(), amountInCents: BigInt(1000), destinationMasked: "Destino sintético", destinationFingerprint: randomUUID(), providerTransferId: randomUUID(), status: "PROCESSING" } });
    await prisma.walletLedgerEntry.create({ data: { providerAccountId: f.account.id, payoutId: payout.id, idempotencyKey: `LEDGER_PAYOUT_${payout.id}`, type: "PAYOUT_RESERVED", direction: "DEBIT", amountInCents: BigInt(1000), occurredAt: new Date(), description: "Reserva sintética" } });
    const makeBody = (event: string) => JSON.stringify({ id: randomUUID(), event, transfer: { id: payout.providerTransferId } });
    const sameBody = makeBody("TRANSFER_FAILED");
    const results = await Promise.all([webhookProcessor.receiveWebhook(headers, sameBody), webhookProcessor.receiveWebhook(headers, sameBody)]);
    expect(results.some(result => result.status === "PROCESSED")).toBe(true);
    expect(await webhookProcessor.receiveWebhook(headers, makeBody("TRANSFER_CANCELLED"))).toMatchObject({ status: "PROCESSED" });
    expect(await webhookProcessor.receiveWebhook(headers, makeBody("TRANSFER_PENDING"))).toMatchObject({ status: "PROCESSED" });
    expect(await prisma.walletPayoutRequest.findUnique({ where: { id: payout.id } })).toMatchObject({ status: "FAILED_FINAL" });
    expect(await prisma.walletLedgerEntry.count({ where: { payoutId: payout.id, direction: "CREDIT" } })).toBe(1);
    expect(await webhookProcessor.receiveWebhook(headers, makeBody("TRANSFER_DONE"))).toMatchObject({ status: "FAILED_RETRYABLE" });
    expect(await prisma.walletLedgerEntry.count({ where: { payoutId: payout.id } })).toBe(2);
  });

  it("falha local fica recuperável, sem sucesso falso nem débito/compensação fabricados", async () => {
    const f = await fixture("PERSONAL");
    const payout = await prisma.walletPayoutRequest.create({ data: { providerAccountId: f.account.id, requestedByUserId: f.owner.id, idempotencyKey: randomUUID(), amountInCents: BigInt(1000), destinationMasked: "Destino sintético", destinationFingerprint: randomUUID(), providerTransferId: randomUUID(), status: "PROCESSING" } });
    const result = await webhookProcessor.receiveWebhook(headers, JSON.stringify({ id: randomUUID(), event: "TRANSFER_FAILED", transfer: { id: payout.providerTransferId } }));
    expect(result.status).toBe("FAILED_RETRYABLE");
    expect(await prisma.paymentWebhookEvent.findUnique({ where: { id: result.eventId } })).toMatchObject({ processingStatus: "FAILED_RETRYABLE", processedAt: null, processingAttempts: 1, lastErrorSanitized: "PAYOUT_RESERVATION_REVIEW_REQUIRED" });
    expect(await prisma.walletPayoutRequest.findUnique({ where: { id: payout.id } })).toMatchObject({ status: "PROCESSING" });
    expect(await prisma.walletLedgerEntry.count({ where: { payoutId: payout.id } })).toBe(0);
    const student = await prisma.user.create({ data: { name: "Aluno compartilhado" } });
    const gym = await prisma.workspace.create({ data: { type: "GYM", name: "Academia", slug: randomUUID(), ownerId: f.owner.id } });
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: student.id, role: "STUDENT" } });
    await expect(resolvePersonalBillingStudent(null, student.id, f.owner.id)).rejects.toThrow("BILLING_WORKSPACE_REVIEW_REQUIRED");
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: student.id, role: "STUDENT" } });
    expect(await resolvePersonalBillingStudent(null, student.id, f.owner.id)).toMatchObject({ workspaceId: f.workspace.id });
    await expect(resolvePersonalBillingStudent(gym.id, student.id, f.owner.id)).rejects.toThrow("BILLING_WORKSPACE_REVIEW_REQUIRED");
    const second = await prisma.workspace.create({ data: { type: "PERSONAL", name: "Outra assessoria", slug: randomUUID(), ownerId: f.owner.id } });
    await prisma.workspaceMember.create({ data: { workspaceId: second.id, userId: student.id, role: "STUDENT" } });
    await expect(resolvePersonalBillingStudent(null, student.id, f.owner.id)).rejects.toThrow("BILLING_WORKSPACE_REVIEW_REQUIRED");
    expect(await resolvePersonalBillingStudent(f.workspace.id, student.id, f.owner.id)).toMatchObject({ workspaceId: f.workspace.id });
  });
});
