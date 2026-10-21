import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, GymAnalyticsService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

const id = z.string().trim().min(1).max(100);
const date = z.union([z.string().date(), z.string().datetime({ offset: true })]);
const querySchema = z.object({
  workspaceId: id, unitId: id.optional(), assignedStaffId: id.optional(),
  startDate: date.optional(), endDate: date.optional(), timezone: z.string().trim().min(1).max(80).optional(),
}).strict();

export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a unidade e o período do relatório." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const data = await GymAnalyticsService.getOverview({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId });
    return NextResponse.json({ data });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
