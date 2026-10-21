import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SelectWorkspaceClient from "./select-workspace-client";
import { calculateDefaultRoute } from "@/modules/workspaces/application/context-service";
import { resolveNavigationRoles } from "@/modules/workspaces/domain/access-roles";
import { normalizeWorkspaceColor } from "@/modules/workspaces/domain/branding";
import { getDefaultAffiliatedGymId } from "@/modules/workspaces/application/personal-affiliation";

export default async function SelectWorkspacePage({ searchParams }: { searchParams: Promise<{ academy?: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/student");
  }

  const role = session.user.role;
  if (role === "SUPERADMIN") {
    redirect("/superadmin/dashboard");
  }

  // Busca todas as associações ativas de workspaces do usuário autenticado
  const members = await prisma.workspaceMember.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      workspace: { isActive: true },
    },
    include: {
      workspace: {
        include: {
          units: { where: { isActive: true } },
          subscription: { include: { plan: true } },
        },
      },
      roleGrants: {
        select: { role: true, unitId: true, revokedAt: true },
      },
    },
  });

  // Se for TRAINER sem workspaces, direciona para o onboarding de personal
  if (members.length === 0 && role === "TRAINER") {
    redirect("/personal-onboarding");
  }

  const userWorkspaces = await Promise.all(
    members.map(async (member) => {
      const ws = member.workspace;
      const effectiveRoles = resolveNavigationRoles(member.role, member.roleGrants, ws.units.map(unit => unit.id));
      if (ws.ownerId === session.user.id && !effectiveRoles.includes("OWNER")) effectiveRoles.push("OWNER");
      const defaultRoute = calculateDefaultRoute(ws.type, effectiveRoles);

      let planName = "Plano Padrão";
      if (ws.type === "GYM") {
        planName = ws.subscription?.plan?.name || "Plano Academia";
      } else {
        const owner = await prisma.user.findUnique({
          where: { id: ws.ownerId },
          select: {
            subscription: { select: { plan: { select: { name: true } } } },
            freeTrial: true,
          },
        });
        planName = owner?.subscription?.plan?.name || (owner?.freeTrial?.isActive ? "Free Trial" : "Personal");
      }

      const logo = ws.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        type: ws.type,
        logo,
        logoUrl: ws.logoUrl,
        primaryColor: normalizeWorkspaceColor(ws.primaryColor),
        plan: planName,
        roles: effectiveRoles,
        unitsCount: ws.units.length,
        defaultRoute,
      };
    })
  );

  return (
    <SelectWorkspaceClient
      workspaces={userWorkspaces}
      user={session.user}
      preferredWorkspaceId={(await searchParams).academy === "1" ? await getDefaultAffiliatedGymId(session.user.id) : null}
    />
  );
}
