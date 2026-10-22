import prisma from "@/lib/prisma";
import { z } from "zod";
import { resolveNavigationRoles } from "../domain/access-roles";
import { isPersonalTrialActive } from "../domain/personal-trial";
import { WorkspaceAccessError } from "../domain/types";
import { assertGymOperationalWorkspace } from "./gym-license";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

export function isPersonalSubscriptionActive(
  subscription: {
    status: string;
    startDate: Date;
    endDate: Date | null;
    billingControlType?: string | null;
    toleranceDays?: number | null;
    autoSuspendEnabled?: boolean | null;
  } | null,
  now = new Date()
) {
  if (!subscription || subscription.startDate > now) return false;
  if (subscription.billingControlType === "MANUAL" && subscription.endDate) {
    const tolerance = subscription.toleranceDays ?? 5;
    const toleranceLimit = new Date(subscription.endDate.getTime() + tolerance * 24 * 60 * 60 * 1000);
    if (subscription.autoSuspendEnabled && now > toleranceLimit) {
      return false;
    }
    return subscription.status.toLowerCase() === "active";
  }
  if (subscription.endDate && subscription.endDate <= now) return false;
  return subscription.status.toLowerCase() === "active" || (subscription.status.toLowerCase() === "canceled" && subscription.endDate !== null);
}

/** A GYM grant permits the professional experience, never a global account role. */
export async function assertGymPersonalAffiliation(workspaceId: string, userId: string, db: GymTransactionClient = prisma) {
  await assertGymOperationalWorkspace(workspaceId, db);
  const member = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } }, include: { roleGrants: true, workspace: { include: { units: { where: { isActive: true }, select: { id: true } } } } } });
  if (!member?.isActive || member.workspace.type !== "GYM" || !resolveNavigationRoles(member.role, member.roleGrants, member.workspace.units.map(unit => unit.id)).includes("TRAINER")) {
    throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Vínculo ativo de personal na academia necessário.");
  }
  return member;
}

/** Used only by navigation; operations always preserve their explicitly selected tenant. */
export async function getDefaultAffiliatedGymId(userId: string): Promise<string | null> {
  const memberships = await prisma.workspaceMember.findMany({ where: { userId, isActive: true, workspace: { type: "GYM", isActive: true } }, select: { workspaceId: true }, take: 100 });
  const eligible: string[] = [];
  for (const membership of memberships) {
    try { await assertGymPersonalAffiliation(membership.workspaceId, userId); eligible.push(membership.workspaceId); }
    catch (error) { if (!(error instanceof WorkspaceAccessError)) throw error; }
  }
  return eligible.length === 1 ? eligible[0] : null;
}

export async function hasActivePersonalExperience(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({ where: { userId, isActive: true, workspace: { type: "PERSONAL", isActive: true } }, include: { roleGrants: true, workspace: { select: { ownerId: true } } }, take: 100 });
  for (const member of memberships) {
    if (member.workspace.ownerId !== userId && !resolveNavigationRoles(member.role, member.roleGrants, []).some(role => ["OWNER", "TRAINER", "ASSISTANT", "MANAGER"].includes(role))) continue;
    const owner = await prisma.user.findUnique({ where: { id: member.workspace.ownerId }, select: { isTestAccount: true, subscription: true, freeTrial: true } });
    if (owner && (owner.isTestAccount || isPersonalSubscriptionActive(owner.subscription) || isPersonalTrialActive(owner.freeTrial))) return true;
  }
  return false;
}

async function assertPersonalCreator(userId: string, db: GymTransactionClient) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!await permitsOwnAccount(userId, db)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Conta própria de maior de idade necessária.");
  if (user.role === "TRAINER") return user;
  const own = await db.workspace.findFirst({ where: { ownerId: userId, type: "PERSONAL", isActive: true }, select: { id: true } });
  if (own) return user;
  const members = await db.workspaceMember.findMany({ where: { userId, isActive: true, workspace: { type: "GYM", isActive: true } }, select: { workspaceId: true }, take: 100 });
  for (const member of members) {
    try { await assertGymPersonalAffiliation(member.workspaceId, userId, db); return user; }
    catch (error) { if (!(error instanceof WorkspaceAccessError)) throw error; }
  }
  throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "A criação de assessoria exige perfil ou vínculo de personal.");
}

export async function getPersonalWorkspaceAllowance(userId: string, db: GymTransactionClient = prisma) {
  const user = await assertPersonalCreator(userId, db);
  const [subscription, trial, current] = await Promise.all([
    db.subscription.findUnique({ where: { userId }, include: { plan: true } }),
    db.freeTrial.findUnique({ where: { userId } }),
    db.workspace.count({ where: { ownerId: userId, type: "PERSONAL" } }),
  ]);
  const paid = isPersonalSubscriptionActive(subscription);
  const trialActive = isPersonalTrialActive(trial);
  // Only an explicit first creation can start a trial. Reading never creates one.
  const firstTrialEligible = !trial && !subscription && current === 0;
  const entitled = user.isTestAccount || paid || trialActive || firstTrialEligible;
  const limit = user.isTestAccount ? 999999 : paid ? subscription!.plan.maxWorkspaces : entitled ? 1 : 0;
  return { current, limit, isTestAccount: user.isTestAccount, entitled, firstTrialEligible, planName: user.isTestAccount ? "Conta de Teste" : paid ? subscription!.plan.name : "Free Trial" };
}

const createSchema = z.object({ name: z.string().trim().min(1).max(120), slug: z.string().trim().toLowerCase().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).strict();
export async function createPrivatePersonalWorkspace(userId: string, input: unknown, options: {
  autoSlug?: boolean;
  profile?: Pick<Prisma.UserUpdateInput, "name" | "image" | "imageKey" | "bio" | "specialty" | "whatsapp" | "instagram" | "linkedin" | "city" | "experience" | "cref">;
  branding?: Pick<Prisma.WorkspaceUncheckedCreateInput, "slogan" | "primaryColor" | "logoUrl" | "logoKey" | "watermarkUrl" | "watermarkKey" | "workoutCoverUrl" | "workoutCoverKey">;
} = {}) {
  const data = createSchema.parse(input);
  return serializableTransaction(async db => {
    // A common user lock serializes every creation path, including onboarding.
    await db.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const allowance = await getPersonalWorkspaceAllowance(userId, db);
    if (!allowance.entitled || allowance.current >= allowance.limit) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Limite de assessorias atingido ou assinatura pessoal expirada.");
    if (await db.workspace.findUnique({ where: { slug: data.slug }, select: { id: true } })) {
      if (!options.autoSlug) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Este endereço já está em uso.");
      data.slug = data.slug.slice(0, 90) + "-" + randomUUID().slice(0, 8);
    }
    if (allowance.firstTrialEligible) {
      const startDate = new Date();
      await db.freeTrial.create({ data: { userId, startDate, endDate: new Date(startDate.getTime() + 30 * 86400000), isActive: true } });
    }
    const workspace = await db.workspace.create({ data: { ...options.branding, ...data, ownerId: userId, type: "PERSONAL", members: { create: { userId, role: "OWNER" } } } });
    await db.user.update({ where: { id: userId }, data: { ...options.profile, onboarded: true } });
    await db.auditLog.create({ data: { userId, action: "PERSONAL_WORKSPACE_CREATED", entity: "WORKSPACE", entityId: workspace.id, severity: "success" } });
    return { workspace, planName: allowance.planName };
  });
}
