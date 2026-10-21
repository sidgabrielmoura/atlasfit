import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { adminUserSelect, updateAdminUser } from "@/lib/auth/admin-user-service";

async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    if (!id) {
      return new NextResponse("Missing user ID", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...adminUserSelect,
        workspaces: {
          select: { id: true, role: true, isActive: true, unitId: true, workspace: { select: { id: true, name: true, slug: true, type: true, isActive: true } } }
        },
        subscription: {
          select: { id: true, status: true, startDate: true, endDate: true, plan: { select: { id: true, name: true, price: true } } }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const global2FA = await prisma.systemSetting.findUnique({
      where: { key: "two_factor_auth_enabled" }
    });
    const isGlobal2FA = global2FA?.value === "true";

    const userWithSub = {
      ...user,
      isGlobal2FA,
      subscriptions: user.subscription ? [
        {
          ...user.subscription,
          workspace: { name: user.name || "Workspace" }
        }
      ] : [],
      payments: user.transactions || []
    };

    return NextResponse.json(userWithSub, { status: 200 });
  } catch (error) {
    await logSystemError({ action: "GET_USER_BY_ID", error, entity: "USER", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
 const session = await auth();
 if (session?.user?.role !== "SUPERADMIN") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
 const { id } = await params;
 try { return NextResponse.json(await updateAdminUser(id, session.user.id, await req.json())); }
 catch (error) {
  if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "E-mail já está em uso." }, { status: 409 });
  await logSystemError({ action: "PATCH_USER_BY_ID", error, entity: "USER", entityId: id });
  return NextResponse.json({ error: "Erro interno ao atualizar usuário." }, { status: 500 });
 }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    if (!id) {
      return new NextResponse("Missing user ID", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Run delete inside a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      const gymOwner = await tx.workspace.findFirst({ where: { ownerId: id, type: "GYM" }, select: { id: true } });
      const gymLink = await tx.workspaceMember.findFirst({ where: { userId: id, workspace: { type: "GYM" } }, select: { id: true } });
      const guardian = await tx.gymGuardian.findFirst({ where: { guardianUserId: id }, select: { id: true } });
      if (gymOwner || gymLink || guardian) throw new WorkspaceAccessError(409, "GYM_DATA_RETENTION_REQUIRED", "Esta conta participa de academias. Use o fluxo de encerramento e privacidade com preservação do histórico.");
      if (id === session.user.id) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Não é permitido excluir a própria conta administrativa.");
      // 1. If user is a trainer, delete all workspaces owned by this trainer
      // Deleting the workspace will cascade-delete members, plans, payments, pendingStudents, trainerTasks, workouts, progressHistory, progressPhotos, dailyFeedbacks, etc.
      const ownedWorkspaces = await tx.workspace.findMany({
        where: { ownerId: id },
        select: { id: true },
      });

      const workspaceIds = ownedWorkspaces.map((w) => w.id);

      if (workspaceIds.length > 0) {
        // Delete related records that don't have explicit foreign key cascade to Workspace but reference workspaceId
        await tx.physicalEvaluation.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        await tx.studentFile.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Also delete any pending students registered in this workspace
        await tx.pendingStudent.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete the workspaces themselves
        await tx.workspace.deleteMany({
          where: { id: { in: workspaceIds } },
        });
      }

      // 2. Finally, delete the User record
      // This will cascade-delete their account, sessions, subscriptions, freeTrial, transactions, auditLogs, studentWorkouts, progressHistory, progressPhotos, physicalEvaluations, files, etc.
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETION",
          entity: "USER",
          entityId: id,
          severity: "warning"
        }
      });

      await tx.user.delete({
        where: { id },
      });
    });

    return new NextResponse("User deleted successfully", { status: 200 });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    await logSystemError({ action: "DELETE_USER_BY_ID", error, entity: "USER", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
