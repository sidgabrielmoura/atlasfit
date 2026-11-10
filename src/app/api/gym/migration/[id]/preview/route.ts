import { withRequestMemo } from "@/lib/request-memo";
import { assertImportJobAccess } from "@/lib/migration/access";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateCommitPreview } from "@/lib/migration/commit.service";
import { getGymUnitAccess } from "@/modules/workspaces/application/gym-unit-access";

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
    await assertImportJobAccess(jobId);

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    const preview = await generateCommitPreview(jobId, job.workspaceId);
    const scope = await getGymUnitAccess(prisma, job.workspaceId, session.user.id, "students.manage");
    return NextResponse.json({ ...preview, commitVersion: job.commitVersion, availableUnits: scope.units.filter(unit => unit.canManageStudents).map(unit => ({ id: unit.id, name: unit.name })) });
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    return new NextResponse(error.message || "Erro ao gerar preview de confirmação.", { status: 500 });
  }
}

async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handlePreview(req, params);
}
export const GET = withRequestMemo(handleGET);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handlePreview(req, params);
}
