import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logSystemError } from "@/lib/logger";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      try {
        const body = await req.json();
        workspaceId = body.workspaceId;
      } catch (e) {}
    }

    if (!workspaceId) {
      return new NextResponse("ID do workspace é obrigatório.", { status: 400 });
    }

    // Verify workspace exists and belongs to the authenticated personal
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: session.user.id,
      },
    });

    if (!workspace) {
      return new NextResponse("Workspace não encontrado ou você não tem permissão para excluí-lo.", { status: 404 });
    }

    // Delete workspace (Prisma schema cascade-deletes related members, tasks, plans, payments, etc.)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "WORKSPACE_DELETED",
        entity: "WORKSPACE",
        entityId: workspaceId,
        severity: "warning",
      },
    });

    // Fetch remaining workspaces for the trainer
    const remainingWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        slogan: true,
      },
    });

    const mapped = remainingWorkspaces.map((w) => ({
      ...w,
      logo: w.name ? w.name.charAt(0).toUpperCase() : "A",
      primaryColor: w.primaryColor || "#3b82f6",
      plan: "Assessoria",
    }));

    return NextResponse.json({
      success: true,
      remainingWorkspaces: mapped,
    });
  } catch (error) {
    await logSystemError({ action: "DELETE_PERSONAL_WORKSPACE", error, entity: "WORKSPACE" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
