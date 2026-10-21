import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { staffService } from "@/modules/workspaces/application/staff-service";
import { gymStaffUpdateSchema, gymStaffOffboardSchema } from "@/modules/workspaces/domain/gym-staff-contract";
import { gymStaffBody, gymStaffContext, gymStaffHttpError, parseGymStaffRequest } from "@/modules/workspaces/application/gym-staff-http";

export const GET = withAuditedRequest(async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await gymStaffContext(req);
    return NextResponse.json(await staffService.getStaffMember(context.workspaceId, (await params).id, context.userId));
  } catch (error) { return gymStaffHttpError(error); }
});
export const PATCH = withAuditedRequest(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = parseGymStaffRequest(gymStaffUpdateSchema, await gymStaffBody(req));
    const context = await gymStaffContext(req, body.workspaceId);
    const result = await staffService.updateStaffMember({ ...body, workspaceId: context.workspaceId, memberId: (await params).id, actorUserId: context.userId });
    return NextResponse.json({ success: true, memberId: result.member.id });
  } catch (error) { return gymStaffHttpError(error); }
});
export const DELETE = withAuditedRequest(async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = parseGymStaffRequest(gymStaffOffboardSchema, await gymStaffBody(req));
    const context = await gymStaffContext(req, body.workspaceId);
    return NextResponse.json(await staffService.offboardStaffMember({ ...body, workspaceId: context.workspaceId, memberId: (await params).id, actorUserId: context.userId }));
  } catch (error) { return gymStaffHttpError(error); }
});
