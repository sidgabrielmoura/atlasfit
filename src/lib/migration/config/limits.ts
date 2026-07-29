export const IMPORT_LIMITS = {
  maxPdfSize: 15 * 1024 * 1024, // 15MB
  maxPdfPages: 25,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxImagesPerJob: 10,
  maxSpreadsheetSize: 10 * 1024 * 1024, // 10MB
  maxSheets: 5,
  maxRowsPerSheet: 1000,
  maxColumns: 50,
  maxCellsPerSheet: 20000,
  maxTextLength: 100000, // 100k chars
  maxBatchSize: 25 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX only
  ],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".csv", ".xlsx"],
};

export const IMPORT_AI_LIMITS = {
  maxAiCallsPerJob: 15,
  maxInputTokensPerJob: 500000,
  maxTotalTokensPerJob: 600000,
  maxFallbackCallsPerJob: 3,
};
