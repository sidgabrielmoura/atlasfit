import { isGymLicenseCurrent } from "@/modules/workspaces/application/gym-license";
import { withAuditedRequest } from "@/lib/audited-request";
import { updateWorkspaceAdministration } from "@/modules/workspaces/application/workspace-administration";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { NextResponse } from "next/server";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertSuperadmin } from "@/modules/workspaces/application/gym-provisioning";
import { GymAnalyticsService } from "@/modules/workspaces/application/gym-analytics-service";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";
import { serializeGymData } from "@/modules/workspaces/domain/gym-config";
import {
  calculateSingleWorkspaceStorageUsage,
  getAccountStorageQuotaMetrics,
} from "@/lib/comprehensive-storage.service";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const actorUserId = session.user.id;
  const { id } = await params;

  try {
    if (!id) {
      return new NextResponse("Missing workspace ID", { status: 400 });
    }

    const result = await serializableTransaction(async tx => {
      await assertSuperadmin(tx, actorUserId);
      const workspace = await tx.workspace.findUnique({
        where: { id },
        include: {
          settings: true,
          units: { orderBy: { createdAt: "asc" } },
          subscription: {
            include: { plan: true },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              studentProfile: { select: { id: true } },
              staffProfile: { select: { id: true } },
              roleGrants: {
                select: { role: true, revokedAt: true },
              },
            },
          },
          plans: true,
          workouts: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              student: { select: { name: true } },
              creator: { select: { name: true } },
            },
          },
          payments: true,
        },
      });

      if (!workspace) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Workspace não encontrado.");
      const activeMembers = workspace.members.filter(member => member.isActive);
      const studentsCount = activeMembers.filter(m => m.studentProfile || m.roleGrants.some(g => g.role === "STUDENT" && !g.revokedAt) || (m.roleGrants.length === 0 && m.role === "STUDENT")).length;
      const staffCount = activeMembers.filter(m => (workspace.type === "GYM" ? m.userId === workspace.ownerId : Boolean(m.staffProfile)) || m.roleGrants.some(g => g.role !== "STUDENT" && !g.revokedAt) || (m.roleGrants.length === 0 && m.role !== "STUDENT")).length;
      const gymFinancialOverview = workspace.type === "GYM" && workspace.isActive && isGymLicenseCurrent(workspace.subscription) ? await GymAnalyticsService.getOverviewInTransaction(tx, { workspaceId: id, actorUserId: actorUserId }) : null;
      const registeredPlansCount = workspace.type === "GYM" ? await tx.gymPlan.count({ where: { workspaceId: id } }) : workspace.plans.length;
      const registeredWorkoutsCount = await tx.workout.count({ where: { workspaceId: id } });
      let effectiveSubscription = workspace.subscription;
      if (!effectiveSubscription && workspace.ownerId) {
        const ownerSub = await tx.subscription.findUnique({
          where: { userId: workspace.ownerId },
          include: { plan: true },
        });
        if (ownerSub) {
          effectiveSubscription = {
            id: ownerSub.id,
            workspaceId: workspace.id,
            planId: ownerSub.planId,
            status: (ownerSub.status ? ownerSub.status.toUpperCase() : "ACTIVE") as any,
            startDate: ownerSub.startDate,
            endDate: ownerSub.endDate,
            trialEndsAt: null,
            maxStudents: ownerSub.plan?.maxStudents ?? null,
            maxStaff: 0,
            maxUnits: ownerSub.plan?.maxWorkspaces ?? 1,
            maxDevices: 0,
            storageLimitMb: ownerSub.plan?.storageLimitMb ?? 1024,
            billingControlType: ownerSub.billingControlType,
            nextDueDate: ownerSub.nextDueDate,
            priceInCents: ownerSub.priceInCents,
            paymentMethod: ownerSub.paymentMethod,
            periodicity: ownerSub.periodicity,
            autoSuspendEnabled: ownerSub.autoSuspendEnabled,
            toleranceDays: ownerSub.toleranceDays,
            plan: ownerSub.plan,
            isOwnerPersonalSubscription: true,
          } as any;
        }
      }

      return {
        ...workspace,
        subscription: effectiveSubscription,
        owner: workspace.members.find(m => m.userId === workspace.ownerId)?.user || null,
        studentsCount,
        staffCount,
        registeredPlansCount,
        registeredWorkoutsCount,
        gymFinancialOverview,
        mrr: gymFinancialOverview ? gymFinancialOverview.executive.mrrInCents / 100 : null,
      };
    });

    const storageUsage = await calculateSingleWorkspaceStorageUsage(id);
    let accountStorageQuota: any = null;
    if (result.ownerId) {
      try {
        accountStorageQuota = await getAccountStorageQuotaMetrics(result.ownerId);
      } catch (err) {
        // Fallback silencioso se owner não possuir subscription
      }
    }

    return NextResponse.json(serializeGymData({
      ...result,
      storageUsage,
      accountStorageQuota,
    }));
  } catch (error) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    await logSystemError({ action: "GET_WORKSPACE_BY_ID", error, entity: "WORKSPACE", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
});

export const PATCH = withAuditedRequest(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Acesso administrativo necessário." } }, { status: 401 });
  const { id } = await params;
  try {
    if (!id || id.length > 100) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Workspace obrigatório." } }, { status: 400 });
    const actorUserId = session.user.isImpersonated ? session.user.originalAdminUserId : session.user.id;
    if (!actorUserId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Ator administrativo indisponível." } }, { status: 403 });
    const updated = await updateWorkspaceAdministration(id, await readJsonRequest(req, 16_384), actorUserId, session.user.id);
    return NextResponse.json(serializeGymData(updated));
  } catch (error) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    if (error instanceof JsonRequestError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: error.message } }, { status: error.statusCode });
    await logSystemError({ action: "PATCH_WORKSPACE_BY_ID", error, entity: "WORKSPACE", entityId: id });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível atualizar o workspace." } }, { status: 500 });
  }
});
