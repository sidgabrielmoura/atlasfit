import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { logSystemError } from "@/lib/logger";
import { planOfferFields } from "@/lib/plan-offer";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";

const customPlanSchema = z.object({
  name: z.string().trim().min(2, "Nome do plano deve ter pelo menos 2 caracteres").max(100),
  price: z.number().min(0),
  maxWorkspaces: z.number().int().min(1).default(1),
  maxStudents: z.number().int().min(1).nullable().default(null),
  importQuota: z.number().int().min(0).default(25),
  storageLimitMb: z.number().int().min(0).default(1024),
  features: z.string().max(10000).default(""),
  imageUrl: z.union([z.url(), z.literal("")]).nullable().optional(),
  isRecurring: z.boolean().default(true),
  periodicity: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]).default("MENSAL"),
  paymentMethods: z.enum(["PIX", "CARD", "PIX,CARD", "BOLETO"]).default("PIX"),
  paymentMethod: z.enum(["PIX", "CARD", "CREDIT_CARD", "BOLETO"]).default("PIX"),
  nextDueDate: z.iso.date().optional().nullable(),
  autoSuspendEnabled: z.boolean().default(true),
  toleranceDays: z.number().int().min(0).default(5),
});
const planReferenceSchema = z.object({ planId: z.string().min(1) }).strict();
const createSchema = customPlanSchema.extend({ scope: z.enum(["WORKSPACE", "GLOBAL"]).default("WORKSPACE") }).strict();
const updateSchema = customPlanSchema.extend({ planId: z.string().min(1) }).strict();
type RouteContext = { params: Promise<{ id: string }> };
type PlanData = z.output<typeof customPlanSchema>;
class PlanError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function loadWorkspace(tx: GymTransactionClient, workspaceId: string) {
  const workspace = await tx.workspace.findUnique({
    where: { id: workspaceId }, include: { subscription: { include: { plan: true } } },
  });
  if (!workspace) throw new PlanError(404, "Workspace não encontrado.");
  const subscription = workspace.type === "GYM" ? workspace.subscription : await tx.subscription.findUnique({
    where: { userId: workspace.ownerId }, include: { plan: true },
  });
  return { workspace, subscription };
}
async function currentPlan(tx: GymTransactionClient, workspaceId: string, planId: string) {
  const loaded = await loadWorkspace(tx, workspaceId);
  const plan = loaded.subscription?.plan;
  if (!plan || plan.id !== planId) throw new PlanError(409, "O plano atribuído mudou. Atualize a página e tente novamente.");
  if (plan.customWorkspaceId && plan.customWorkspaceId !== workspaceId) throw new PlanError(409, "Este plano personalizado pertence a outro workspace.");
  return { ...loaded, plan };
}
function planFields(data: PlanData) {
  return {
    name: data.name, price: data.price, interval: data.periodicity === "ANUAL" ? "year" : "month",
    features: data.features, imageUrl: data.imageUrl || null,
    maxWorkspaces: data.maxWorkspaces, maxStudents: data.maxStudents,
    importQuota: data.importQuota, storageLimitMb: data.storageLimitMb, paymentMethods: data.paymentMethods,
  };
}
function billingFields(data: PlanData) {
  const nextDueDate = data.nextDueDate ? new Date(`${data.nextDueDate}T12:00:00Z`) : undefined;
  return {
    priceInCents: Math.round(data.price * 100), billingControlType: data.isRecurring ? "MANUAL" : "AUTOMATIC",
    periodicity: data.periodicity, paymentMethod: data.paymentMethod, nextDueDate, endDate: nextDueDate,
    autoSuspendEnabled: data.autoSuspendEnabled, toleranceDays: data.toleranceDays,
  };
}
async function audit(tx: GymTransactionClient, userId: string, workspaceId: string, action: string, planId: string) {
  await tx.auditLog.create({ data: { userId, action, entity: "Workspace", entityId: workspaceId, severity: "info", metadata: { planId } } });
}

async function handle(req: Request, context: RouteContext, operation: "CREATE" | "UPDATE" | "PUBLISH" | "DELETE") {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) return new NextResponse("Unauthorized", { status: 401 });
  const { id: workspaceId } = await context.params;
  const userId = session.user.id;
  try {
    const json = await req.json();
    if (operation === "CREATE" || operation === "UPDATE") {
      const data = operation === "CREATE" ? createSchema.parse(json) : updateSchema.parse(json);
      const plan = await serializableTransaction(async tx => {
        const { workspace, subscription } = "planId" in data
          ? await currentPlan(tx, workspaceId, data.planId)
          : await loadWorkspace(tx, workspaceId);
        let plan;
        if ("planId" in data) {
          plan = await tx.plan.update({ where: { id: data.planId }, data: planFields(data) });
        } else {
          plan = await tx.plan.create({ data: { ...planFields(data), customWorkspaceId: data.scope === "GLOBAL" ? null : workspaceId } });
        }
        const billing = billingFields(data);
        if (workspace.type === "GYM") {
          const limits = { maxStudents: data.maxStudents ?? 2147483647, maxUnits: data.maxWorkspaces, storageLimitMb: data.storageLimitMb };
          await tx.workspaceSubscription.upsert({
            where: { workspaceId },
            create: { workspaceId, planId: plan.id, status: "ACTIVE", maxStaff: 50, ...limits, ...billing },
            update: { planId: plan.id, ...limits, ...billing, ...(operation === "CREATE" ? { status: "ACTIVE" } : {}) },
          });
        } else if (subscription) {
          await tx.subscription.update({ where: { id: subscription.id }, data: { planId: plan.id, ...billing, ...(operation === "CREATE" ? { status: "active" } : {}) } });
        } else {
          await tx.subscription.create({ data: { userId: workspace.ownerId, planId: plan.id, status: "active", ...billing } });
        }
        if (operation === "CREATE") await tx.workspace.update({ where: { id: workspaceId }, data: { isActive: true } });
        await audit(tx, userId, workspaceId, operation === "CREATE" ? "CREATE_CUSTOM_WORKSPACE_PLAN" : "UPDATE_CUSTOM_WORKSPACE_PLAN", plan.id);
        return plan;
      });
      return NextResponse.json({ success: true, plan });
    }
    const { planId } = planReferenceSchema.parse(json);
    const result = await serializableTransaction(async tx => {
      const { workspace, subscription, plan } = await currentPlan(tx, workspaceId, planId);
      if (operation === "PUBLISH") {
        if (!plan.customWorkspaceId || plan.publishedGlobalPlanId) throw new PlanError(409, "Este plano já está disponível globalmente.");
        // Copy persisted values. Concurrent publishes retry and encounter the guard above.
        const fields = planOfferFields(plan);
        const existingGlobal = await tx.plan.findFirst({ where: { customWorkspaceId: null, ...fields }, select: { id: true } });
        if (existingGlobal) throw new PlanError(409, "Já existe um plano global com estes mesmos dados.");
        const globalPlan = await tx.plan.create({ data: { ...fields, customWorkspaceId: null } });
        await tx.plan.update({ where: { id: plan.id }, data: { publishedGlobalPlanId: globalPlan.id } });
        await audit(tx, userId, workspaceId, "PUBLISH_CUSTOM_WORKSPACE_PLAN", globalPlan.id);
        return { plan: globalPlan };
      }
      // Global offers remain in the catalog; remove only this assignment.
      if (workspace.type === "GYM") {
        await tx.workspaceSubscription.update({ where: { workspaceId }, data: { planId: null, status: "CANCELED", nextDueDate: null, endDate: new Date(), priceInCents: null } });
      } else if (subscription) {
        await tx.subscription.delete({ where: { id: subscription.id } });
      }
      if (plan.customWorkspaceId) {
        const references = await tx.plan.findUnique({ where: { id: plan.id }, select: {
          _count: { select: { subscriptions: true, workspaceSubscriptions: true, subscriptionActivities: true } },
        } });
        if (references && Object.values(references._count).every(count => count === 0)) await tx.plan.delete({ where: { id: plan.id } });
      }
      await audit(tx, userId, workspaceId, "DELETE_CUSTOM_WORKSPACE_PLAN", plan.id);
      return {};
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof PlanError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "JSON inválido." }, { status: 400 });
    await logSystemError({ action: `${operation}_CUSTOM_WORKSPACE_PLAN`, error, entity: "WORKSPACE", entityId: workspaceId });
    return NextResponse.json({ error: "Não foi possível salvar a alteração do plano." }, { status: 500 });
  }
}
export const POST = (req: Request, context: RouteContext) => handle(req, context, "CREATE");
export const PATCH = (req: Request, context: RouteContext) => handle(req, context, "UPDATE");
export const PUT = (req: Request, context: RouteContext) => handle(req, context, "PUBLISH");
export const DELETE = (req: Request, context: RouteContext) => handle(req, context, "DELETE");
