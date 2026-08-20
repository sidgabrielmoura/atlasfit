import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { LegalDocumentType, LegalAcceptanceType } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado. Por favor, faça login." }, { status: 401 });
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
      return NextResponse.json({ error: "Membro ativo do workspace não encontrado." }, { status: 404 });
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
      acceptedTerms,
      acceptedPrivacy,
    } = body;

    // Server-side Age Gate (18+)
    let validatedBirthDate: Date | null = null;
    if (birthDate) {
      const ageResult = validateAgeEligibility(birthDate, 18);
      if (!ageResult.isValid) {
        return NextResponse.json({ error: ageResult.error }, { status: 400 });
      }
      validatedBirthDate = ageResult.birthDate || null;
    }

    // 2. Update user profile parameters and set onboarded as true
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboarded: true,
        objective: objective || null,
        gender: gender || null,
        birthDate: validatedBirthDate,
        experienceLevel: experienceLevel || null,
        medicalConditions: medicalConditions || null,
        city: city || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
      },
    });

    // 3. Record legal acceptances if provided
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Web Client";

    if (acceptedTerms) {
      await LegalAcceptanceService.recordAcceptance({
        userId: session.user.id,
        documentType: LegalDocumentType.TERMS,
        acceptanceType: LegalAcceptanceType.TERMS_ACCEPTED,
        ipAddress: ip,
        userAgent,
        source: "STUDENT_ONBOARDING",
        workspaceId: member.workspaceId,
      }).catch((e) => console.warn("Failed recording student terms acceptance:", e.message));
    }

    if (acceptedPrivacy) {
      await LegalAcceptanceService.recordAcceptance({
        userId: session.user.id,
        documentType: LegalDocumentType.PRIVACY,
        acceptanceType: LegalAcceptanceType.PRIVACY_ACKNOWLEDGED,
        ipAddress: ip,
        userAgent,
        source: "STUDENT_ONBOARDING",
        workspaceId: member.workspaceId,
      }).catch((e) => console.warn("Failed recording student privacy acknowledgment:", e.message));
    }

    // 4. Register initial weight and height progress history if provided
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
      select: { ownerId: true },
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
        workspaceId: member.workspaceId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student Onboarding API Error:", error);
    return NextResponse.json({ error: "Erro Interno do Servidor" }, { status: 500 });
  }
}
