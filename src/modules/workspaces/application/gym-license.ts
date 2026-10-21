import prisma from "@/lib/prisma";
import type { Prisma, WorkspaceSubscriptionStatus } from "@prisma/client";
import type { GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";

export function isGymLicenseCurrent(license: { status: WorkspaceSubscriptionStatus; endDate: Date | null; trialEndsAt: Date | null } | null, now = new Date()) {
  return Boolean(license && (!license.endDate || license.endDate > now) && (license.status === "ACTIVE" || (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt > now)));
}

/** Recovery is performed by the separate superadmin administration commands. */
export async function assertGymOperationalWorkspace(workspaceId: string, db: GymTransactionClient = prisma, now = new Date()) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, type: true, isActive: true, ownerId: true, subscription: true } });
  if (!workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa. A regularização está disponível na administração.");
  if (!isGymLicenseCurrent(workspace.subscription, now)) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Licença da academia inativa ou expirada. Procure a administração para regularizar.");
  return workspace;
}

/** Used before batch limits so suspended/expired tenants cannot starve active tenants. */
export function gymOperationalWorkspaceWhere(now = new Date()): Prisma.WorkspaceWhereInput {
  return { type: "GYM", isActive: true, subscription: { is: { AND: [
    { OR: [{ endDate: null }, { endDate: { gt: now } }] },
    { OR: [{ status: "ACTIVE" }, { status: "TRIAL", trialEndsAt: { gt: now } }] },
  ] } } };
}
