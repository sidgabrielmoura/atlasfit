"use server";

import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function registerTrainer(formData: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

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
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "TRAINER",
        }
      });

      const now = new Date();
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      await tx.freeTrial.create({
        data: {
          userId: user.id,
          startDate: now,
          endDate: tenDaysFromNow,
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
