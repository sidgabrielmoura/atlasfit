import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateCommitPreview } from "@/lib/migration/commit.service";

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

    const preview = await generateCommitPreview(jobId, job.workspaceId);
    return NextResponse.json(preview);
  } catch (error: any) {
    return new NextResponse(error.message || "Erro ao gerar preview de confirmação.", { status: 500 });
  }
}
