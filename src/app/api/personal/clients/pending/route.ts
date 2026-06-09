import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

async function verifyWorkspaceAccess(userId: string, workspaceId: string) {
  const memberCheck = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });
  return !!memberCheck;
}

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
    const hasAccess = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!hasAccess) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const pendingList = await prisma.pendingStudent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    // Match output details structure similar to main clients view
    const formattedPending = pendingList.map((ps) => {
      const nameParts = ps.name.split(" ") || [];
      const fallback = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : (ps.name[0] || ps.email[0] || "A").toUpperCase();

      return {
        id: ps.id,
        name: ps.name,
        email: ps.email,
        whatsapp: ps.whatsapp || "",
        plan: ps.plan,
        avatarFallback: fallback,
        createdAt: new Date(ps.createdAt).toLocaleDateString("pt-BR"),
      };
    });

    return NextResponse.json(formattedPending);
  } catch (error) {
    console.error("GET pending students error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// PUT: Edit pending student details
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, workspaceId, name, email, whatsapp, plan } = body;

    if (!id || !workspaceId || !name || !email || !plan) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!hasAccess) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify lead exists and belongs to this workspace
    const pendingStudent = await prisma.pendingStudent.findFirst({
      where: { id, workspaceId },
    });

    if (!pendingStudent) {
      return new NextResponse("Pré-cadastro não encontrado neste workspace.", { status: 404 });
    }

    // Check email uniqueness if email is changed
    if (email !== pendingStudent.email) {
      const userConflict = await prisma.user.findUnique({ where: { email } });
      const pendingConflict = await prisma.pendingStudent.findFirst({
        where: { email, id: { not: id } },
      });

      if (userConflict || pendingConflict) {
        return new NextResponse("Este e-mail já está sendo utilizado.", { status: 400 });
      }
    }

    await prisma.pendingStudent.update({
      where: { id },
      data: {
        name,
        email,
        whatsapp,
        plan,
      },
    });

    return new NextResponse("Pré-cadastro atualizado com sucesso.", { status: 200 });
  } catch (error) {
    console.error("PUT pending student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Reject/Remove pending student
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const workspaceId = searchParams.get("workspaceId");

  if (!id || !workspaceId) {
    return new NextResponse("Parâmetros inválidos.", { status: 400 });
  }

  try {
    const hasAccess = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!hasAccess) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const pendingStudent = await prisma.pendingStudent.findFirst({
      where: { id, workspaceId },
    });

    if (!pendingStudent) {
      return new NextResponse("Pré-cadastro não encontrado neste workspace.", { status: 404 });
    }

    await prisma.pendingStudent.delete({
      where: { id },
    });

    return new NextResponse("Pré-cadastro rejeitado/removido com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE pending student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// POST: Approve pending student and make them official
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, workspaceId } = body;

    if (!id || !workspaceId) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!hasAccess) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // 1. Find the pending student details
    const pendingStudent = await prisma.pendingStudent.findFirst({
      where: { id, workspaceId },
    });

    if (!pendingStudent) {
      return new NextResponse("Pré-cadastro não encontrado.", { status: 404 });
    }

    // 2. Check if a User record was created in the meantime
    const existingUser = await prisma.user.findUnique({
      where: { email: pendingStudent.email },
    });

    // 3. Process inside a transaction
    await prisma.$transaction(async (tx) => {
      let finalUserId = "";

      if (existingUser) {
        // User already exists (e.g. registered in another workspace)
        finalUserId = existingUser.id;

        // Check if already in this workspace
        const existingMember = await tx.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: finalUserId,
              workspaceId,
            },
          },
        });

        if (!existingMember) {
          // Add membership
          await tx.workspaceMember.create({
            data: {
              userId: finalUserId,
              workspaceId,
              role: "STUDENT",
              plan: pendingStudent.plan,
              isActive: true,
            },
          });
        } else {
          // Activate if inactive
          if (!existingMember.isActive) {
            await tx.workspaceMember.update({
              where: {
                userId_workspaceId: {
                  userId: finalUserId,
                  workspaceId,
                },
              },
              data: {
                isActive: true,
                plan: pendingStudent.plan,
              },
            });
          }
        }

        // If existing user has no password and no token, generate a token
        if (!existingUser.password && !existingUser.setupToken) {
          await tx.user.update({
            where: { id: finalUserId },
            data: { setupToken: crypto.randomUUID() },
          });
        }
      } else {
        const setupToken = crypto.randomUUID();
        // Create new User & membership
        const createdUser = await tx.user.create({
          data: {
            name: pendingStudent.name,
            email: pendingStudent.email,
            password: null,
            setupToken,
            role: "STUDENT",
            whatsapp: pendingStudent.whatsapp,
          },
        });

        finalUserId = createdUser.id;

        await tx.workspaceMember.create({
          data: {
            userId: finalUserId,
            workspaceId,
            role: "STUDENT",
            plan: pendingStudent.plan,
            isActive: true,
          },
        });
      }

      // Delete the Pending Student record
      await tx.pendingStudent.delete({
        where: { id },
      });
    });

    return new NextResponse("Aluno aprovado e ativado com sucesso.", { status: 200 });
  } catch (error) {
    console.error("POST pending student approval error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
