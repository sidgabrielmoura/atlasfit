import { NextResponse } from "next/server";
import { withAuditedRequest } from "@/lib/audited-request";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { readGymHealthProfile, saveGymHealthProfile } from "@/modules/workspaces/application/gym-health-profile";
const headers = { "Cache-Control": "no-store" };
export const GET = withAuditedRequest(async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" }); return NextResponse.json(await readGymHealthProfile(context.workspaceId, (await params).id, context.userId), { headers }); }
  catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: "Perfil de saúde indisponível." } }, { status: 500, headers }); }
});
export const PATCH = withAuditedRequest(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" }); return NextResponse.json(await saveGymHealthProfile(context.workspaceId, (await params).id, context.userId, await readPrivacyJsonRequest(req, 12000)), { headers }); }
  catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: "Não foi possível salvar o perfil de saúde." } }, { status: 400, headers }); }
});
