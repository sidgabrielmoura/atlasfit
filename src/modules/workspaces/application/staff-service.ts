import { createHash } from "node:crypto";
import type { WorkspaceRole } from "../domain/roles";
import { WorkspaceAccessError } from "../domain/types";
import { reassignGymStudents, offboardGymStaff } from "./team-lifecycle";
import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff, revokeGymInvitation } from "./staff-mutations";
import { listGymStaff, getGymStaffMember } from "./gym-staff-query";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";

export interface InviteStaffInput {
  workspaceId: string; email: string; role: WorkspaceRole; unitId?: string | null; invitedById: string;
  cref?: string | null; jobTitle?: string | null;
}
export interface UpdateStaffInput {
  workspaceId: string; memberId: string; actorUserId: string; unitId?: string | null; role?: WorkspaceRole;
  cref?: string | null; jobTitle?: string | null; bio?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null;
}
export interface OffboardStaffInput {
  workspaceId: string; memberId: string; actorUserId: string; replacementStaffMemberId?: string | null; reason?: string;
}
export interface ReassignStudentsInput {
  workspaceId: string; fromStaffMemberId: string; toStaffMemberId?: string | null; studentMemberIds?: string[]; actorUserId: string;
}

export class StaffService {
  static hashToken(rawToken: string) { return createHash("sha256").update(rawToken).digest("hex"); }
  async inviteStaffMember(input: InviteStaffInput) { return inviteGymStaff(input); }
  async acceptInvitation(rawToken: string, userId: string) { return acceptGymStaffInvitation(rawToken, userId); }
  async revokeInvitation(invitationId: string, workspaceId: string, actorUserId: string) { return revokeGymInvitation(invitationId, workspaceId, actorUserId); }
  async listStaff(options: Parameters<typeof listGymStaff>[0]) { return listGymStaff(options); }
  async getStaffMember(workspaceId: string, memberId: string, actorUserId: string) { return getGymStaffMember(workspaceId, memberId, actorUserId); }
  async updateStaffMember(input: UpdateStaffInput) { return updateGymStaff(input); }
  async offboardStaffMember(input: OffboardStaffInput) { return offboardGymStaff(input); }
  async reassignStudents(input: ReassignStudentsInput) { return reassignGymStudents(input); }

  /** Public token lookup is read-only and returns no token hash or internal profile. */
  async getInvitationByToken(rawToken: string) {
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) throw new WorkspaceAccessError(400, "INVALID_TOKEN", "Convite inválido.");
    return serializableTransaction(async tx => {
      const invitation = await tx.workspaceInvitation.findUnique({ where: { tokenHash: StaffService.hashToken(rawToken) }, select: {
        email: true, role: true, status: true, expiresAt: true, invitedBy: true, workspaceId: true, unitId: true,
        workspace: { select: { id: true, name: true, slug: true, logoUrl: true, type: true } },
        unit: { select: { id: true, name: true, code: true } },
      } });
      if (!invitation) throw new WorkspaceAccessError(404, "INVITATION_NOT_FOUND", "Convite não encontrado.");
      if (invitation.status !== "PENDING") throw new WorkspaceAccessError(409, "INVITATION_NOT_PENDING", "Convite já utilizado ou revogado.");
      if (invitation.expiresAt <= new Date()) throw new WorkspaceAccessError(410, "INVITATION_EXPIRED", "Convite expirado.");
      await assertActorAuthority(tx, invitation.workspaceId, invitation.invitedBy, "staff.manage", invitation.unitId);
      const [name, domain] = invitation.email.split("@");
      return { workspace: invitation.workspace, role: invitation.role, unit: invitation.unit, email: `${name.slice(0, 2)}***@${domain}`, expiresAt: invitation.expiresAt };
    });
  }
}
export const staffService = new StaffService();
