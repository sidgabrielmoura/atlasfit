import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { staffService } from "@/modules/workspaces/application/staff-service";
import { gymStaffInviteSchema, gymStaffQuerySchema } from "@/modules/workspaces/domain/gym-staff-contract";
import { gymStaffBody, gymStaffContext, gymStaffHttpError, parseGymStaffRequest } from "@/modules/workspaces/application/gym-staff-http";
import { EmailService } from "@/lib/emails/service";
import { getAppBaseUrl } from "@/lib/emails/templates/base-layout";

const roleLabels: Record<string, string> = {
  OWNER: "Diretor / Proprietário",
  MANAGER: "Gerente Geral",
  TRAINER: "Instrutor / Coach",
  RECEPTIONIST: "Recepção",
  FINANCE: "Financeiro",
  ASSISTANT: "Assistente",
};

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const query = parseGymStaffRequest(gymStaffQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
    const context = await gymStaffContext(req, query.workspaceId);
    return NextResponse.json(await staffService.listStaff({ ...query, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) { return gymStaffHttpError(error); }
});

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = parseGymStaffRequest(gymStaffInviteSchema, await gymStaffBody(req));
    const context = await gymStaffContext(req, body.workspaceId);
    const result = await staffService.inviteStaffMember({ ...body, workspaceId: context.workspaceId, invitedById: context.userId });
    
    // Construct absolute invite URL
    const baseUrl = getAppBaseUrl();
    const fullInviteUrl = result.inviteUrl.startsWith("http")
      ? result.inviteUrl
      : `${baseUrl}${result.inviteUrl}`;

    const roleName = roleLabels[result.invitation.role] || result.invitation.role;
    const unitName = result.invitation.unit?.name || null;
    const workspaceName = context.workspaceName || "AtlasFit Gym";

    // Dispatch email invitation via Resend
    const emailResult = await EmailService.sendStaffInvitation({
      to: result.invitation.email,
      workspaceName,
      roleName,
      unitName,
      inviteUrl: fullInviteUrl,
      expiresInHours: 72,
    });

    return NextResponse.json({
      id: result.invitation.id,
      inviteUrl: result.inviteUrl,
      expiresAt: result.expiresAt,
      delivery: emailResult.success ? "EMAIL_SENT" : "MANUAL_LINK",
      emailSent: emailResult.success,
    }, { status: 201 });
  } catch (error) { return gymStaffHttpError(error); }
});
