import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymInvoiceService } from "@/modules/workspaces";
import { manualPaymentReverseSchema } from "@/modules/workspaces/domain/manual-finance-contract";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paymentId } = await params;
    const parsed = manualPaymentReverseSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe a academia e o motivo da reversão." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymInvoiceService.reversePayment({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId, paymentId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
});