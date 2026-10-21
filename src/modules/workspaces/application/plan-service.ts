import { z } from "zod";
import { Prisma, type GymPlanVersion } from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { safeCentsNumber, cents } from "../domain/money";
import { assertActorAuthority } from "./actor-authority";
import { serializableTransaction } from "./transaction";
import type { GymTransactionClient } from "./transaction";
import { getGymUnitAccess } from "./gym-unit-access";

const id = z.string().trim().min(1).max(100);
const amount = z.union([z.number().int().safe().nonnegative(), z.bigint().nonnegative(), z.string().regex(/^\d+$/)]).transform(value => cents(value)).refine(value => value <= BigInt(Number.MAX_SAFE_INTEGER), "Valor excede o intervalo suportado.");
const conditions = {
  description: z.string().trim().max(2000).nullable().optional(),
  priceInCents: amount,
  enrollmentFeeInCents: amount.optional().default(BigInt(0)),
  billingCycle: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM"]),
  durationDays: z.number().int().min(1).max(3650).default(30),
  termsText: z.string().trim().min(1).max(100000),
  termsVersion: z.string().trim().min(1).max(50).optional(),
};
const scope = { workspaceId: id, actorUserId: id };
export const createGymPlanSchema = z.object({ workspaceId: id, name: z.string().trim().min(1).max(150), ...conditions }).strict();
export const publishGymPlanSchema = z.object({ workspaceId: id, name: z.string().trim().min(1).max(150).optional(), ...conditions }).strict();
export const updateGymPlanSchema = z.object({ workspaceId: id, name: z.string().trim().min(1).max(150).optional(), description: conditions.description, isActive: z.boolean().optional() }).strict().refine(data => data.name !== undefined || data.description !== undefined || data.isActive !== undefined, "Informe uma alteração.");
const createCommand = createGymPlanSchema.extend({ actorUserId: id });
const publishCommand = publishGymPlanSchema.extend({ actorUserId: id, planId: id });
const updateCommand = z.object({ ...scope, planId: id, name: z.string().trim().min(1).max(150).optional(), description: conditions.description, isActive: z.boolean().optional() }).strict();

export type CreatePlanInput = z.input<typeof createCommand>;
export type PublishNewVersionInput = z.input<typeof publishCommand>;
export type UpdatePlanMetadataInput = z.input<typeof updateCommand>;
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise nome, valores, periodicidade e condições do plano.");
  return result.data;
}
async function assertGymPlanAuthority(tx: GymTransactionClient, workspaceId: string, actorUserId: string) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true } });
  if (!workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  await assertActorAuthority(tx, workspaceId, actorUserId, "enrollments.manage");
}
export class GymPlanService {
  static serializePlanVersion<T extends Pick<GymPlanVersion, "priceInCents" | "enrollmentFeeInCents"> & Partial<Pick<GymPlanVersion, "classCreditsPerCycle" | "allowedTimeStart" | "allowedTimeEnd" | "allowedDaysOfWeek" | "allowsAllUnits">>>(version: T) {
    const { classCreditsPerCycle, allowedTimeStart, allowedTimeEnd, allowedDaysOfWeek, allowsAllUnits, ...fields } = version;
    return { ...fields, priceInCents: safeCentsNumber(version.priceInCents), enrollmentFeeInCents: safeCentsNumber(version.enrollmentFeeInCents) };
  }
  async createPlan(input: CreatePlanInput) {
    const data = parse(createCommand, input);
    return serializableTransaction(async tx => {
      await assertGymPlanAuthority(tx, data.workspaceId, data.actorUserId);
      const plan = await tx.gymPlan.create({ data: { workspaceId: data.workspaceId, name: data.name, description: data.description || null } });
      const version = await tx.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, version: 1, description: data.description || null, priceInCents: data.priceInCents, enrollmentFeeInCents: data.enrollmentFeeInCents, billingCycle: data.billingCycle, durationDays: data.durationDays, termsText: data.termsText, termsVersion: data.termsVersion || "1.0" } });
      await tx.auditLog.create({ data: { userId: data.actorUserId, action: `GYM_PLAN_CREATED:${plan.id}:v1:priceCents=${data.priceInCents}`, entity: "WORKSPACE", entityId: data.workspaceId } });
      return { ...plan, versions: [GymPlanService.serializePlanVersion(version)], activeVersion: GymPlanService.serializePlanVersion(version) };
    });
  }
  async publishNewVersion(input: PublishNewVersionInput) {
    const data = parse(publishCommand, input);
    return serializableTransaction(async tx => {
      await assertGymPlanAuthority(tx, data.workspaceId, data.actorUserId);
      const plan = await tx.gymPlan.findFirst({ where: { id: data.planId, workspaceId: data.workspaceId }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
      if (!plan) throw new WorkspaceAccessError(404, "PLAN_NOT_FOUND", "Plano não encontrado nesta academia.");
      if (!plan.isActive) throw new WorkspaceAccessError(409, "PLAN_INACTIVE", "Reative o plano antes de publicar uma versão.");
      const nextVersion = (plan.versions[0]?.version || 0) + 1;
      await tx.gymPlanVersion.updateMany({ where: { planId: plan.id, isActive: true }, data: { isActive: false } });
      const version = await tx.gymPlanVersion.create({ data: { planId: plan.id, version: nextVersion, name: data.name || plan.name, description: data.description === undefined ? plan.description : data.description, priceInCents: data.priceInCents, enrollmentFeeInCents: data.enrollmentFeeInCents, billingCycle: data.billingCycle, durationDays: data.durationDays, termsText: data.termsText, termsVersion: data.termsVersion || `${nextVersion}.0` } });
      await tx.auditLog.create({ data: { userId: data.actorUserId, action: `GYM_PLAN_VERSION_PUBLISHED:${plan.id}:v${nextVersion}:priceCents=${data.priceInCents}`, entity: "WORKSPACE", entityId: data.workspaceId } });
      return GymPlanService.serializePlanVersion(version);
    });
  }
  async updatePlanMetadata(input: UpdatePlanMetadataInput) {
    const data = parse(updateCommand, input);
    if (data.name === undefined && data.description === undefined && data.isActive === undefined) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe uma alteração.");
    return serializableTransaction(async tx => {
      await assertGymPlanAuthority(tx, data.workspaceId, data.actorUserId);
      const plan = await tx.gymPlan.findFirst({ where: { id: data.planId, workspaceId: data.workspaceId } });
      if (!plan) throw new WorkspaceAccessError(404, "PLAN_NOT_FOUND", "Plano não encontrado nesta academia.");
      const updated = await tx.gymPlan.update({ where: { id: plan.id }, data: { name: data.name, description: data.description === undefined ? undefined : data.description || null, isActive: data.isActive } });
      await tx.auditLog.create({ data: { userId: data.actorUserId, action: `GYM_PLAN_UPDATED:${plan.id}`, entity: "WORKSPACE", entityId: data.workspaceId } });
      return updated;
    });
  }
  async listPlans(workspaceId: string, options?: { includeInactive?: boolean; page?: number; limit?: number; search?: string; status?: "ALL" | "ACTIVE" | "INACTIVE" }, actorUserId?: string) {
    return (await this.listPlanPage(workspaceId, options, actorUserId)).plans;
  }
  async listPlanPage(workspaceId: string, options: { includeInactive?: boolean; page?: number; limit?: number; search?: string; status?: "ALL" | "ACTIVE" | "INACTIVE" } = {}, actorUserId?: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório para consultar planos.");
    const query = parse(z.object({ includeInactive: z.boolean().optional(), page: z.number().int().min(1).max(10000).default(1), limit: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(150).optional(), status: z.enum(["ALL","ACTIVE","INACTIVE"]).optional() }).strict(), options);
    return serializableTransaction(async tx => {
      await getGymUnitAccess(tx, workspaceId, actorUserId, "enrollments.read");
      const where = { workspaceId, ...(query.status === "INACTIVE" ? { isActive: false } : query.status === "ACTIVE" || !query.includeInactive ? { isActive: true } : {}), ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" as const } }, { description: { contains: query.search, mode: "insensitive" as const } }] } : {}) };
      const total = await tx.gymPlan.count({ where });
      const plans = await tx.gymPlan.findMany({ where, take: query.limit, skip: (query.page-1)*query.limit, orderBy: [{createdAt:"desc"},{id:"desc"}], include: { versions: { where: { isActive: true }, orderBy: { version:"desc" }, take:1, select: { id:true, planId:true, version:true, name:true, description:true, priceInCents:true, enrollmentFeeInCents:true, billingCycle:true, durationDays:true, termsText:true, termsVersion:true, isActive:true, createdAt:true } } } });
      const counts = plans.length ? await tx.$queryRaw<Array<{ planId: string; count: bigint }>>(Prisma.sql`SELECT v."planId",count(*)::bigint AS count FROM "GymEnrollment" e JOIN "GymPlanVersion" v ON v.id=e."planVersionId" WHERE e."workspaceId"=${workspaceId} AND e.status='ACTIVE' AND v."planId" IN (${Prisma.join(plans.map(plan=>plan.id))}) GROUP BY v."planId"`) : [];
      return { plans: plans.map(plan => {
        const versions = plan.versions.map(version=>GymPlanService.serializePlanVersion({...version, termsText: version.termsText || ""}));
        return { ...plan, versions, activeVersion: plan.isActive ? versions[0] ?? null : null, totalActiveEnrollments: safeCentsNumber(counts.find(row=>row.planId===plan.id)?.count ?? BigInt(0)) };
      }), pagination: { page:query.page,limit:query.limit,total,totalPages:Math.ceil(total/query.limit) } };
    });
  }
  async getPlanById(planId: string, workspaceId: string, actorUserId?: string, versionPage = 1) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório para consultar planos.");
    if (!Number.isSafeInteger(versionPage) || versionPage<1 || versionPage>10000) throw new WorkspaceAccessError(400,"INVALID_REQUEST","Página de versões inválida.");
    return serializableTransaction(async tx=>{
    await getGymUnitAccess(tx, workspaceId, actorUserId, "enrollments.read");
    const plan = await tx.gymPlan.findFirst({ where: { id: planId, workspaceId }, include: { _count: { select: { versions: true } }, versions: { take:10, skip:(versionPage-1)*10, orderBy: { version: "desc" }, include: { _count: { select: { enrollments: true } } } } } });
    if (!plan) throw new WorkspaceAccessError(404, "PLAN_NOT_FOUND", "Plano não encontrado.");
    const activeVersion = plan.isActive ? await tx.gymPlanVersion.findFirst({ where: { planId:plan.id,isActive:true }, orderBy:{version:"desc"} }) : null;
    return { id: plan.id, workspaceId: plan.workspaceId, name: plan.name, description: plan.description, isActive: plan.isActive, createdAt: plan.createdAt, updatedAt: plan.updatedAt, activeVersion: activeVersion ? GymPlanService.serializePlanVersion(activeVersion) : null, versionPagination:{page:versionPage,limit:10,total:plan._count.versions,totalPages:Math.ceil(plan._count.versions/10)}, versions: plan.versions.map(version => ({ ...GymPlanService.serializePlanVersion(version), totalEnrollmentsCount: version._count.enrollments })) };
    });
  }
}
export const gymPlanService = new GymPlanService();
