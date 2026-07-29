import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processImportJob } from "@/lib/migration/extraction.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    // Trigger process in backend
    const processedJob = await processImportJob(jobId, job.workspaceId);
    return NextResponse.json(processedJob);
  } catch (error: any) {
    console.error("[POST process] Erro:", error);
    const errStr = String(error?.message || "") + " " + JSON.stringify(error || {});
    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      errStr.includes("429") ||
      errStr.includes("RESOURCE_EXHAUSTED") ||
      errStr.includes("prepayment credits");

    const safeMessage = isRateLimit
      ? "Os créditos ou a cota da sua API do Gemini no Google AI Studio estão esgotados (Erro 429). Para processar PDFs ou Fotos por IA, adicione créditos em ai.studio/projects. Dica: Planilhas em CSV ou XLSX funcionam 100% localmente sem consumir créditos!"
      : error.message || "Erro ao processar extração do job de migração.";

    return NextResponse.json(
      { error: safeMessage, errorCode: isRateLimit ? "GEMINI_RATE_LIMIT" : "EXTRACTION_FAILED" },
      { status: isRateLimit ? 429 : 400 }
    );
  }
}
