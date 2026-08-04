export const GEMINI_MODELS = {
  extraction: process.env.GEMINI_EXTRACTION_MODEL ?? "gemini-3.6-flash",
  extractionFallback: process.env.GEMINI_EXTRACTION_FALLBACK_MODEL ?? "gemini-flash-latest",
};
