import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { assertPersonalImportJobAccess } from "@/lib/migration/access";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { commitImportJob } from "@/lib/migration/commit.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;

  try {
    await assertPersonalImportJobAccess(jobId);

    const body = await req.json().catch(() => ({}));
    const { commitVersion, idempotencyKey } = body;

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    const versionToUse = commitVersion ?? job.commitVersion;

    const result = await commitImportJob(
      jobId,
      job.workspaceId,
      versionToUse,
      idempotencyKey
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    console.error("[POST commit] Erro:", error);
    return new NextResponse(
      error.message || "Erro ao executar a gravação final da migração.",
      { status: 500 }
    );
  }
}
