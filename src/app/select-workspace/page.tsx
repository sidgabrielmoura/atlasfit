import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SelectWorkspaceClient from "./select-workspace-client";

export default async function SelectWorkspacePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/student");
  }

  // Busca as associações de workspaces do usuário autenticado no banco
  const members = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: true,
    },
  });

  const role = (session.user as any).role as string | undefined;
  if (role === "TRAINER" && members.length <= 1) {
    redirect("/personal/dashboard");
  } else if (role === "SUPERADMIN") {
    redirect("/superadmin/dashboard");
  }

  const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

  const userWorkspaces = await Promise.all(
    members.map(async (member, index) => {
      const ws = member.workspace;

      // Find the owner of the workspace and their active subscription
      const owner = await prisma.user.findUnique({
        where: { id: ws.ownerId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      // Gera logo a partir do nome (ex: "Silva Assessoria" -> "SA")
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
        logo,
        logoUrl: ws.logoUrl,
        primaryColor: ws.primaryColor || "#0ea5e9",
        plan: owner?.subscription?.plan?.name || "Free Trial",
      };
    })
  );

  return (
    <SelectWorkspaceClient
      workspaces={userWorkspaces}
      user={session.user}
    />
  );
}
