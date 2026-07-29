import ExcelJS from "exceljs";
import { IMPORT_LIMITS } from "../config/limits";

export class UnsupportedSpreadsheetFormatError extends Error {
  constructor(filename?: string) {
    super(
      `O formato de planilha do arquivo ${filename ? `"${filename}"` : ""} não é suportado diretamente. Por favor, salve a planilha como .xlsx ou .csv e tente novamente.`
    );
    this.name = "UnsupportedSpreadsheetFormatError";
  }
}

export interface ParsedSpreadsheetResult {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

/**
 * Parses an XLSX buffer deterministically using ExcelJS.
 * Rejects .xls or unsupported formats with UnsupportedSpreadsheetFormatError.
 */
export async function parseXlsxBuffer(
  buffer: Buffer,
  filename?: string
): Promise<ParsedSpreadsheetResult[]> {
  if (filename) {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
    if (ext === ".xls") {
      throw new UnsupportedSpreadsheetFormatError(filename);
    }
    if (ext !== ".xlsx") {
      throw new UnsupportedSpreadsheetFormatError(filename);
    }
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as any);
  } catch (err) {
    throw new UnsupportedSpreadsheetFormatError(filename);
  }

  const results: ParsedSpreadsheetResult[] = [];
  const sheetCount = Math.min(workbook.worksheets.length, IMPORT_LIMITS.maxSheets);

  for (let sIndex = 0; sIndex < sheetCount; sIndex++) {
    const worksheet = workbook.worksheets[sIndex];
    if (!worksheet || worksheet.rowCount <= 1) continue;

    const headers: string[] = [];
    const rows: Record<string, any>[] = [];

    const headerRow = worksheet.getRow(1);
    const colCount = Math.min(headerRow.cellCount, IMPORT_LIMITS.maxColumns);

    for (let c = 1; c <= colCount; c++) {
      const val = headerRow.getCell(c).value;
      const headerText = val ? String(val).trim() : `col_${c}`;
      headers.push(headerText);
    }

    const rowCount = Math.min(worksheet.rowCount, IMPORT_LIMITS.maxRowsPerSheet);
    let cellCounter = 0;

    for (let r = 2; r <= rowCount; r++) {
      if (cellCounter > IMPORT_LIMITS.maxCellsPerSheet) break;

      const row = worksheet.getRow(r);
      const rowData: Record<string, any> = {};
      let hasData = false;

      for (let c = 1; c <= headers.length; c++) {
        cellCounter++;
        const rawValue = row.getCell(c).value;

        // Clean cell value
        let cleanValue: any = null;
        if (rawValue !== null && rawValue !== undefined) {
          if (typeof rawValue === "object" && "result" in rawValue) {
            cleanValue = rawValue.result;
          } else if (typeof rawValue === "object" && "text" in rawValue) {
            cleanValue = rawValue.text;
          } else {
            cleanValue = rawValue;
          }
        }

        if (cleanValue !== null && cleanValue !== undefined && String(cleanValue).trim() !== "") {
          hasData = true;
          rowData[headers[c - 1]] = cleanValue;
        } else {
          rowData[headers[c - 1]] = null;
        }
      }

      if (hasData) {
        rows.push(rowData);
      }
    }

    results.push({
      sheetName: worksheet.name,
      headers,
      rows,
      totalRows: rows.length,
    });
  }

  return results;
}
