export const GEMINI_MODELS = {
  extraction: process.env.GEMINI_EXTRACTION_MODEL ?? "gemini-3-flash-preview",
  extractionFallback: process.env.GEMINI_EXTRACTION_FALLBACK_MODEL ?? "gemini-3-flash-preview",
};
