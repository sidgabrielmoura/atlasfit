import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function GET(
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
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        },
        subscription: {
          include: {
            plan: true
          }
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

    const { password, ...userWithoutPassword } = user;
    const userWithSub = {
      ...userWithoutPassword,
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { role } = body;

    if (!id) {
      return new NextResponse("Missing user ID", { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role !== undefined ? role : undefined,
      }
    });

    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    await logSystemError({ action: "PATCH_USER_BY_ID", error, entity: "USER", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
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
    await logSystemError({ action: "DELETE_USER_BY_ID", error, entity: "USER", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
