import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { batchVerifyAndDecayStreaks } from "@/lib/streak-helper";

// GET: Fetch all students of a given workspace
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verify that the logged-in trainer/owner belongs to this workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify and decay streaks in batch before loading the list
    await batchVerifyAndDecayStreaks(workspaceId);

    // Fetch all student members
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const students = members.map((m) => {
      const nameParts = m.user.name?.split(" ") || [];
      const fallback = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : (m.user.name?.[0] || m.user.email?.[0] || "A").toUpperCase();

      return {
        id: m.user.id,
        name: m.user.name || "Sem Nome",
        email: m.user.email || "",
        whatsapp: m.user.whatsapp || "",
        isActive: m.isActive,
        plan: m.plan,
        streak: m.streak,
        bestStreak: m.bestStreak,
        image: m.user.image,
        progress: m.progress,
        avatarFallback: fallback,
        lastActive: m.lastActive
          ? new Date(m.lastActive).toLocaleDateString("pt-BR")
          : "Não acessou",
        setupToken: m.user.setupToken,
        hasPassword: m.user.password !== null,
      };
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("GET students error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// POST: Create a new student and associate with workspace
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, name, email, whatsapp, plan } = body;

    if (!workspaceId || !name || !email || !plan) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify workspace membership of the logged-in user
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Check if the user already exists in the system
    let studentUser = await prisma.user.findUnique({
      where: { email },
    });

    if (studentUser) {
      // User exists. Let's see if they are already linked to this workspace.
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: studentUser.id,
            workspaceId,
          },
        },
      });

      if (existingMember) {
        return new NextResponse("Este aluno já está cadastrado neste workspace.", { status: 400 });
      }

      // Link existing user to workspace as STUDENT
      await prisma.workspaceMember.create({
        data: {
          userId: studentUser.id,
          workspaceId,
          role: "STUDENT",
          plan,
          isActive: true,
        },
      });

      // If the existing user doesn't have a password and doesn't have a setupToken, we can generate one.
      if (!studentUser.password && !studentUser.setupToken) {
        const setupToken = crypto.randomUUID();
        await prisma.user.update({
          where: { id: studentUser.id },
          data: { setupToken },
        });
      }
    } else {
      const setupToken = crypto.randomUUID();
      // Create new student user and member relation in a transaction
      await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: null,
            setupToken,
            role: "STUDENT",
            whatsapp,
          },
        });

        await tx.workspaceMember.create({
          data: {
            userId: createdUser.id,
            workspaceId,
            role: "STUDENT",
            plan,
            isActive: true,
          },
        });
      });
    }

    return new NextResponse("Aluno cadastrado com sucesso.", { status: 201 });
  } catch (error) {
    console.error("POST student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// PUT: Update student details, plan, or active status
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, workspaceId, name, email, whatsapp, plan, isActive } = body;

    if (!userId || !workspaceId) {
      return new NextResponse("ID do usuário e ID do workspace são obrigatórios.", { status: 400 });
    }

    // Verify workspace membership of the logged-in trainer
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify student exists in workspace
    const studentMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado no workspace.", { status: 404 });
    }

    // Prepare update data for User
    const userUpdate: any = {};
    if (name !== undefined) userUpdate.name = name;
    if (email !== undefined) userUpdate.email = email;
    if (whatsapp !== undefined) userUpdate.whatsapp = whatsapp;

    // Prepare update data for WorkspaceMember
    const memberUpdate: any = {};
    if (plan !== undefined) memberUpdate.plan = plan;
    if (isActive !== undefined) memberUpdate.isActive = isActive;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdate,
        });
      }

      if (Object.keys(memberUpdate).length > 0) {
        await tx.workspaceMember.update({
          where: {
            userId_workspaceId: {
              userId,
              workspaceId,
            },
          },
          data: memberUpdate,
        });
      }
    });

    return new NextResponse("Aluno atualizado com sucesso.", { status: 200 });
  } catch (error) {
    console.error("PUT student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Delete student from workspace
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const workspaceId = searchParams.get("workspaceId");

  if (!userId || !workspaceId) {
    return new NextResponse("Parâmetros inválidos.", { status: 400 });
  }

  try {
    // Verify logged-in user belongs to workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Check if member is associated as STUDENT
    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!targetMember || targetMember.role !== "STUDENT") {
      return new NextResponse("Aluno não encontrado ou não pode ser excluído.", { status: 404 });
    }

    // Perform transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete WorkspaceMember connection
      await tx.workspaceMember.delete({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      // 2. Check if student is part of any other workspaces
      const otherMemberships = await tx.workspaceMember.count({
        where: { userId },
      });

      // 3. If they belong to no other workspace, purge their User record
      if (otherMemberships === 0) {
        await tx.user.delete({
          where: { id: userId },
        });
      }
    });

    return new NextResponse("Aluno excluído com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
