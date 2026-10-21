import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { listGymInvitations } from "@/modules/workspaces/application/gym-staff-query";
import { gymStaffQuerySchema } from "@/modules/workspaces/domain/gym-staff-contract";
import { gymStaffContext, gymStaffHttpError, parseGymStaffRequest } from "@/modules/workspaces/application/gym-staff-http";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const query = parseGymStaffRequest(gymStaffQuerySchema.omit({ search: true, role: true }), Object.fromEntries(new URL(req.url).searchParams));
    const context = await gymStaffContext(req, query.workspaceId);
    return NextResponse.json(await listGymInvitations(context.workspaceId, context.userId, query.page, query.limit, query.unitId));
  } catch (error) { return gymStaffHttpError(error); }
});
