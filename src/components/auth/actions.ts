"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { redirect } from "next/navigation";

export async function login(formData: {
  email: string;
  password: string;
  redirectTo: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: formData.email }
    });

    if (!user) {
      return { error: "Credenciais inválidas. Tente novamente." };
    }

    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode" }
    });

    if (maintenanceSetting?.value === "true" && user.role !== "SUPERADMIN") {
      redirect("/maintenance");
    }

    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
    return { success: true, role: user.role };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciais inválidas. Tente novamente." };
        default:
          return { error: "Ocorreu um erro ao entrar. Tente novamente." };
      }
    }
    // Re-throw redirect errors so Next.js handles navigation successfully
    throw error;
  }
}

export async function setupPassword(token: string, passwordStr: string) {
  if (!token) {
    return { error: "Token de acesso inválido ou expirado." };
  }
  if (!passwordStr || passwordStr.length < 6) {
    return { error: "A senha deve conter pelo menos 6 caracteres." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { setupToken: token }
    });

    if (!user) {
      return { error: "Link de ativação inválido ou já utilizado." };
    }

    const hashedPassword = await bcryptjs.hash(passwordStr, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        setupToken: null, // token becomes single-use
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Setup password error:", error);
    return { error: "Erro interno ao definir a senha. Tente novamente." };
  }
}
