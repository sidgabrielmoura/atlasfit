import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { batchVerifyAndDecayStreaks } from "@/lib/streak-helper";
import { EmailService } from "@/lib/emails/service";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import { ErasureService } from "@/lib/privacy/erasure.service";
import {
  requirePersonalWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  sanitizeStudentListItem,
} from "@/modules/workspaces";

// GET: Fetch all students of a given workspace
async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      const session = await auth();
      if (!session?.user?.id) {
        return new NextResponse("Não autorizado.", { status: 401 });
      }
      const userMember = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
      });
      workspaceId = userMember?.workspaceId || null;
    }

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
    }

    // Verify workspace access and capability
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.read",
    });

    if (searchParams.get("projection") === "finance") {
      const members = await prisma.workspaceMember.findMany({ where: { workspaceId: context.workspaceId, role: "STUDENT" }, select: { user: { select: { id: true, name: true, email: true, whatsapp: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      return NextResponse.json(members.map(member => member.user));
    }

    // Verify and decay streaks in batch before loading the list
    await batchVerifyAndDecayStreaks(context.workspaceId);

    // Fetch all student members
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: context.workspaceId,
        role: "STUDENT",
      },
      include: {
        user: { select: { id: true, name: true, email: true, whatsapp: true, image: true, password: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Security Rule #29 & D01: Return sanitized DTO omitting setupToken and secrets
    const students = members.map((m) => sanitizeStudentListItem(m));

    return NextResponse.json(students);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET students error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

// POST: Create a new student and associate with workspace
export async function POST(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }
  try {
    const body = await req.json();
    const { workspaceId, name, email, whatsapp, cpfCnpj, birthDate } = body;
    const plan = body.plan || "Mensal";
    const modality = body.modality || "PRESENCIAL";
    const cleanCpfCnpj = cpfCnpj ? cpfCnpj.replace(/\D/g, "") : undefined;

    if (!workspaceId || !name || !email) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    let validatedBirthDate: Date | null = null;
    if (birthDate) {
      const ageResult = validateAgeEligibility(birthDate, 18);
      if (!ageResult.isValid) {
        return NextResponse.json({ error: ageResult.error }, { status: 400 });
      }
      validatedBirthDate = ageResult.birthDate || null;
    }

    await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
    });

    let studentUser = await prisma.user.findUnique({
      where: { email },
    });

    if (studentUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: studentUser.id,
            workspaceId,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json({ error: "Este aluno já está cadastrado neste workspace." }, { status: 400 });
      }

      await prisma.workspaceMember.create({
        data: {
          userId: studentUser.id,
          workspaceId,
          role: "STUDENT",
          plan,
          modality,
          isActive: true,
        },
      });

      if (cleanCpfCnpj && !studentUser.cpfCnpj) {
        await prisma.user.update({
          where: { id: studentUser.id },
          data: { cpfCnpj: cleanCpfCnpj }
        });
      }

      if (validatedBirthDate && !studentUser.birthDate) {
        await prisma.user.update({
          where: { id: studentUser.id },
          data: { birthDate: validatedBirthDate }
        });
      }

      let tokenToEmail: string | null = null;

      if (!studentUser.password) {
        if (!studentUser.setupToken || !studentUser.setupTokenExpiresAt || studentUser.setupTokenExpiresAt <= new Date()) {
          tokenToEmail = crypto.randomUUID();
          await prisma.user.update({
            where: { id: studentUser.id },
            data: { setupTokenExpiresAt: newSetupTokenExpiry(),
setupToken: tokenToEmail },
          });
        } else {
          tokenToEmail = studentUser.setupToken;
        }
      }

      if (tokenToEmail) {
        const [ws, trainer] = await Promise.all([
          prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
          prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
        ]);

        EmailService.sendStudentInvitation({
          to: email,
          studentName: studentUser.name || name,
          trainerName: trainer?.name || "Seu Personal",
          workspaceName: ws?.name || "AtlasFit",
          setupToken: tokenToEmail,
          planName: plan,
        }).catch((err) => console.warn("[ClientInvitation] Email dispatch failed:", err));
      }
    } else {
      const setupToken = crypto.randomUUID();
      await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: null,
            setupTokenExpiresAt: newSetupTokenExpiry(),
setupToken,
            role: "STUDENT",
            whatsapp,
            cpfCnpj: cleanCpfCnpj,
            birthDate: validatedBirthDate,
          },
        });

        await tx.workspaceMember.create({
          data: {
            userId: createdUser.id,
            workspaceId,
            role: "STUDENT",
            plan,
            modality,
            isActive: true,
          },
        });
      });

      const [ws, trainer] = await Promise.all([
        prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
      ]);

      EmailService.sendStudentInvitation({
        to: email,
        studentName: name,
        trainerName: trainer?.name || "Seu Personal",
        workspaceName: ws?.name || "AtlasFit",
        setupToken,
        planName: plan,
      }).catch((err) => console.warn("[ClientInvitation] Email dispatch failed:", err));
    }

    return new NextResponse("Aluno cadastrado com sucesso.", { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("POST student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// PUT: Update student details, plan, or active status
export async function PUT(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const body = await req.json();
    const { userId, workspaceId, name, email, whatsapp, plan, modality, isActive } = body;

    if (!userId || !workspaceId) {
      return new NextResponse("ID do usuário e ID do workspace são obrigatórios.", { status: 400 });
    }

    // Verify workspace access and management capability
    await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
    });

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
    if (modality !== undefined) memberUpdate.modality = modality;
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
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("PUT student error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Delete student from workspace
export async function DELETE(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const workspaceId = searchParams.get("workspaceId");

  if (!userId || !workspaceId) {
    return new NextResponse("Parâmetros inválidos.", { status: 400 });
  }

  try {
    // Verify workspace access and management capability
    await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
    });

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

      // 3. If they belong to no other workspace, purge their User record and R2 files
      if (otherMemberships === 0) {
        await tx.user.delete({
          where: { id: userId },
        });
      }
    });

    // Cleanup physical R2 files asynchronously outside transaction
    const remainingMemberships = await prisma.workspaceMember.count({ where: { userId } });
    if (remainingMemberships === 0) {
      const session = await auth();
      await ErasureService.executeCompleteErasure(userId, session?.user?.id || "system").catch((e) => {
        console.warn("[StudentDelete] ErasureService cleanup handled:", e.message);
      });
    }

    return NextResponse.json({ success: true, message: "Aluno excluído com sucesso." });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("DELETE student error:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
