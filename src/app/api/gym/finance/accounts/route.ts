import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { getGymUnitAccess } from "@/modules/workspaces/application/gym-unit-access";
import { createInternalAccountRequestSchema } from "@/modules/workspaces/application/cash-mutations";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const parsed = z.object({ workspaceId: z.string().trim().min(1).max(100) }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const scope = await getGymUnitAccess(prisma, context.workspaceId, context.userId, "invoices.read");
    const accounts = await gymCashExpenseService.listFinancialAccounts(context.workspaceId, context.userId);
    return NextResponse.json({ accounts, units: scope.units.map(unit => ({ id: unit.id, name: unit.name })), includeUnassigned: scope.includeUnassigned });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = createInternalAccountRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a conta e seus valores." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.createFinancialAccount({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
