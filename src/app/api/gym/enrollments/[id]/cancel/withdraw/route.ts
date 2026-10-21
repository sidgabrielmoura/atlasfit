import { NextResponse } from "next/server";
import { withAuditedRequest } from "@/lib/audited-request";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { withdrawGymCancellation, withdrawGymCancellationSchema } from "@/modules/workspaces/application/enrollment-cancellation";
export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, parsed = withdrawGymCancellationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Justifique a retirada do cancelamento." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await withdrawGymCancellation({ ...parsed.data, enrollmentId: id, actorUserId: context.userId }));
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Não foi possível retirar o cancelamento." } }, { status: error instanceof SyntaxError ? 400 : 500 }); }
});
