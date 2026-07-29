import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

function getAgentDisplayName(purpose: string): string {
  const p = (purpose || "").toLowerCase();
  if (p.includes("extraction") || p.includes("ocr") || p.includes("migra")) {
    return "Agente de Migração & OCR";
  }
  if (p.includes("fragment") || p.includes("fallback")) {
    return "Agente de Leitura Fragmentada";
  }
  if (p.includes("workout") || p.includes("treino") || p.includes("prescrip")) {
    return "Agente de Prescrição de Treinos";
  }
  if (p.includes("nutri") || p.includes("dieta")) {
    return "Agente de Nutrição & Dieta";
  }
  if (p.includes("copilot") || p.includes("suporte")) {
    return "Agente Copilot & Suporte";
  }
  return `Agente (${purpose})`;
}

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const logs = await prisma.geminiUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter((l) => l.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedTokens = 0;
    let totalThinkingTokens = 0;
    let totalDurationMs = 0;

    const agentStatsMap: Record<string, { requests: number; tokens: number; durationMs: number; errors: number }> = {};
    const dailyStatsMap: Record<string, { date: string; input: number; output: number; thinking: number; cost: number }> = {};

    logs.forEach((log) => {
      totalInputTokens += log.inputTokens || 0;
      totalOutputTokens += log.outputTokens || 0;
      totalCachedTokens += log.cachedTokens || 0;
      totalThinkingTokens += log.thinkingTokens || 0;
      totalDurationMs += log.durationMs || 0;

      const agentName = getAgentDisplayName(log.purpose);
      if (!agentStatsMap[agentName]) {
        agentStatsMap[agentName] = { requests: 0, tokens: 0, durationMs: 0, errors: 0 };
      }
      agentStatsMap[agentName].requests += 1;
      agentStatsMap[agentName].tokens += log.totalTokens || 0;
      agentStatsMap[agentName].durationMs += log.durationMs || 0;
      if (!log.success) agentStatsMap[agentName].errors += 1;

      const dateStr = new Date(log.createdAt).toISOString().split("T")[0];
      if (!dailyStatsMap[dateStr]) {
        dailyStatsMap[dateStr] = { date: dateStr, input: 0, output: 0, thinking: 0, cost: 0 };
      }
      dailyStatsMap[dateStr].input += log.inputTokens || 0;
      dailyStatsMap[dateStr].output += log.outputTokens || 0;
      dailyStatsMap[dateStr].thinking += log.thinkingTokens || 0;

      const logCostUsd = ((log.inputTokens || 0) * 0.000000075) + (((log.outputTokens || 0) + (log.thinkingTokens || 0)) * 0.0000003);
      dailyStatsMap[dateStr].cost += logCostUsd * 5.6;
    });

    const totalTokensSum = totalInputTokens + totalOutputTokens + totalCachedTokens + totalThinkingTokens;
    const avgLatencyMs = totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0;
    const estimatedCostUsd = (totalInputTokens * 0.000000075) + ((totalOutputTokens + totalThinkingTokens) * 0.0000003);
    const estimatedCostBrl = estimatedCostUsd * 5.6;

    const dailyChartData = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date));

    const agentDistribution = Object.entries(agentStatsMap).map(([name, data]) => ({
      name,
      requests: data.requests,
      tokens: data.tokens,
      avgLatencyMs: data.requests > 0 ? Math.round(data.durationMs / data.requests) : 0,
      errors: data.errors,
    }));

    return NextResponse.json({
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: Number(successRate.toFixed(1)),
        avgLatencyMs,
        totalInputTokens,
        totalOutputTokens,
        totalCachedTokens,
        totalThinkingTokens,
        totalTokensSum,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
        estimatedCostBrl: Number(estimatedCostBrl.toFixed(2)),
      },
      dailyChartData,
      agentDistribution,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar métricas de IA." }, { status: 500 });
  }
}
