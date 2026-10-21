import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { assertPersonalImportJobAccess } from "@/lib/migration/access";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateCommitPreview } from "@/lib/migration/commit.service";

async function handlePreview(
  req: Request,
  params: Promise<{ id: string }>
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;

  try {
    await assertPersonalImportJobAccess(jobId);

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    const preview = await generateCommitPreview(jobId, job.workspaceId);
    return NextResponse.json(preview);
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    return new NextResponse(error.message || "Erro ao gerar preview de confirmação.", { status: 500 });
  }
}

async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  return handlePreview(req, params);
}
export const GET = withRequestMemo(handleGET);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  return handlePreview(req, params);
}
