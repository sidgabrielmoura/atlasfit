export interface FeeCalculationInput {
  grossAmountInCents: bigint;
  platformPercentage: number;
  platformFixedInCents: bigint;
  minPlatformFeeInCents?: bigint;
  maxPlatformFeeInCents?: bigint;
}

export interface FeeCalculationResult {
  grossAmountInCents: bigint;
  platformFeeInCents: bigint;
  personalNetInCents: bigint;
}

export function calculatePlatformFee(input: FeeCalculationInput): FeeCalculationResult {
  if (input.grossAmountInCents <= BigInt(0)) {
    throw new Error("O valor bruto deve ser maior que zero");
  }

  const percentFee = BigInt(Math.round(Number(input.grossAmountInCents) * (input.platformPercentage / 100)));
  let totalPlatformFee = percentFee + input.platformFixedInCents;

  if (input.minPlatformFeeInCents !== undefined && totalPlatformFee < input.minPlatformFeeInCents) {
    totalPlatformFee = input.minPlatformFeeInCents;
  }

  if (input.maxPlatformFeeInCents !== undefined && totalPlatformFee > input.maxPlatformFeeInCents) {
    totalPlatformFee = input.maxPlatformFeeInCents;
  }

  if (totalPlatformFee > input.grossAmountInCents) {
    totalPlatformFee = input.grossAmountInCents;
  }

  const personalNetInCents = input.grossAmountInCents - totalPlatformFee;

  return {
    grossAmountInCents: input.grossAmountInCents,
    platformFeeInCents: totalPlatformFee,
    personalNetInCents
  };
}

export function centsToCurrencyString(cents: bigint): string {
  const numberVal = Number(cents) / 100;
  return numberVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function currencyStringToCents(val: string | number): bigint {
  if (typeof val === "number") {
    return BigInt(Math.round(val * 100));
  }
  const cleanStr = val.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.round(parsed * 100));
}
