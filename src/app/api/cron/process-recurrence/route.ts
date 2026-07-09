import { NextResponse } from "next/server";
import { processRecurringPayments } from "@/lib/recurrence";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const providedToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : keyParam;

  if (cronSecret && providedToken !== cronSecret) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    console.log("[Cron] Iniciando processamento de cobranças recorrentes...");
    await processRecurringPayments();
    console.log("[Cron] Processamento de cobranças recorrentes concluído com sucesso.");
    
    return NextResponse.json({ 
      success: true, 
      message: "Processamento de recorrências executado com sucesso." 
    });
  } catch (error: any) {
    console.error("[Cron] Falha no processamento de cobranças recorrentes:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erro desconhecido" 
    }, { status: 500 });
  }
}
