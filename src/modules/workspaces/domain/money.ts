import { WorkspaceAccessError } from "./types";

export function cents(value: bigint | number | string): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Informe um valor inteiro de centavos.");
  if (typeof value === "string" && !/^-?\d+$/.test(value)) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Valor monetário inválido.");
  return BigInt(value);
}

export function positiveCents(value: bigint | number | string): bigint {
  const amount = cents(value);
  if (amount <= BigInt(0)) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "O valor deve ser maior que zero.");
  return amount;
}

/** Compatibility for existing number-based screens; never silently rounds an integer. */
export function safeCentsNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) throw new WorkspaceAccessError(422, "INVALID_AMOUNT", "Valor excede o intervalo deste contrato de apresentação.");
  return Number(value);
}
