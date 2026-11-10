import { assertImportJobAccess } from "@/lib/migration/access";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";

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
    await assertImportJobAccess(jobId);

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        workspaceId: true,
        status: true,
        creditsConsumed: true,
        totalStudents: true,
        totalWorkouts: true,
      },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    if (job.status !== "PROCESSING" && job.status !== "UPLOADED") {
      await publishToChannel(`migration:${job.workspaceId}`, "job_updated", {
        jobId: job.id,
        status: job.status,
      }).catch(() => {});

      const statusMap: Record<string, string> = {
        FAILED: "A importação já falhou e não está mais em andamento.",
        COMPLETED: "A importação já foi finalizada com sucesso.",
        PARTIAL: "A importação já está pausada.",
        CANCELLED: "A importação foi cancelada.",
        REVIEW: "A importação já foi processada e está pronta para revisão.",
      };

      return NextResponse.json(
        {
          error: statusMap[job.status] || `Apenas importações ativas podem ser pausadas (status atual: ${job.status}).`,
          currentStatus: job.status,
        },
        { status: 400 }
      );
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "PARTIAL",
        processingStep: "IDLE",
        pauseReason: "MANUAL_PAUSE",
        pausedAt: new Date(),
      },
    });

    await publishToChannel(`migration:${job.workspaceId}`, "job_updated", {
      jobId: job.id,
      status: "PARTIAL",
      processingStep: "IDLE",
      pauseReason: "MANUAL_PAUSE",
      progressMessage: "Importação pausada manualmente pelo usuário.",
      totalStudents: job.totalStudents,
      totalWorkouts: job.totalWorkouts,
      creditsConsumed: job.creditsConsumed,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "PARTIAL",
      pauseReason: "MANUAL_PAUSE",
    });
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[POST /api/gym/migration/[id]/pause] Erro:", error);
    return new NextResponse(error.message || "Erro ao pausar importação.", { status: 500 });
  }
}
