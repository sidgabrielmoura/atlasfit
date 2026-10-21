import prisma from "@/lib/prisma";
import { WorkspaceType, WorkspaceSubscriptionStatus } from "@prisma/client";

export interface WorkspaceEntitlements {
  workspaceId: string;
  workspaceType: "PERSONAL" | "GYM";
  planName: string;
  status: "ACTIVE" | "TRIAL" | "PAST_DUE" | "EXPIRED" | "INCOMPLETE";
  isEntitled: boolean;
  isPastDue: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  limits: {
    maxStudents: number;
    maxStaff: number;
    maxUnits: number;
    storageLimitMb: number;
  };
  usage: {
    studentsCount: number;
    staffCount: number;
    unitsCount: number;
  };
  features: {
    financialReportsEnabled: boolean;
  };
  canPerformAction: (action: "ADD_STUDENT" | "ADD_STAFF" | "ADD_UNIT") => {
    allowed: boolean;
    reason?: string;
  };
}

export class EntitlementsService {

  /**
   * Resolves entitlements for a workspace without requiring staff to own an individual subscription.
   * Completely isolates personal trainer plans from gym subscriptions.
   * 
   * Global Rule compliance:
   * "funcionário USER acessa academia ativa sem assinatura individual; personal com academia alterna corretamente; não há fallback financeiro para outro workspace."
   */
  static async resolveEntitlements(workspaceId: string): Promise<WorkspaceEntitlements> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        units: {
          where: { isActive: true },
          select: { id: true },
        },
        members: {
          where: { isActive: true },
          select: { id: true, userId: true, role: true, studentProfile: { select: { id: true } }, staffProfile: { select: { id: true } }, roleGrants: { select: { role: true, revokedAt: true } } },
        },
      },
    });

    if (!workspace) {
      throw new Error(`WORKSPACE_NOT_FOUND: Workspace ${workspaceId} not found.`);
    }

    const studentsCount = workspace.members.filter(m => m.studentProfile || m.roleGrants.some(g => g.role === "STUDENT" && !g.revokedAt) || (m.roleGrants.length === 0 && m.role === "STUDENT")).length;
    // A retained employment profile is history, not an active staff entitlement.
    const pendingStaff = workspace.type === "GYM" ? await prisma.workspaceInvitation.count({ where: { workspaceId, status: "PENDING", expiresAt: { gt: new Date() } } }) : 0;
    const staffCount = workspace.members.filter(m => (workspace.type === "GYM" ? m.userId === workspace.ownerId : Boolean(m.staffProfile)) || m.roleGrants.some(g => g.role !== "STUDENT" && !g.revokedAt) || (m.roleGrants.length === 0 && m.role !== "STUDENT")).length + pendingStaff;
    const unitsCount = workspace.units.length;

    // --- GYM WORKSPACE ENTITLEMENTS ---
    if (workspace.type === "GYM") {
      const sub = workspace.subscription;

      const statusMap: Record<WorkspaceSubscriptionStatus, WorkspaceEntitlements["status"]> = {
        ACTIVE: "ACTIVE",
        TRIAL: "TRIAL",
        PAST_DUE: "PAST_DUE",
        EXPIRED: "EXPIRED",
        CANCELED: "EXPIRED",
        INCOMPLETE: "INCOMPLETE",
      };

      const now = new Date();
      const expired = sub && ((sub.endDate !== null && sub.endDate <= now) || (sub.status === "TRIAL" && (!sub.trialEndsAt || sub.trialEndsAt <= now)));
      const mappedStatus = !sub ? "INCOMPLETE" : expired ? "EXPIRED" : statusMap[sub.status];
      const isEntitled = workspace.isActive && (mappedStatus === "ACTIVE" || mappedStatus === "TRIAL");
      const isPastDue = mappedStatus === "PAST_DUE";
      const isTrial = mappedStatus === "TRIAL";

      const maxStudents = sub?.maxStudents ?? 0;
      const maxStaff = sub?.maxStaff ?? 0;
      const maxUnits = sub?.maxUnits ?? 0;
      const storageLimitMb = sub?.storageLimitMb ?? 0;

      const canPerformAction = (action: "ADD_STUDENT" | "ADD_STAFF" | "ADD_UNIT") => {
        if (!isEntitled) {
          return {
            allowed: false,
            reason: "A assinatura da academia está inativa ou expirada. Regularize para adicionar novos recursos.",
          };
        }

        switch (action) {
          case "ADD_STUDENT":
            if (studentsCount >= maxStudents) {
              return {
                allowed: false,
                reason: `Limite de alunos atingido (${studentsCount}/${maxStudents}). Faça upgrade da licença da academia.`,
              };
            }
            break;
          case "ADD_STAFF":
            if (staffCount >= maxStaff) {
              return {
                allowed: false,
                reason: `Limite de funcionários atingido (${staffCount}/${maxStaff}). Faça upgrade da licença da academia.`,
              };
            }
            break;
          case "ADD_UNIT":
            if (unitsCount >= maxUnits) {
              return {
                allowed: false,
                reason: `Limite de unidades ativas atingido (${unitsCount}/${maxUnits}). Faça upgrade da licença da academia.`,
              };
            }
            break;
        }

        return { allowed: true };
      };

      return {
        workspaceId: workspace.id,
        workspaceType: "GYM",
        planName: sub?.plan?.name || (isTrial ? "Piloto Academia (Trial)" : sub ? "Plano Academia" : "Licença não configurada"),
        status: mappedStatus,
        isEntitled,
        isPastDue,
        isTrial,
        trialEndsAt: sub?.trialEndsAt ?? null,
        limits: {
          maxStudents,
          maxStaff,
          maxUnits,
          storageLimitMb,
        },
        usage: {
          studentsCount,
          staffCount,
          unitsCount,
        },
        features: {
          financialReportsEnabled: isEntitled,
        },
        canPerformAction,
      };
    }

    // --- PERSONAL WORKSPACE ENTITLEMENTS ---
    // Look up the personal trainer owner's subscription & free trial
    const owner = await prisma.user.findUnique({
      where: { id: workspace.ownerId },
      include: {
        subscription: {
          include: { plan: true },
        },
        freeTrial: true,
      },
    });

    let planName = "Free Trial";
    let isEntitled = false;
    let isTrial = false;
    let isPastDue = false;
    let trialEndsAt: Date | null = null;
    let maxStudents = 5;
    let storageLimitMb = 1024;

    if (owner?.subscription) {
      planName = owner.subscription.plan.name;
      maxStudents = owner.subscription.plan.maxStudents || 999;
      storageLimitMb = owner.subscription.plan.storageLimitMb || 1024;
      const subStatus = owner.subscription.status.toUpperCase();
      isEntitled = subStatus === "ACTIVE" || subStatus === "TRIALING";
      isPastDue = subStatus === "PAST_DUE";
    } else if (owner?.freeTrial?.isActive) {
      planName = "Free Trial";
      isEntitled = true;
      isTrial = true;
      trialEndsAt = owner.freeTrial.endDate;
      maxStudents = 15;
    }

    const canPerformAction = (action: "ADD_STUDENT" | "ADD_STAFF" | "ADD_UNIT") => {
      if (action === "ADD_UNIT") {
        return {
          allowed: false,
          reason: "Unidades adicionais são recursos exclusivos de workspaces do tipo Academia (GYM).",
        };
      }

      if (!isEntitled) {
        return {
          allowed: false,
          reason: "A assinatura do Personal Trainer está inativa ou expirada.",
        };
      }

      if (action === "ADD_STUDENT" && studentsCount >= maxStudents) {
        return {
          allowed: false,
          reason: `Limite de alunos atingido (${studentsCount}/${maxStudents}).`,
        };
      }

      return { allowed: true };
    };

    return {
      workspaceId: workspace.id,
      workspaceType: "PERSONAL",
      planName,
      status: isEntitled ? (isTrial ? "TRIAL" : "ACTIVE") : (isPastDue ? "PAST_DUE" : "EXPIRED"),
      isEntitled,
      isPastDue,
      isTrial,
      trialEndsAt,
      limits: {
        maxStudents,
        maxStaff: 2,
        maxUnits: 1,
        storageLimitMb,
      },
      usage: {
        studentsCount,
        staffCount,
        unitsCount: 1,
      },
      features: {
        financialReportsEnabled: isEntitled,
      },
      canPerformAction,
    };
  }

  /**
   * Asserts whether a given action is permissible within the workspace's entitlements.
   * Throws an error if the action is disallowed.
   */
  static async assertCanPerform(
    workspaceId: string,
    action: "ADD_STUDENT" | "ADD_STAFF" | "ADD_UNIT"
  ): Promise<void> {
    const entitlements = await this.resolveEntitlements(workspaceId);
    const result = entitlements.canPerformAction(action);
    if (!result.allowed) {
      throw new Error(`LIMIT_EXCEEDED: ${result.reason || "Operação não permitida pelo plano contratado."}`);
    }
  }
}
