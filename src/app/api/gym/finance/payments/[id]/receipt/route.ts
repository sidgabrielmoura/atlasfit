import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, gymInvoiceService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

const querySchema = z.object({ workspaceId: z.string().trim().min(1).max(100) }).strict();
export const GET = withAuditedRequest(async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paymentId } = await params;
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe a academia do recibo." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymInvoiceService.getPaymentReceipt(context.workspaceId, paymentId, context.userId));
  } catch (error) { return gymFinanceHttpFailure(error); }
});