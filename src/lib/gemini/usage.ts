import prisma from "@/lib/prisma";

export interface TrackUsageParams {
  importJobId: string;
  userId?: string | null;
  model: string;
  purpose: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  thinkingTokens?: number;
  durationMs: number;
  success?: boolean;
}

/**
 * Persists token usage and timing metadata to GeminiUsageLog table without PII.
 */
export async function trackGeminiUsage(params: TrackUsageParams) {
  try {
    const input = params.inputTokens ?? 0;
    const output = params.outputTokens ?? 0;
    const cached = params.cachedTokens ?? 0;
    const thinking = params.thinkingTokens ?? 0;
    const total = input + output + cached + thinking;

    await prisma.geminiUsageLog.create({
      data: {
        importJobId: params.importJobId,
        userId: params.userId ?? null,
        model: params.model,
        purpose: params.purpose,
        inputTokens: input,
        outputTokens: output,
        cachedTokens: cached,
        thinkingTokens: thinking,
        totalTokens: total,
        durationMs: params.durationMs,
        success: params.success ?? true,
      },
    });
  } catch (error) {
    // Log technical warning without throwing to keep extraction flow alive
    console.error("[GeminiUsageLog] Falha ao registrar log de uso de tokens:", error);
  }
}
