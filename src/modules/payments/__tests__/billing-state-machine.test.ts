import { describe, it, expect } from "vitest";
import { StudentBillingStatus } from "@prisma/client";
import {
  canTransitionBillingStatus,
  getNextBillingStatusForEvent,
  getBillingLedgerCreditKey
} from "../domain/billing-state-machine";

describe("GYM-012: Billing State Machine Transitions", () => {
  it("permite transições normais de avanço financeiro: PENDING -> CONFIRMED -> SETTLED", () => {
    expect(canTransitionBillingStatus(StudentBillingStatus.PENDING, StudentBillingStatus.CONFIRMED)).toBe(true);
    expect(canTransitionBillingStatus(StudentBillingStatus.CONFIRMED, StudentBillingStatus.SETTLED)).toBe(true);
    expect(canTransitionBillingStatus(StudentBillingStatus.PENDING, StudentBillingStatus.SETTLED)).toBe(true);
  });

  it("IMPEDE regressão de status: SETTLED nunca deve regredir para CONFIRMED ou PENDING", () => {
    expect(canTransitionBillingStatus(StudentBillingStatus.SETTLED, StudentBillingStatus.CONFIRMED)).toBe(false);
    expect(canTransitionBillingStatus(StudentBillingStatus.SETTLED, StudentBillingStatus.PENDING)).toBe(false);
    expect(canTransitionBillingStatus(StudentBillingStatus.SETTLED, StudentBillingStatus.OVERDUE)).toBe(false);
  });

  it("IMPEDE regressão de status: CONFIRMED nunca deve regredir para PENDING ou OVERDUE", () => {
    expect(canTransitionBillingStatus(StudentBillingStatus.CONFIRMED, StudentBillingStatus.PENDING)).toBe(false);
    expect(canTransitionBillingStatus(StudentBillingStatus.CONFIRMED, StudentBillingStatus.OVERDUE)).toBe(false);
  });

  it("estados terminais (REFUNDED, CANCELLED, FAILED) não aceitam novas transições", () => {
    expect(canTransitionBillingStatus(StudentBillingStatus.REFUNDED, StudentBillingStatus.SETTLED)).toBe(false);
    expect(canTransitionBillingStatus(StudentBillingStatus.CANCELLED, StudentBillingStatus.CONFIRMED)).toBe(false);
    expect(canTransitionBillingStatus(StudentBillingStatus.FAILED, StudentBillingStatus.SETTLED)).toBe(false);
  });

  it("transição para o mesmo status é idempotente (no-op permitido)", () => {
    expect(canTransitionBillingStatus(StudentBillingStatus.SETTLED, StudentBillingStatus.SETTLED)).toBe(true);
    expect(canTransitionBillingStatus(StudentBillingStatus.PENDING, StudentBillingStatus.PENDING)).toBe(true);
  });

  it("getNextBillingStatusForEvent: evento atrasado PAYMENT_CONFIRMED não altera cobrança já SETTLED", () => {
    const next = getNextBillingStatusForEvent(StudentBillingStatus.SETTLED, "PAYMENT_CONFIRMED");
    expect(next).toBeNull();
  });

  it("getNextBillingStatusForEvent: PAYMENT_RECEIVED sobre CONFIRMED avança para SETTLED", () => {
    const next = getNextBillingStatusForEvent(StudentBillingStatus.CONFIRMED, "PAYMENT_RECEIVED");
    expect(next).toBe(StudentBillingStatus.SETTLED);
  });

  it("getNextBillingStatusForEvent: PAYMENT_REFUNDED sobre SETTLED avança para REFUNDED", () => {
    const next = getNextBillingStatusForEvent(StudentBillingStatus.SETTLED, "PAYMENT_REFUNDED");
    expect(next).toBe(StudentBillingStatus.REFUNDED);
  });

  it("getNextBillingStatusForEvent: PAYMENT_OVERDUE sobre cobrança já paga/confirmada é ignorado", () => {
    expect(getNextBillingStatusForEvent(StudentBillingStatus.CONFIRMED, "PAYMENT_OVERDUE")).toBeNull();
    expect(getNextBillingStatusForEvent(StudentBillingStatus.SETTLED, "PAYMENT_OVERDUE")).toBeNull();
  });

  it("getNextBillingStatusForEvent: PAYMENT_OVERDUE sobre PENDING avança para OVERDUE", () => {
    expect(getNextBillingStatusForEvent(StudentBillingStatus.PENDING, "PAYMENT_OVERDUE")).toBe(StudentBillingStatus.OVERDUE);
  });
});

describe("GYM-012: Ledger Canonical Idempotency Key", () => {
  it("gera chave canônica unificada que impede crédito duplo entre webhook e sync", () => {
    const billingId = "bill_abc_123";
    const key = getBillingLedgerCreditKey(billingId);
    expect(key).toBe("LEDGER_BILLING_CREDIT_bill_abc_123");
  });
});
