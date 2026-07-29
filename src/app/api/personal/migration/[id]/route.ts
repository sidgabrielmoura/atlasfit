import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
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

    // Verify workspace authorization
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: job.workspaceId,
      },
    });

    if (!member) {
      return new NextResponse("Acesso negado a este job.", { status: 403 });
    }

    return NextResponse.json(job);
  } catch (error) {
    return new NextResponse("Erro ao consultar job de migração.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
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
    return new NextResponse("Erro ao cancelar job.", { status: 500 });
  }
}
