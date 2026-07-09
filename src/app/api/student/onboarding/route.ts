import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";


export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Get active student workspace member to associate initial physical stats
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const body = await req.json();
    const {
      objective,
      gender,
      birthDate,
      experienceLevel,
      medicalConditions,
      city,
      weight,
      height,
    } = body;

    // 2. Update user profile parameters and set onboarded as true
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboarded: true,
        objective: objective || null,
        gender: gender || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        experienceLevel: experienceLevel || null,
        medicalConditions: medicalConditions || null,
        city: city || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
      },
    });

    // 3. Register initial weight and height progress history if provided
    if (weight || height) {
      await prisma.studentProgress.create({
        data: {
          studentId: session.user.id,
          workspaceId: member.workspaceId,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          date: new Date(),
        },
      });
    }

    // Notify trainer about onboarding completion
    const workspace = await prisma.workspace.findUnique({
      where: { id: member.workspaceId },
      select: { ownerId: true }
    });
    if (workspace?.ownerId) {
      await NotificationService.sendNotification({
        userId: workspace.ownerId,
        type: "SYSTEM",
        category: "SYSTEM",
        title: "Convite de Onboarding Aceito! 🎉",
        description: `O aluno "${session.user.name || "Aluno"}" concluiu o onboarding e está pronto para receber treinos.`,
        deepLink: `/personal/clients/${session.user.id}`,
        source: "SYSTEM",
        workspaceId: member.workspaceId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student Onboarding API Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
