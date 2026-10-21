import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuditedRequest } from "@/lib/audited-request";
import { JsonRequestError } from "@/lib/http/read-json";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { listGymPrivacyRequests, processGymPrivacyRequest } from "@/modules/workspaces/application/gym-privacy-requests";
import { requireGymPrivacyAccess } from "@/modules/workspaces/application/gym-privacy-authority";
const headers = { "Cache-Control": "no-store" };
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const context = await requireGymPrivacyAccess(params.get("workspaceId") || "");
    return NextResponse.json(await listGymPrivacyRequests(context.workspaceId, context.userId, Number(params.get("page") || 1)), { headers });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: "Falha ao consultar os pedidos." } }, { status: 500, headers }); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = z.object({ workspaceId: z.string().min(1).max(100), requestId: z.string().min(1).max(100), command: z.unknown() }).strict().parse(await readPrivacyJsonRequest(req, 16000));
    const context = await requireGymPrivacyAccess(body.workspaceId);
    return NextResponse.json({ data: await processGymPrivacyRequest(context.workspaceId, body.requestId, context.userId, body.command) }, { headers });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: e instanceof z.ZodError || e instanceof JsonRequestError ? "Pedido inválido." : "O processamento não terminou. Os registros e a solicitação foram preservados para nova tentativa." } }, { status: e instanceof z.ZodError || e instanceof JsonRequestError ? 400 : 503, headers }); }
});
