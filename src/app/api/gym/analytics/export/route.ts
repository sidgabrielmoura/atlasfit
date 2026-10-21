import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  GymAnalyticsService,
} from "@/modules/workspaces";

const date = z.union([z.string().date(), z.string().datetime({ offset: true })]);
const exportSchema = z.object({ workspaceId: z.string().trim().min(1).max(100), exportType: z.enum(["STUDENTS", "ENROLLMENTS", "INVOICES", "PAYMENTS"]), startDate: date.optional(), endDate: date.optional(), unitId: z.string().trim().min(1).max(100).optional() }).strict().refine(input => !input.startDate || !input.endDate || new Date(input.startDate) <= new Date(input.endDate), "Período inválido.");

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = exportSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dados de exportação inválidos." } }, { status: 400 });
    const { workspaceId, exportType, startDate, endDate, unitId } = parsed.data;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!exportType) {
      return NextResponse.json(
        { error: { code: "EXPORT_TYPE_REQUIRED", message: "Tipo de exportação é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({ workspaceId });

    const result = await GymAnalyticsService.exportData({
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
      exportType,
      startDate,
      endDate,
      unitId,
    });

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Row-Count": String(result.rowCount),
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Corpo inválido." } }, { status: 400 });
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_ANALYTICS_EXPORT_POST_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao gerar arquivo de exportação." } },
      { status: 500 }
    );
  }
});
