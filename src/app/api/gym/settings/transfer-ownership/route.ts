import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GymOffboardingService } from "@/modules/workspaces/application/gym-offboarding-service";
import { gymStaffRoleSchema } from "@/modules/workspaces/domain/gym-staff-contract";
import { gymStaffBody, gymStaffContext, gymStaffHttpError, parseGymStaffRequest } from "@/modules/workspaces/application/gym-staff-http";

const transferSchema = z.object({ workspaceId: z.string().min(1).max(100).optional(), targetUserId: z.string().min(1).max(100), demoteCurrentOwnerTo: gymStaffRoleSchema.exclude(["OWNER"]).optional() }).strict();
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = parseGymStaffRequest(transferSchema, await gymStaffBody(req));
    const context = await gymStaffContext(req, body.workspaceId);
    const data = await GymOffboardingService.transferOwnership({ ...body, workspaceId: context.workspaceId, currentOwnerUserId: context.userId, actorUserId: context.userId });
    return NextResponse.json({ data });
  } catch (error) { return gymStaffHttpError(error); }
});
