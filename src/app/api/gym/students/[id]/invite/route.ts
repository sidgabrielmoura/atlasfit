import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { issueStudentInvitation } from "@/modules/workspaces/application/gym-student-ingress";
import { gymStudentInvitationSchema } from "@/modules/workspaces/domain/gym-student-ingress";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { JsonRequestError } from "@/lib/http/read-json";
import { rateLimit } from "@/lib/rate-limit";
import { withAuditedRequest } from "@/lib/audited-request";

export const POST = withAuditedRequest(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id || session.user.isImpersonated) return NextResponse.json({ error: { message: "Entre na própria conta para emitir convites." } }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try {
    const body = gymStudentInvitationSchema.safeParse(await readPrivacyJsonRequest(request, 4096));
    if (!body.success) return NextResponse.json({ error: { message: "Dados do convite inválidos." } }, { status: 400 });
    if (!(await rateLimit(`student-invite:${session.user.id}`, 20, 60000)).success) return NextResponse.json({ error: { message: "Muitas emissões. Aguarde antes de tentar novamente." } }, { status: 429 });
    const context = await requireGymWorkspaceAccess({ workspaceId: body.data.workspaceId });
    const result = await issueStudentInvitation(session.user, (await params).id, { ...body.data, workspaceId: context.workspaceId });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = handleWorkspaceAccessError(error); if (response) return response;
    if (error instanceof JsonRequestError) return NextResponse.json({ error: { message: error.message } }, { status: error.statusCode });
    return NextResponse.json({ error: { message: "Não foi possível emitir o convite. Tente novamente." } }, { status: 500 });
  }
});
