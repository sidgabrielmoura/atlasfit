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
    const body = z.object({ workspaceId: z.string().min(1).max(100), csvContent: z.string().min(1).max(2 * 1024 * 1024), unitId: z.string().min(1).max(100).optional() }).strict().safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: { code: "INVALID_IMPORT", message: "Informe academia, unidade e um CSV de até 2 MB." } }, { status: 400 });
    const { workspaceId, csvContent, unitId } = body.data;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: { code: "CSV_CONTENT_REQUIRED", message: "Conteúdo do arquivo CSV é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
      unitId,
    });

    const preview = await GymImportService.previewImport({
      workspaceId: context.workspaceId,
      csvContent,
      unitId,
      actorUserId: context.userId,
    });

    return NextResponse.json({ data: preview });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_IMPORT_PREVIEW_ERROR]", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "IMPORT_PREVIEW_FAILED", message: "Falha ao processar prévia da importação. Tente novamente." } },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
});
