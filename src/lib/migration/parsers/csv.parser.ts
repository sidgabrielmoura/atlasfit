import Papa from "papaparse";

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

/**
 * Parses a CSV string or buffer deterministically using PapaParse.
 */
export function parseCsvContent(content: string): ParsedCsvResult {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header) => header.trim(),
  });

  const headers = result.meta.fields || [];
  const rows = (result.data as Record<string, any>[]).filter((row) =>
    Object.values(row).some((val) => val !== null && val !== undefined && val !== "")
  );

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}
