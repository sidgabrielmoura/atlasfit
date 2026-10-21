import { StudentBillingStatus } from "@prisma/client";

/**
 * Allowed transitions between StudentBillingStatus according to double-entry and state machine rules.
 * Terminal states (REFUNDED, CANCELLED) cannot transition back to active states.
 * SETTLED can never regress to CONFIRMED, PENDING, or OVERDUE.
 */
export const VALID_BILLING_TRANSITIONS: Record<StudentBillingStatus, readonly StudentBillingStatus[]> = {
  [StudentBillingStatus.DRAFT]: [
    StudentBillingStatus.CREATING,
    StudentBillingStatus.PENDING,
    StudentBillingStatus.CANCELLED,
    StudentBillingStatus.FAILED,
  ],
  [StudentBillingStatus.CREATING]: [
    StudentBillingStatus.PENDING,
    StudentBillingStatus.CANCELLED,
    StudentBillingStatus.FAILED,
  ],
  [StudentBillingStatus.PENDING]: [
    StudentBillingStatus.CONFIRMED,
    StudentBillingStatus.SETTLED,
    StudentBillingStatus.AVAILABLE,
    StudentBillingStatus.OVERDUE,
    StudentBillingStatus.CANCELLED,
    StudentBillingStatus.REFUNDED,
    StudentBillingStatus.FAILED,
  ],
  [StudentBillingStatus.OVERDUE]: [
    StudentBillingStatus.CONFIRMED,
    StudentBillingStatus.SETTLED,
    StudentBillingStatus.AVAILABLE,
    StudentBillingStatus.CANCELLED,
    StudentBillingStatus.REFUNDED,
    StudentBillingStatus.FAILED,
  ],
  [StudentBillingStatus.CONFIRMED]: [
    StudentBillingStatus.SETTLED,
    StudentBillingStatus.AVAILABLE,
    StudentBillingStatus.PARTIALLY_REFUNDED,
    StudentBillingStatus.REFUNDED,
    StudentBillingStatus.CHARGEBACK_REQUESTED,
    StudentBillingStatus.FAILED,
  ],
  [StudentBillingStatus.SETTLED]: [
    StudentBillingStatus.AVAILABLE,
    StudentBillingStatus.PARTIALLY_REFUNDED,
    StudentBillingStatus.REFUNDED,
    StudentBillingStatus.CHARGEBACK_REQUESTED,
  ],
  [StudentBillingStatus.AVAILABLE]: [
    StudentBillingStatus.PARTIALLY_REFUNDED,
    StudentBillingStatus.REFUNDED,
    StudentBillingStatus.CHARGEBACK_REQUESTED,
  ],
  [StudentBillingStatus.CHARGEBACK_REQUESTED]: [
    StudentBillingStatus.CHARGEBACK_DISPUTE,
    StudentBillingStatus.CHARGEBACKED,
    StudentBillingStatus.SETTLED,
    StudentBillingStatus.AVAILABLE,
  ],
  [StudentBillingStatus.CHARGEBACK_DISPUTE]: [
    StudentBillingStatus.CHARGEBACKED,
    StudentBillingStatus.SETTLED,
    StudentBillingStatus.AVAILABLE,
  ],
  [StudentBillingStatus.CHARGEBACKED]: [],
  [StudentBillingStatus.FAILED]: [],
  [StudentBillingStatus.CANCELLED]: [],
  [StudentBillingStatus.PARTIALLY_REFUNDED]: [
    StudentBillingStatus.REFUNDED,
  ],
  [StudentBillingStatus.REFUNDED]: [],
};

/**
 * Checks whether transitioning from `current` to `next` status is permitted.
 */
export function canTransitionBillingStatus(
  current: StudentBillingStatus,
  next: StudentBillingStatus
): boolean {
  if (current === next) return true; // Idempotent no-op
  const allowed = VALID_BILLING_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Resolves the next StudentBillingStatus based on an incoming payment provider event.
 * Returns null if the event should not trigger a status transition (e.g. stale or out-of-order event).
 */
export function getNextBillingStatusForEvent(
  currentStatus: StudentBillingStatus,
  eventType: string
): StudentBillingStatus | null {
  let targetStatus: StudentBillingStatus | null = null;

  switch (eventType) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_DUNNING_RECEIVED":
    case "RECEIVED_IN_CASH":
    case "PAYMENT_RECEIVED_IN_CASH":
      targetStatus = StudentBillingStatus.SETTLED;
      break;

    case "PAYMENT_CONFIRMED":
    case "CONFIRMED":
      // If already settled, do not regress to confirmed!
      if (currentStatus === StudentBillingStatus.SETTLED || currentStatus === StudentBillingStatus.AVAILABLE) {
        return null;
      }
      targetStatus = StudentBillingStatus.CONFIRMED;
      break;

    case "PAYMENT_OVERDUE":
      // A payment can only become overdue if it is still PENDING
      if (currentStatus === StudentBillingStatus.PENDING) {
        targetStatus = StudentBillingStatus.OVERDUE;
      }
      break;

    case "PAYMENT_REFUNDED":
      targetStatus = StudentBillingStatus.REFUNDED;
      break;

    case "PAYMENT_PARTIALLY_REFUNDED":
      targetStatus = StudentBillingStatus.PARTIALLY_REFUNDED;
      break;

    case "PAYMENT_DELETED":
      if (currentStatus === StudentBillingStatus.PENDING || currentStatus === StudentBillingStatus.OVERDUE) {
        targetStatus = StudentBillingStatus.CANCELLED;
      }
      break;

    default:
      return null;
  }

  if (targetStatus && canTransitionBillingStatus(currentStatus, targetStatus)) {
    return targetStatus;
  }

  return null;
}

/**
 * Canonical idempotency key for the credit ledger entry of a given billing.
 * Unifies webhook receipt, trainer sync, and student sync to guarantee exactly one credit entry per billing.
 */
export function getBillingLedgerCreditKey(billingId: string): string {
  return `LEDGER_BILLING_CREDIT_${billingId}`;
}

export interface WorkspacePaymentSettlementClient {
  workspacePayment: {
    findFirst: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
}

/**
 * GYM-011: Settles ONLY the specific student's pending obligation in their workspace.
 * Orders by oldest createdAt to settle past-due cycles sequentially.
 * Guarantees zero side-effects on other students in the same gym or workspace.
 */
export async function settleStudentWorkspaceObligation(
  client: WorkspacePaymentSettlementClient,
  params: {
    workspaceId: string;
    studentName: string;
    paidBy?: string;
  }
) {
  if (!params.workspaceId || !params.studentName) {
    return null;
  }

  const target = await client.workspacePayment.findFirst({
    where: {
      workspaceId: params.workspaceId,
      studentName: params.studentName,
      status: { in: ["pendente", "atrasado"] }
    },
    orderBy: {
      createdAt: "asc" // settle oldest cycle first
    }
  });

  if (!target) {
    return null;
  }

  return client.workspacePayment.update({
    where: { id: target.id },
    data: {
      status: "pago",
      paidAt: new Date(),
      paidBy: params.paidBy || "GATEWAY",
      actionType: "AUTOMATIC"
    }
  });
}
