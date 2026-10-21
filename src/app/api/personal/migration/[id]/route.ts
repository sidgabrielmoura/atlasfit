import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { assertPersonalImportJobAccess } from "@/lib/migration/access";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    await assertPersonalImportJobAccess(id);

    const job = await prisma.importJob.findUnique({
      where: { id },
      include: {
        sources: {
          select: {
            id: true,
            type: true,
            status: true,
            originalName: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    return new NextResponse("Erro ao consultar job de migração.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    await assertPersonalImportJobAccess(id);

    const job = await prisma.importJob.findUnique({
      where: { id },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    await prisma.importJob.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    return new NextResponse("Erro ao cancelar job.", { status: 500 });
  }
}
