import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireGymWorkspaceAccess, WorkspaceContextService } from "@/modules/workspaces";
import { assertActorAuthority } from "@/modules/workspaces/application/actor-authority";
import { assertGymModule } from "@/modules/workspaces/application/gym-module-authority";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { safeCentsNumber } from "@/modules/workspaces/domain/money";
import prisma from "@/lib/prisma";
import { GymImportClient } from "./import-client";

export const metadata = {
  title: "Importação Assistida de Academia | AtlasFit Gym",
  description: "Migração assistida de legado, conferência de saldos de abertura, contratos e com reconciliação idempotente",
};

export default async function GymImportPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/gym");
  }

  const wsContext = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (wsContext.status !== "RESOLVED" || !wsContext.workspaceId) {
    redirect("/select-workspace");
  }

  const context = await requireGymWorkspaceAccess({
    workspaceId: wsContext.workspaceId,
  });

  if (context.workspaceType !== "GYM") {
    redirect("/dashboard");
  }
  await assertGymModule(context.workspaceId, "import");
  const availableUnits = await prisma.gymUnit.findMany({ where: { workspaceId: context.workspaceId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const units: { id: string; name: string }[] = [];
  for (const unit of availableUnits) {
    try { await assertActorAuthority(prisma, context.workspaceId, context.userId, "students.manage", unit.id); units.push(unit); }
    catch (error) { if (!(error instanceof WorkspaceAccessError) || error.statusCode !== 403) throw error; }
  }
  if (!units.length) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Sem permissão de importação em uma unidade ativa.");

  // Catálogo de planos ativos para referência
  const plans = await prisma.gymPlan.findMany({
    where: { workspaceId: context.workspaceId, isActive: true },
    select: {
      id: true,
      name: true,
      versions: {
        where: { isActive: true },
        select: {
          priceInCents: true,
          billingCycle: true,
        },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const formattedPlans = plans.map((p) => {
    const activeVersion = p.versions[0];
    return {
      id: p.id,
      name: p.name,
      billingPeriod: String(activeVersion?.billingCycle || "MONTHLY"),
      priceInCents: activeVersion ? safeCentsNumber(activeVersion.priceInCents) : 0,
    };
  });

  return (
    <GymImportClient
      workspaceId={context.workspaceId}
      plans={formattedPlans}
      units={units}
    />
  );
}
