"use server";

import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function registerTrainer(formData: {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
}) {
  try {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const refCodeInput = formData.referralCode?.trim();

    if (!name || !email || !password) {
      return { error: "Todos os campos são obrigatórios." };
    }

    if (password.length < 6) {
      return { error: "A senha deve conter no mínimo 6 caracteres." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { error: "Este e-mail já está cadastrado no sistema." };
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      // Find referrer if referralCode is provided
      let referredById: string | null = null;
      if (refCodeInput) {
        const referrer = await tx.user.findUnique({
          where: { referralCode: refCodeInput }
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
          role: "TRAINER",
          referralCode: generatedReferralCode,
          referredById,
        }
      });

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await tx.freeTrial.create({
        data: {
          userId: user.id,
          startDate: now,
          endDate: thirtyDaysFromNow,
          isActive: true,
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Trainer signup error:", error);
    return { error: "Ocorreu um erro interno ao realizar o cadastro." };
  }
}

