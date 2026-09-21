import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";
import bcryptjs from "bcryptjs";

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

    const global2FA = await prisma.systemSetting.findUnique({
      where: { key: "two_factor_auth_enabled" }
    });
    const isGlobal2FA = global2FA?.value === "true";

    const { password, ...userWithoutPassword } = user;
    const userWithSub = {
      ...userWithoutPassword,
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
    if (!id) {
      return new NextResponse("Missing user ID", { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      role,
      whatsapp,
      cpfCnpj,
      birthDate,
      gender,
      twoFactorEnabled,
      isTestAccount
    } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      dataToUpdate.name = typeof name === "string" ? name.trim() : null;
    }

    if (email !== undefined && typeof email === "string") {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
      }

      if (cleanEmail !== currentUser.email) {
        const emailInUse = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });
        if (emailInUse && emailInUse.id !== id) {
          return NextResponse.json(
            { error: "Este e-mail já está sendo utilizado por outra conta." },
            { status: 400 }
          );
        }
        dataToUpdate.email = cleanEmail;
      }
    }

    if (password !== undefined && typeof password === "string" && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter no mínimo 6 caracteres." },
          { status: 400 }
        );
      }
      dataToUpdate.password = await bcryptjs.hash(password.trim(), 10);
    }

    if (role !== undefined) dataToUpdate.role = role;
    if (whatsapp !== undefined) dataToUpdate.whatsapp = whatsapp ? String(whatsapp).trim() : null;
    if (cpfCnpj !== undefined) dataToUpdate.cpfCnpj = cpfCnpj ? String(cpfCnpj).trim() : null;
    if (birthDate !== undefined) {
      dataToUpdate.birthDate = birthDate ? new Date(birthDate) : null;
    }
    if (gender !== undefined) dataToUpdate.gender = gender ? String(gender).trim() : null;
    if (twoFactorEnabled !== undefined) dataToUpdate.twoFactorEnabled = twoFactorEnabled;
    if (isTestAccount !== undefined) dataToUpdate.isTestAccount = isTestAccount;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_USER",
        entity: "USER",
        entityId: id,
        severity: "info",
        ip: "SuperAdmin Panel",
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error("[PATCH_USER_ERROR]", error);
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
