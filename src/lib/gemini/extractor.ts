import { getGeminiClient } from "./client";
import { GEMINI_MODELS } from "./models";
import { MIGRATION_EXTRACTION_PROMPT_V1 } from "./prompts/migration-extraction.v1";
import {
  GEMINI_RESPONSE_SCHEMA,
  ZMigrationExtractionResponse,
  MigrationExtractionResponse,
} from "./schemas/migration-schema";
import { trackGeminiUsage } from "./usage";

export interface MigrationExtractionInput {
  importJobId: string;
  userId?: string | null;
  textContent?: string;
  inlineFiles?: Array<{
    mimeType: string;
    dataBase64: string;
  }>;
  remoteFiles?: Array<{
    geminiFileName: string;
    mimeType: string;
  }>;
  useFallbackModel?: boolean;
  purpose?: string;
}

export interface MigrationExtractor {
  extract(input: MigrationExtractionInput): Promise<MigrationExtractionResponse>;
}

export class GeminiMigrationExtractor implements MigrationExtractor {
  async extract(input: MigrationExtractionInput): Promise<MigrationExtractionResponse> {
    const startTime = Date.now();
    const modelName = input.useFallbackModel
      ? GEMINI_MODELS.extractionFallback
      : GEMINI_MODELS.extraction;

    const client = getGeminiClient();

    const userParts: any[] = [];

    if (input.textContent && input.textContent.trim()) {
      userParts.push({ text: `DOCUMENTO TEXTUAL:\n${input.textContent}` });
    }

    if (input.inlineFiles && input.inlineFiles.length > 0) {
      for (const file of input.inlineFiles) {
        userParts.push({
          inlineData: {
            mimeType: file.mimeType || "image/jpeg",
            data: file.dataBase64,
          },
        });
      }
    }

    if (input.remoteFiles && input.remoteFiles.length > 0) {
      for (const rFile of input.remoteFiles) {
        userParts.push({
          fileData: {
            fileUri: rFile.geminiFileName,
            mimeType: rFile.mimeType,
          },
        });
      }
    }

    if (userParts.length === 0) {
      userParts.push({ text: "Analise o documento enviado e extraia todos os alunos, treinos e exercícios presentes." });
    }

    try {
      const timeoutMs = 45000;
      const generatePromise = client.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: userParts,
          },
        ],
        config: {
          systemInstruction: MIGRATION_EXTRACTION_PROMPT_V1,
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA as any,
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Tempo limite de extração por IA excedido (45 segundos). Tente novamente."));
        }, timeoutMs);
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      const durationMs = Date.now() - startTime;

      // Extract usage metadata if available
      const usage = (response as any).usageMetadata || {};
      await trackGeminiUsage({
        importJobId: input.importJobId,
        userId: input.userId,
        model: modelName,
        purpose: input.purpose || (input.useFallbackModel ? "fragment_fallback" : "extraction"),
        inputTokens: usage.promptTokenCount ?? 0,
        outputTokens: usage.candidatesTokenCount ?? 0,
        cachedTokens: usage.cachedContentTokenCount ?? 0,
        thinkingTokens: usage.thinkingTokenCount ?? 0,
        durationMs,
        success: true,
      });

      const responseText = response.text || "{}";
      const parsedJson = JSON.parse(responseText);

      // Validate structured output with Zod
      const validated = ZMigrationExtractionResponse.parse(parsedJson);
      return validated;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await trackGeminiUsage({
        importJobId: input.importJobId,
        userId: input.userId,
        model: modelName,
        purpose: input.purpose || "extraction_failed",
        durationMs,
        success: false,
      });

      throw error;
    }
  }
}
