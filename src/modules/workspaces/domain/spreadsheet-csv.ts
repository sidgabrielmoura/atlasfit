export interface DecimalCsvCell { decimal: string }
export type SpreadsheetCsvCell = string | DecimalCsvCell | null | undefined;

/** Decimal serialization never converts BigInt to Number. */
export function moneyCsvCell(cents: bigint): DecimalCsvCell {
  const absolute = cents < BigInt(0) ? -cents : cents;
  return { decimal: `${cents < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}` };
}

/** Human-facing export only. Keep formula protection separate from CSV syntax escaping. */
export function spreadsheetCsvCell(value: SpreadsheetCsvCell): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "object") {
    if (!/^-?\d+\.\d{2}$/.test(value.decimal)) throw new Error("Decimal CSV inválido.");
    // Spreadsheet consumers retain only 15 significant numeric digits. Preserve
    // larger amounts as explicit text so saving the sheet cannot drop cents.
    const significantDigits = value.decimal.replace(/[-.]/g, "").replace(/^0+/, "").length;
    return `"${significantDigits > 15 ? "'\t" : ""}${value.decimal}"`;
  }
  const startsFormula = /^[\s\u0000\u200b\ufeff]*[=+\-@＝＋－＠]/u.test(value) || /^[\t\r\n\u0000]/.test(value);
  // Quote + tab keeps text explicit and retains the tab if a spreadsheet removes the quote.
  const text = startsFormula ? `'\t${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}
