import { transferWorkspaceOwner } from "./team-lifecycle";
import prisma from "@/lib/prisma";
import { WorkspaceAccessError } from "../domain/types";
import { WorkspaceRole } from "../domain/roles";

/**
 * Service for enforcing workspace ownership consistency and secure, audited ownership transfer.
 * Complies with GYM-020 requirements:
 * - Guarantees consistent owner.
 * - Prevents removal/deactivation of the last OWNER.
 * - Implements audited atomic ownership transfer.
 */
export class OwnershipService {
  /**
   * Prevents removing, deactivating, or revoking the OWNER grant of the last active owner of a workspace.
   */
  async preventLastOwnerRemoval(workspaceId: string, memberId: string): Promise<void> {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        roleGrants: {
          where: { revokedAt: null, role: "OWNER" },
        },
      },
    });

    if (!member || member.workspaceId !== workspaceId) {
      return;
    }

    const isMemberOwner = member.role === "OWNER" || member.roleGrants.length > 0;
    if (!isMemberOwner) {
      return;
    }

    // Count other active owners in the workspace
    const otherOwnersCount = await prisma.workspaceMember.count({
      where: {
        workspaceId,
        id: { not: memberId },
        isActive: true,
        OR: [
          { role: "OWNER" },
          {
            roleGrants: {
              some: {
                role: "OWNER",
                revokedAt: null,
              },
            },
          },
        ],
      },
    });

    if (otherOwnersCount === 0) {
      throw new WorkspaceAccessError(
        400,
        "CANNOT_REMOVE_LAST_OWNER",
        "Não é permitido remover, desativar ou revogar o único proprietário do workspace. Transfira a titularidade antes desta ação."
      );
    }
  }

  /**
   * Transfers workspace ownership atomically from currentOwnerUserId to targetUserId.
   * Updates workspace.ownerId, grants OWNER to the new owner, demotes previous owner to MANAGER,
   * and creates an immutable audit log.
   */
  async transferWorkspaceOwnership(params: {
    workspaceId: string;
    currentOwnerUserId: string;
    targetUserId: string;
    auditActorId: string;
    demoteCurrentOwnerTo?: WorkspaceRole;
  }): Promise<{ success: boolean; newOwnerId: string }> { return transferWorkspaceOwner(params); }

  static transferWorkspaceOwnership(params: {
    workspaceId: string;
    currentOwnerUserId: string;
    targetUserId: string;
    auditActorId: string;
    demoteCurrentOwnerTo?: WorkspaceRole;
  }) {
    return new OwnershipService().transferWorkspaceOwnership(params);
  }

  static preventLastOwnerRemoval(workspaceId: string, memberId: string) {
    return new OwnershipService().preventLastOwnerRemoval(workspaceId, memberId);
  }
}

export const ownershipService = new OwnershipService();
