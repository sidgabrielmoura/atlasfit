"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function login(formData: {
  email: string;
  password: string;
  redirectTo: string;
}) {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
    return { success: true };
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
