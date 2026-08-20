"use server";

import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { headers } from "next/headers";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { LegalDocumentType, LegalAcceptanceType } from "@prisma/client";

export async function registerTrainer(formData: {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
  cpfCnpj?: string;
  referralCode?: string;
}) {
  try {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const cpfCnpj = formData.cpfCnpj?.replace(/\D/g, "") || undefined;
    const refCodeInput = formData.referralCode?.trim();

    if (!name || !email || !password || !formData.birthDate) {
      return { error: "Todos os campos obrigatórios devem ser preenchidos, incluindo a data de nascimento." };
    }

    // 1. Server-side 18+ Age Gate validation
    const ageResult = validateAgeEligibility(formData.birthDate, 18);
    if (!ageResult.isValid || !ageResult.birthDate) {
      return { error: ageResult.error || "Data de nascimento não atende aos requisitos de elegibilidade (18+)." };
    }

    // 2. Server-side Legal Document Acceptance validation
    if (!formData.acceptedTerms || !formData.acceptedPrivacy) {
      return { error: "É obrigatório ler e aceitar os Termos de Uso e estar ciente da Política de Privacidade para criar uma conta." };
    }

    if (password.length < 6) {
      return { error: "A senha deve conter no mínimo 6 caracteres." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "Este e-mail já está cadastrado no sistema." };
    }

    const ipHeaders = await headers();
    const ip = ipHeaders.get("x-forwarded-for") || ipHeaders.get("x-real-ip") || "127.0.0.1";
    const userAgent = ipHeaders.get("user-agent") || "Web Client";

    const hashedPassword = await bcryptjs.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      // Find referrer if referralCode is provided
      let referredById: string | null = null;
      if (refCodeInput) {
        const referrer = await tx.user.findUnique({
          where: { referralCode: refCodeInput },
        });
        if (referrer) {
          referredById = referrer.id;
        }
      }

      // Generate a unique referralCode for the new trainer
      const cleanName = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedReferralCode = `${cleanName}-${randomSuffix}`;

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          birthDate: ageResult.birthDate,
          cpfCnpj,
          role: "TRAINER",
          referralCode: generatedReferralCode,
          referredById,
        },
      });

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await tx.freeTrial.create({
        data: {
          userId: user.id,
          startDate: now,
          endDate: thirtyDaysFromNow,
          isActive: true,
        },
      });

      // Fetch active versions to bind immutable records
      const activeTerms = await LegalAcceptanceService.getActiveDocument(LegalDocumentType.TERMS);
      const activePrivacy = await LegalAcceptanceService.getActiveDocument(LegalDocumentType.PRIVACY);

      if (activeTerms) {
        await tx.legalAcceptance.create({
          data: {
            userId: user.id,
            documentId: activeTerms.id,
            documentType: LegalDocumentType.TERMS,
            documentVersion: activeTerms.version,
            documentHash: activeTerms.contentHash,
            acceptanceType: LegalAcceptanceType.TERMS_ACCEPTED,
            ipAddress: ip,
            userAgent,
            source: "REGISTER_FORM",
          },
        });
      }

      if (activePrivacy) {
        await tx.legalAcceptance.create({
          data: {
            userId: user.id,
            documentId: activePrivacy.id,
            documentType: LegalDocumentType.PRIVACY,
            documentVersion: activePrivacy.version,
            documentHash: activePrivacy.contentHash,
            acceptanceType: LegalAcceptanceType.PRIVACY_ACKNOWLEDGED,
            ipAddress: ip,
            userAgent,
            source: "REGISTER_FORM",
          },
        });
      }

      if (formData.marketingConsent) {
        await tx.privacyConsent.create({
          data: {
            userId: user.id,
            purpose: "MARKETING_EMAIL",
            source: "REGISTER_FORM",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TRAINER_REGISTER_WITH_LEGAL_ACCEPTANCE",
          entity: "USER",
          entityId: user.id,
          severity: "info",
          ip,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Trainer signup error:", error);
    return { error: "Ocorreu um erro interno ao realizar o cadastro." };
  }
}
