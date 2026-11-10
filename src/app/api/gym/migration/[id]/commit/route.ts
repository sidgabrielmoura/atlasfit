import { assertImportJobAccess } from "@/lib/migration/access";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { prepareGymMigrationCommit } from "@/modules/workspaces/application/gym-migration-commit";
import { importCommitStreamResponse } from "@/lib/migration/commit-stream-response";
import { z } from "zod";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
export const maxDuration = 300;

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

    const parsed = z.object({ commitVersion: z.number().int().nonnegative().optional(), idempotencyKey: z.string().max(128).optional(), unitId: z.string().min(1).max(100).optional() }).strict().safeParse(await readPrivacyJsonRequest(req, 2048));
    if (!parsed.success) return new NextResponse("Confirmação inválida.", { status: 400 });
    const { commitVersion, unitId } = parsed.data;

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    const versionToUse = commitVersion ?? job.commitVersion;

    const run = await prepareGymMigrationCommit({ jobId, workspaceId: job.workspaceId, actorUserId: session.user.id, commitVersion: versionToUse, unitId });
    if (req.headers.get("accept")?.includes("application/x-ndjson")) return importCommitStreamResponse(run, req.signal);
    return NextResponse.json(await run());
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[POST gym commit] Erro:", error);
    return new NextResponse(
      error.message || "Erro ao executar a gravação final da migração.",
      { status: 500 }
    );
  }
}
