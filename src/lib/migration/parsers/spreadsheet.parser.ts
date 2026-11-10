import ExcelJS from "exceljs";
import JSZip from "jszip";
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
 * Normalizes an XLSX ZIP buffer to fix known OpenPyXL / LibreOffice / Pandas quirks:
 * 1. Strips `<x:` namespace prefixes that cause ExcelJS to fail.
 * 2. Normalizes relationship targets (e.g. `/xl/worksheets/sheet1.xml` -> `worksheets/sheet1.xml`).
 */
export async function normalizeXlsxBuffer(buffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    let modified = false;

    const xmlFileNames = Object.keys(zip.files).filter(
      (name) => name.endsWith(".xml") || name.endsWith(".rels")
    );

    for (const name of xmlFileNames) {
      const file = zip.file(name);
      if (!file) continue;
      let content = await file.async("text");
      let changed = false;

      // 1. Remove x: namespace prefix on tags: <x:tag -> <tag and </x:tag -> </tag
      if (content.includes("<x:") || content.includes("</x:") || content.includes("xmlns:x=")) {
        content = content
          .replace(/<x:([a-zA-Z0-9_-]+)/g, "<$1")
          .replace(/<\/x:([a-zA-Z0-9_-]+)>/g, "</$1>")
          .replace(/xmlns:x=/g, "xmlns=");
        changed = true;
      }

      // 2. Fix Targets in relationships
      if (name.endsWith(".rels")) {
        if (name.includes("xl/_rels/workbook.xml.rels")) {
          // Targets in xl/_rels/workbook.xml.rels are relative to xl/
          if (content.includes('Target="/xl/')) {
            content = content.replace(/Target="\/xl\//g, 'Target="');
            changed = true;
          }
        } else if (name.includes("worksheets/_rels/")) {
          // Targets in xl/worksheets/_rels/ are relative to xl/worksheets/
          if (content.includes('Target="/xl/')) {
            content = content.replace(/Target="\/xl\//g, 'Target="../');
            changed = true;
          }
        } else if (content.includes('Target="/xl/')) {
          content = content.replace(/Target="\/xl\//g, 'Target="');
          changed = true;
        }
      }

      if (changed) {
        zip.file(name, content);
        modified = true;
      }
    }

    if (modified) {
      return await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
    }
  } catch (err) {
    // If normalization fails, return original buffer and let ExcelJS attempt to load it
  }

  return buffer;
}

export function extractCellValue(rawValue: any): any {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "object") {
    if ("result" in rawValue && rawValue.result !== undefined && rawValue.result !== null) {
      return typeof rawValue.result === "string" ? rawValue.result.trim() : rawValue.result;
    }
    if ("text" in rawValue && rawValue.text !== undefined && rawValue.text !== null) {
      return String(rawValue.text).trim();
    }
    if ("richText" in rawValue && Array.isArray(rawValue.richText)) {
      return rawValue.richText.map((t: any) => t.text || "").join("").trim();
    }
    if ("hyperlink" in rawValue && rawValue.text) {
      return String(rawValue.text).trim();
    }
  }
  if (typeof rawValue === "string") {
    return rawValue.trim();
  }
  return rawValue;
}

/**
 * Parses an XLSX buffer deterministically using ExcelJS.
 * Automatically normalizes namespaces and detects header rows with title offsets.
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

  const cleanBuffer = await normalizeXlsxBuffer(buffer);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(cleanBuffer as any);
  } catch (err) {
    // Retry with original buffer in case normalization was somehow problematic
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      throw new UnsupportedSpreadsheetFormatError(filename);
    }
  }

  const results: ParsedSpreadsheetResult[] = [];
  const sheetCount = Math.min(workbook.worksheets.length, IMPORT_LIMITS.maxSheets);

  for (let sIndex = 0; sIndex < sheetCount; sIndex++) {
    const worksheet = workbook.worksheets[sIndex];
    if (!worksheet || worksheet.rowCount <= 1) continue;

    // Detect header row (first row with at least 2 non-empty cells in the first 10 rows)
    let headerRowIdx = 1;
    let maxColsFound = 0;

    for (let r = 1; r <= Math.min(worksheet.rowCount, 10); r++) {
      const row = worksheet.getRow(r);
      let count = 0;
      for (let c = 1; c <= Math.min(row.cellCount, IMPORT_LIMITS.maxColumns); c++) {
        const val = extractCellValue(row.getCell(c).value);
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          count++;
        }
      }
      if (count > maxColsFound && count >= 2) {
        maxColsFound = count;
        headerRowIdx = r;
      }
    }

    const headers: string[] = [];
    const rows: Record<string, any>[] = [];

    const headerRow = worksheet.getRow(headerRowIdx);
    const colCount = Math.min(Math.max(headerRow.cellCount, worksheet.columnCount), IMPORT_LIMITS.maxColumns);

    for (let c = 1; c <= colCount; c++) {
      const val = extractCellValue(headerRow.getCell(c).value);
      const headerText = val ? String(val).trim() : (headers.length > 0 && c <= maxColsFound ? `col_${c}` : "");
      if (headerText) {
        headers.push(headerText);
      }
    }

    if (headers.length === 0) continue;

    const rowCount = Math.min(worksheet.rowCount, IMPORT_LIMITS.maxRowsPerSheet);
    let cellCounter = 0;

    for (let r = headerRowIdx + 1; r <= rowCount; r++) {
      if (cellCounter > IMPORT_LIMITS.maxCellsPerSheet) break;

      const row = worksheet.getRow(r);
      const rowData: Record<string, any> = {};
      let hasData = false;

      for (let c = 1; c <= headers.length; c++) {
        cellCounter++;
        const cleanValue = extractCellValue(row.getCell(c).value);

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

/**
 * Converts parsed spreadsheet results to a clean Markdown/pipe table representation
 * ideal for Gemini AI consumption when deterministic parsing has unrecognized columns.
 */
export function spreadsheetToStructuredText(sheets: ParsedSpreadsheetResult[]): string {
  let output = "";
  for (const sheet of sheets) {
    if (!sheet.rows || sheet.rows.length === 0) continue;
    output += `\n--- ABA: ${sheet.sheetName} ---\n`;
    output += sheet.headers.join(" | ") + "\n";
    for (const row of sheet.rows) {
      const rowVals = sheet.headers.map((h) => {
        const val = row[h];
        return val !== null && val !== undefined ? String(val).trim() : "";
      });
      output += rowVals.join(" | ") + "\n";
    }
  }
  return output.trim();
}

