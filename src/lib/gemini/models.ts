export const GEMINI_MODELS = {
  extraction: process.env.GEMINI_EXTRACTION_MODEL ?? "gemini-2.5-flash",
  extractionFallback: process.env.GEMINI_EXTRACTION_FALLBACK_MODEL ?? "gemini-1.5-flash",
};
