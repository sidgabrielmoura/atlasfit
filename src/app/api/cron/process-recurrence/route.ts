import { retainImportSourcePayloads } from "@/lib/migration/source-retention";
import { recordCronResult, recordCronFailure } from "@/lib/cron-health";
import { NextResponse } from "next/server";
import { processRecurringPayments, processPlatformManualSuspensions } from "@/lib/recurrence";
import { isCronAuthorized } from "@/lib/cron-authorization";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 });
  }

  const started = Date.now();
  try {
    console.log("[Cron] Iniciando processamento de cobranças recorrentes e suspensões manuais...");
    const personal = await processRecurringPayments();
    const manualSuspensions = await processPlatformManualSuspensions();
    const sourceRetention = await retainImportSourcePayloads();
    // GYM lifecycle and recurrence are exclusively handled by gym-recurrence.
    const failed = personal.failed > 0 || (sourceRetention.enabled && (sourceRetention.failures ?? 0) > 0);
    console.log("[Cron] Processamento de recorrências e suspensões concluído.", { personalProcessed: personal.processed, manualSuspensions });
    
    await recordCronResult("process-recurrence", !failed, Date.now() - started);
    return NextResponse.json({ 
      success: !failed,
      personal,
      manualSuspensions,
      sourceRetention,
      message: failed ? "Há etapas pendentes de recuperação." : "Processamento de recorrências concluído."
    }, { status: failed ? 503 : 200 });
  } catch (error) {
    await recordCronFailure("process-recurrence");
    console.error("[RECURRENCE_CRON]", { code: error instanceof Error ? error.name : "UNKNOWN" });
    return NextResponse.json({ 
      success: false, 
      error: "Não foi possível concluir o processamento."
    }, { status: 500 });
  }
}
