import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { staffService } from "@/modules/workspaces/application/staff-service";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { gymStaffBody, gymStaffHttpError, parseGymStaffRequest } from "@/modules/workspaces/application/gym-staff-http";

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) }).strict();
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const { token } = parseGymStaffRequest(tokenSchema, Object.fromEntries(new URL(req.url).searchParams));
    const invitation = await staffService.getInvitationByToken(token);
    return NextResponse.json({ valid: true, ...invitation }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return gymStaffHttpError(error); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Entre com a conta destinatária para aceitar." } }, { status: 401 });
    const { token } = parseGymStaffRequest(tokenSchema, await gymStaffBody(req));
    const result = await staffService.acceptInvitation(token, session.user.id);
    await WorkspaceContextService.setActiveWorkspaceCookie(result.workspaceId);
    return NextResponse.json(result);
  } catch (error) { return gymStaffHttpError(error); }
});
