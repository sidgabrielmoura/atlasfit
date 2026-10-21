import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { issueGuardianInvitationSchema } from "@/modules/workspaces/domain/guardian-ingress";
import { issueGuardianInvitation } from "@/modules/workspaces/application/guardian-ingress";
import { guardianIngressRequestError } from "@/modules/workspaces/application/guardian-ingress-http";

export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const invalidRequest = guardianIngressRequestError(req); if (invalidRequest) return invalidRequest;
    const session = await auth();
    if (session?.user?.isImpersonated) return NextResponse.json({ error: { message: "O convite exige acesso direto do operador responsável." } }, { status: 403 });
    const parsed = issueGuardianInvitationSchema.safeParse(await readJsonRequest(req, 4096));
    if (!parsed.success) return NextResponse.json({ error: { message: "Confirme a emissão e a academia." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const { id } = await params;
    return NextResponse.json(await issueGuardianInvitation(context.workspaceId, id, context.userId), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof JsonRequestError) return NextResponse.json({ error: { message: error.message } }, { status: error.statusCode });
    const response = handleWorkspaceAccessError(error); if (response) return response;
    console.error("guardian invitation issue failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: { message: "Não foi possível emitir o convite." } }, { status: 500 });
  }
});
