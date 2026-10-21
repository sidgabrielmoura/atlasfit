import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymEnrollmentService } from "@/modules/workspaces";

const bodySchema = z.object({ workspaceId: z.string().trim().min(1).max(100) }).strict();
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const authorizedCron = Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
    let workspaceId: string | undefined;
    if (!authorizedCron) {
      const parsed = bodySchema.safeParse(await req.json());
      if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe a academia a processar." } }, { status: 400 });
      // This command processes every unit of the academy, so a local grant is insufficient.
      const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId, capability: "workspace.manage" });
      workspaceId = context.workspaceId;
    }
    const result = await gymEnrollmentService.processExpiredEnrollments(workspaceId);
    const failed = result.pauses.failures.length > 0;
    return NextResponse.json({ success: !failed, result, executedAt: new Date().toISOString() }, { status: failed ? 503 : 200 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_LIFECYCLE_JOB_FAILED]", { code: "INTERNAL_ERROR" });
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir o ciclo das matrículas." } }, { status: 500 });
  }
});