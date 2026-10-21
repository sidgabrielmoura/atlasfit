import type { GymCashDrawerMovement } from "@prisma/client";

/** Opening/closing are counts, not additional inflows. Negative entries compensate history. */
export function expectedCash(opening: bigint, movements: Pick<GymCashDrawerMovement, "movementType" | "amountInCents">[]): bigint {
  return movements.reduce((total, movement) => {
    if (movement.movementType === "SUPPLY" || movement.movementType === "CASH_INFLOW_PAYMENT") return total + movement.amountInCents;
    if (movement.movementType === "BLEED" || movement.movementType === "EXPENSE_PAYMENT") return total - movement.amountInCents;
    return total;
  }, opening);
}
