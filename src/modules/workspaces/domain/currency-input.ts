/** Brazilian currency input to integer cents, without float rounding or partial parsing. */
export function parseBrlCents(input: string): number | null {
  const value = input.trim().replace(/^R\$\s*/, "");
  if (value.length > 64) return null;
  let whole: string; let fraction: string;
  if (/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) {
    const parts = value.split(","); whole = parts[0].replaceAll(".", ""); fraction = parts[1] || "";
  } else if (/^\d+\.\d{1,2}$/.test(value)) {
    const parts = value.split("."); whole = parts[0]; fraction = parts[1];
  } else return null;
  const amount = BigInt(whole + fraction.padEnd(2, "0"));
  return amount > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(amount);
}
