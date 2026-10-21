import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess as requireWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { workspaceBrandingSchema } from "@/modules/workspaces/domain/branding";
import { updateWorkspaceBranding, workspaceBrandingSelect } from "@/modules/workspaces/application/branding-service";

export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId") || undefined;
    if (!workspaceId) return NextResponse.json({ error: { code: "WORKSPACE_REQUIRED" } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId, capability: "workspace.manage" });
    return NextResponse.json({ data: await prisma.workspace.findUnique({ where: { id: context.workspaceId, type: "GYM" }, select: workspaceBrandingSelect }) });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível carregar a marca." } }, { status: 500 }); }
});
export const PATCH = withAuditedRequest(async function PATCH(request: Request) {
  try {
    const input = z.object({ workspaceId: z.string().min(1), branding: workspaceBrandingSchema }).strict().safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: input.error.issues[0]?.message } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: input.data.workspaceId, capability: "workspace.manage" });
    const workspace = await updateWorkspaceBranding(context.workspaceId, context.userId, "GYM", input.data.branding);
    return NextResponse.json({ data: workspace });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível salvar a marca." } }, { status: 500 }); }
});
