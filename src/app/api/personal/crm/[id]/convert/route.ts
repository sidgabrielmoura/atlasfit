import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const body = await req.json();
    const { name, email, whatsapp, plan } = body;

    if (!name || !email || !plan) {
      return new NextResponse("Nome, E-mail e Plano são obrigatórios.", { status: 400 });
    }

    const workspaceId = lead.workspaceId;

    let studentUser = await prisma.user.findUnique({
      where: { email },
    });

    let setupToken = "";

    await prisma.$transaction(async (tx) => {
      if (studentUser) {
        const existingMember = await tx.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: studentUser.id,
              workspaceId,
            },
          },
        });

        if (!existingMember) {
          await tx.workspaceMember.create({
            data: {
              userId: studentUser.id,
              workspaceId,
              role: "STUDENT",
              plan,
              isActive: true,
            },
          });
        }

        if (!studentUser.password && !studentUser.setupToken) {
          setupToken = crypto.randomUUID();
          await tx.user.update({
            where: { id: studentUser.id },
            data: { setupToken },
          });
        } else if (studentUser.setupToken) {
          setupToken = studentUser.setupToken;
        }
      } else {
        setupToken = crypto.randomUUID();
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: null,
            setupToken,
            role: "STUDENT",
            whatsapp: whatsapp || null,
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
      }

      await tx.lead.update({
        where: { id },
        data: { status: "won" },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          content: `Lead convertido em aluno oficial (Plano: ${plan})`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      setupToken: setupToken || null,
    });
  } catch (error) {
    console.error("Lead conversion error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
