import { GoogleGenAI } from "@google/genai";

export class GeminiConfigurationError extends Error {
  constructor(message = "GEMINI_API_KEY não foi configurada nas variáveis de ambiente.") {
    super(message);
    this.name = "GeminiConfigurationError";
  }
}

/**
 * Returns a lazy server-safe GoogleGenAI instance.
 * Throws GeminiConfigurationError if GEMINI_API_KEY is missing when invoked.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new GeminiConfigurationError();
  }

  return new GoogleGenAI({
    apiKey,
  });
}
