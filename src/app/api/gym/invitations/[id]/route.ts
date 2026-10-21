import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { staffService } from "@/modules/workspaces/application/staff-service";
import { gymStaffContext, gymStaffHttpError } from "@/modules/workspaces/application/gym-staff-http";

export const DELETE = withAuditedRequest(async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await gymStaffContext(req);
    const result = await staffService.revokeInvitation((await params).id, context.workspaceId, context.userId);
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) { return gymStaffHttpError(error); }
});
