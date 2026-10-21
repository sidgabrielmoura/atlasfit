import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("@/lib/ably", () => ({ publishToChannel: vi.fn() }));
import prisma from "@/lib/prisma";
import { PaymentService } from "@/modules/payments/application/payment-service";
import { AsaasAdapter } from "@/modules/payments/providers/asaas/asaas-adapter";

const db = new URL(process.env.DATABASE_URL || "http://invalid");
const freshSchema = process.env.GYM_FINAL_SCHEMA_TEST === "1" && /^\/atlasfit_completion_tests_[a-f0-9]{32}$/.test(db.pathname);
if (db.hostname !== "127.0.0.1" || db.port !== "56432" || (db.pathname !== "/atlasfit_gym_stabilization_20261001" && !freshSchema)) throw Error("Banco descartável obrigatório.");
afterAll(() => prisma.$disconnect());
beforeEach(() => {
  vi.stubEnv("ASAAS_ENVIRONMENT", "sandbox");
  vi.stubEnv("ATLASFIT_FEE_PERCENTAGE", "3.5"); vi.stubEnv("ATLASFIT_FEE_FIXED", "1.00");
  vi.spyOn(AsaasAdapter.prototype, "createOrGetCustomer").mockResolvedValue({ providerCustomerId: `synthetic-${randomUUID()}`, nameSnapshot: "Aluno" });
  vi.spyOn(AsaasAdapter.prototype, "getBalance").mockResolvedValue({ availableAmountInCents: BigInt(0), pendingAmountInCents: BigInt(0), blockedAmountInCents: BigInt(0), negativeAmountInCents: BigInt(0) });
  vi.spyOn(AsaasAdapter.prototype, "getPayment").mockResolvedValue({ status: "PENDING" });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function fixture() {
  const owner = await prisma.user.create({ data: { name: "Titular sintético" } });
  const student = await prisma.user.create({ data: { name: "Aluno sintético" } });
  const workspace = await prisma.workspace.create({ data: { name: "Personal sintético", slug: randomUUID(), ownerId: owner.id, type: "PERSONAL" } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT" } });
  const account = await prisma.paymentProviderAccount.create({ data: { personalUserId: owner.id, workspaceId: workspace.id, provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID(), status: "APPROVED" } });
  const input = { personalUserId: owner.id, studentUserId: student.id, title: "Mensalidade", amountInCents: BigInt(10000), paymentMethod: "CREDIT_CARD" as const, dueDate: new Date("2026-10-20"), idempotencyKey: randomUUID() };
  return { input, account, workspace, service: new PaymentService() };
}
const result = () => ({ providerBillingId: `synthetic-${randomUUID()}`, providerStatus: "PENDING", grossAmountInCents: BigInt(10000), platformFeeEstimatedInCents: BigInt(450), personalNetEstimatedInCents: BigInt(9550) });
describe("PERSONAL: solicitação durável e recuperação sem novo comando financeiro", () => {
  it("conta de outro ambiente não cria obrigação nem consulta saldo remoto", async () => {
    const f = await fixture();
    await prisma.paymentProviderAccount.update({ where: { id: f.account.id }, data: { environment: "PRODUCTION" } });
    const command = vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge");
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("ASAAS_ACCOUNT_ENVIRONMENT_MISMATCH");
    await expect(f.service.syncAccountBalance(f.input.personalUserId)).rejects.toThrow("ASAAS_ACCOUNT_ENVIRONMENT_MISMATCH");
    expect(command).not.toHaveBeenCalled(); expect(AsaasAdapter.prototype.getBalance).not.toHaveBeenCalled();
    expect(await prisma.workspacePayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("conta encerrada não envia cobrança", async () => {
    const f = await fixture();
    await prisma.paymentProviderAccount.update({ where: { id: f.account.id }, data: { closedAt: new Date() } });
    const command = vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge");
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("ASAAS_ACCOUNT_UNAVAILABLE");
    expect(command).not.toHaveBeenCalled();
  });
  it("commit da obrigação e chave antecede provedor; replay conserva cobrança e conflito é recusado", async () => {
    const f = await fixture();
    const command = vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge").mockImplementation(async input => {
      const pending = await prisma.studentBilling.findUniqueOrThrow({ where: { idempotencyKey: f.input.idempotencyKey } });
      expect(pending).toMatchObject({ status: "DRAFT", providerBillingId: null, billingReference: input.billingReference, workspaceId: f.workspace.id });
      expect(pending.workspacePaymentId).toBeTruthy(); expect(await prisma.paymentSplit.count({ where: { billingId: pending.id } })).toBe(1);
      return result();
    });
    const billing = await f.service.createStudentBilling(f.input);
    expect(billing.status).toBe("PENDING"); expect((await f.service.createStudentBilling(f.input)).id).toBe(billing.id); expect(command).toHaveBeenCalledTimes(1);
    await expect(f.service.createStudentBilling({ ...f.input, title: "Outra obrigação" })).rejects.toThrow("BILLING_IDEMPOTENCY_CONFLICT");
  });
  it("timeout mantém solicitação e retry não repete POST; referência recupera a mesma cobrança", async () => {
    const f = await fixture(), command = vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge").mockRejectedValue(Error("network outcome unknown"));
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("network outcome unknown");
    let billing = await prisma.studentBilling.findUniqueOrThrow({ where: { idempotencyKey: f.input.idempotencyKey } });
    expect(billing).toMatchObject({ status: "DRAFT", providerStatus: "CREATION_RECONCILIATION_REQUIRED", providerBillingId: null });
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("BILLING_RECONCILIATION_REQUIRED"); expect(command).toHaveBeenCalledTimes(1);
    const remoteId = randomUUID();
    const read = vi.spyOn(AsaasAdapter.prototype, "findPaymentByReference").mockResolvedValue({ id: remoteId, customer: billing.gatewayCustomerId!, externalReference: billing.billingReference, value: 100, status: "PENDING" });
    await f.service.syncAccountBalance(f.input.personalUserId);
    billing = await prisma.studentBilling.findUniqueOrThrow({ where: { id: billing.id } });
    expect(billing).toMatchObject({ providerBillingId: remoteId, status: "PENDING" });
    expect(read).toHaveBeenCalledWith(billing.billingReference, f.account.providerAccountId); expect((await f.service.createStudentBilling(f.input)).id).toBe(billing.id); expect(command).toHaveBeenCalledTimes(1);
  });
  it("concorrência conserva uma solicitação, obrigação e comando", async () => {
    const f = await fixture(), command = vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge").mockResolvedValue(result());
    const attempts = await Promise.allSettled(Array.from({ length: 4 }, () => f.service.createStudentBilling(f.input)));
    expect(attempts.some(attempt => attempt.status === "fulfilled")).toBe(true);
    expect(await prisma.studentBilling.count({ where: { idempotencyKey: f.input.idempotencyKey } })).toBe(1);
    expect(await prisma.workspacePayment.count({ where: { workspaceId: f.workspace.id } })).toBe(1); expect(command).toHaveBeenCalledTimes(1);
  });
  it.each(["value", "customer"])("fato remoto divergente em %s mantém resultado incerto", async field => {
    const f = await fixture(); vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge").mockRejectedValue(Error("timeout"));
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("timeout");
    const billing = await prisma.studentBilling.findUniqueOrThrow({ where: { idempotencyKey: f.input.idempotencyKey } });
    vi.spyOn(AsaasAdapter.prototype, "findPaymentByReference").mockResolvedValue({ id: randomUUID(), externalReference: billing.billingReference, status: "PENDING", customer: field === "customer" ? "foreign" : billing.gatewayCustomerId!, value: field === "value" ? 101 : 100 });
    await expect(f.service.syncAccountBalance(f.input.personalUserId)).rejects.toThrow("BILLING_PROVIDER_FACTS_CONFLICT");
    expect(await prisma.studentBilling.findUnique({ where: { id: billing.id } })).toMatchObject({ status: "DRAFT", providerBillingId: null });
    expect(await prisma.walletBalanceSnapshot.count({ where: { providerAccountId: f.account.id } })).toBe(0);
  });
  it("ausência na consulta não permite nova cobrança", async () => {
    const f = await fixture(), command = vi.spyOn(AsaasAdapter.prototype, "createOneTimeCharge").mockRejectedValue(Error("timeout"));
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("timeout");
    vi.spyOn(AsaasAdapter.prototype, "findPaymentByReference").mockResolvedValue(null);
    await f.service.syncAccountBalance(f.input.personalUserId);
    await expect(f.service.createStudentBilling(f.input)).rejects.toThrow("BILLING_RECONCILIATION_REQUIRED"); expect(command).toHaveBeenCalledTimes(1);
  });
});
