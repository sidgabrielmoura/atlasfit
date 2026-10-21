import { cancelGymStudent, type CancelGymStudentInput } from "./gym-student-offboarding";
import { offboardGymStaff } from "./team-lifecycle";
import { exportGymDataSubject, requestGymDataDeletion } from "./privacy-service";
import type { WorkspaceRole } from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { OwnershipService } from "./ownership-service";

export interface OffboardStaffWithHandoverInput {
  workspaceId: string;
  memberId: string;
  actorUserId: string;
  replacementStaffMemberId?: string | null;
  reason?: string;
}

export interface ExportDataSubjectDossierInput {
  requestId?: string;
  workspaceId: string;
  targetUserId: string;
  actorUserId: string;
}

export interface ExecuteDataSubjectDeletionInput {
  workspaceId: string;
  targetUserId: string;
  actorUserId: string;
  reason?: string;
}

export interface TransferGymOwnershipInput {
  workspaceId: string;
  currentOwnerUserId: string;
  targetUserId: string;
  actorUserId: string;
  demoteCurrentOwnerTo?: WorkspaceRole;
}

export class GymOffboardingService {
  private static ownershipService = new OwnershipService();


  static async offboardStaffWithHandover(input: OffboardStaffWithHandoverInput) { return offboardGymStaff(input); }


  static async transferOwnership(input: TransferGymOwnershipInput) {
    const { workspaceId, currentOwnerUserId, targetUserId, actorUserId, demoteCurrentOwnerTo } = input;

    if (actorUserId !== currentOwnerUserId) {
      throw new WorkspaceAccessError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Apenas o atual proprietário da academia tem alçada para transferir a titularidade do workspace."
      );
    }

    return this.ownershipService.transferWorkspaceOwnership({
      workspaceId,
      currentOwnerUserId,
      targetUserId,
      auditActorId: actorUserId,
      demoteCurrentOwnerTo: demoteCurrentOwnerTo || "MANAGER",
    });
  }
  static async cancelStudent(input: CancelGymStudentInput) { return cancelGymStudent(input); }


  static async exportDataSubjectDossier(input: ExportDataSubjectDossierInput) { return exportGymDataSubject(input); }


  static async executeDataSubjectDeletion(input: ExecuteDataSubjectDeletionInput) {
    return this.requestDataSubjectDeletion(input);
  }

  static async requestDataSubjectDeletion(input: ExecuteDataSubjectDeletionInput) { return requestGymDataDeletion(input); }

}
