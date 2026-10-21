import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymInvoiceService } from "@/modules/workspaces";
import { manualInvoiceSchema, manualInvoiceListSchema } from "@/modules/workspaces/domain/manual-finance-contract";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const parsed = manualInvoiceListSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Filtros ou paginação inválidos." } }, { status: 400 });
    const { workspaceId, ...filter } = parsed.data;
    const context = await requireGymWorkspaceAccess({ workspaceId });
    return NextResponse.json(await gymInvoiceService.listInvoices(context.workspaceId, filter, context.userId));
  } catch (error) { return gymFinanceHttpFailure(error); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = manualInvoiceSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados e valores da fatura." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymInvoiceService.createInvoice({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});