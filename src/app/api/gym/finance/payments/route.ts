import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymInvoiceService } from "@/modules/workspaces";
import { manualPaymentSchema, manualPaymentListSchema } from "@/modules/workspaces/domain/manual-finance-contract";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const parsed = manualPaymentListSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Filtros ou paginação inválidos." } }, { status: 400 });
    const { workspaceId, ...filter } = parsed.data;
    const context = await requireGymWorkspaceAccess({ workspaceId });
    return NextResponse.json(await gymInvoiceService.listPayments(context.workspaceId, filter, context.userId));
  } catch (error) { return gymFinanceHttpFailure(error); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = manualPaymentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise valor, alocações, data e identificação do recebimento." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymInvoiceService.recordInPersonPayment({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});