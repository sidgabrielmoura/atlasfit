import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  GymImportService,
} from "@/modules/workspaces";

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = z.object({ workspaceId: z.string().min(1).max(100), previewId: z.string().min(1).max(100), importBatchHash: z.string().regex(/^[a-f0-9]{64}$/), unitId: z.string().min(1).max(100), overrideAmbiguities: z.boolean().optional(), acceptLegacyBalances: z.boolean().optional() }).strict().safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: { code: "INVALID_IMPORT", message: "Use a prévia do servidor. Linhas, valores e ações enviados no commit não são aceitos." } }, { status: 400 });
    const { workspaceId, importBatchHash, previewId, unitId, overrideAmbiguities, acceptLegacyBalances } = body.data;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!importBatchHash || !previewId) {
      return NextResponse.json(
        { error: { code: "INVALID_BATCH_PAYLOAD", message: "Prévia e hash do lote são obrigatórios." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
      unitId,
    });

    const commitResult = await GymImportService.commitImport({
      workspaceId: context.workspaceId,
      importBatchHash,
      previewId,
      unitId,
      actorUserId: context.userId,
      overrideAmbiguities,
      acceptLegacyBalances,
    });

    return NextResponse.json({ data: commitResult });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_IMPORT_COMMIT_ERROR]", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "IMPORT_COMMIT_FAILED", message: "Falha ao concluir a importação. Tente novamente com a mesma prévia." } },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
});
