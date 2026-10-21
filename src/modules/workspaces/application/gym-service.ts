import { createGymUnit, updateGymUnit, listAuthorizedGymUnits } from "./gym-unit-commands";
import { updateGymStaff } from "./staff-mutations";
import { getGymStaffMember } from "./gym-staff-query";
import { mutateGymRole } from "./team-lifecycle";
import prisma from "@/lib/prisma";
import { WorkspaceRole } from "../domain/roles";
import { WorkspaceAccessError } from "../domain/types";
import { ownershipService } from "./ownership-service";

export interface CreateGymUnitInput {
  name: string;
  slug?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
}

export interface UpdateGymUnitInput {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface UpsertStaffProfileInput {
  cref?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  hireDate?: Date | null;
  terminationDate?: Date | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export class GymService {
  /**
   * Creates a new GymUnit inside a gym workspace.
   */
  async createUnit(workspaceId: string, data: CreateGymUnitInput, actorUserId?: string) { return createGymUnit(workspaceId, data, actorUserId); }

  /**
   * Updates an existing GymUnit.
   */
  async updateUnit(workspaceId: string, unitId: string, data: UpdateGymUnitInput, actorUserId?: string) { return updateGymUnit(workspaceId, unitId, data, actorUserId); }

  /**
   * Lists all units belonging to a gym workspace.
   */
  async listUnits(workspaceId: string, includeInactive = false, actorUserId?: string) { return listAuthorizedGymUnits(workspaceId, includeInactive, actorUserId); }

  /**
   * Grants a role to a workspace member (optionally scoped to a specific unit).
   */
  async grantMemberRole(params: {
    workspaceId: string;
    memberId: string;
    role: WorkspaceRole;
    unitId?: string;
    grantedByUserId: string;
  }) { return mutateGymRole({ ...params, actorUserId: params.grantedByUserId, revoke: false }); }

  /**
   * Revokes a role grant from a workspace member.
   * Enforces that the last active OWNER of the workspace cannot be revoked.
   */
  async revokeMemberRole(params: {
    workspaceId: string;
    memberId: string;
    role: WorkspaceRole;
    unitId?: string;
    revokedByUserId: string;
  }) { return mutateGymRole({ ...params, actorUserId: params.revokedByUserId, revoke: true }); }

  /**
   * Upserts the staff profile (CREF, job title, emergency contact) for a workspace member.
   */
  async upsertStaffProfile(memberId: string, data: UpsertStaffProfileInput, actorUserId?: string) {
 if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório.");
 if (data.hireDate !== undefined || data.terminationDate !== undefined) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Use os fluxos de admissão e desligamento para alterar datas de vínculo.");
 const member = await prisma.workspaceMember.findUnique({ where: { id: memberId }, select: { workspaceId: true } });
 if (!member) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Colaborador não encontrado.");
 return (await updateGymStaff({ ...data, workspaceId: member.workspaceId, memberId, actorUserId })).staffProfile;
 }

  /**
   * Gets staff profile by memberId.
   */
  async getStaffProfile(memberId: string, actorUserId?: string) {
 if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório.");
 const member=await prisma.workspaceMember.findUnique({ where: {id:memberId}, select:{workspaceId:true} });
 if(!member) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Colaborador não encontrado.");
 await getGymStaffMember(member.workspaceId, memberId, actorUserId);
 return prisma.gymStaffProfile.findUnique({ where: { memberId } });
 }
}

export const gymService = new GymService();
