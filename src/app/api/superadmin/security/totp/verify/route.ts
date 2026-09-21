import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { verifyTOTP, generateBackupCodes } from "@/lib/auth/totp";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { secret, token } = body;

    if (!secret || !token) {
      return NextResponse.json(
        { error: "Chave secreta e código de 6 dígitos são obrigatórios." },
        { status: 400 }
      );
    }

    const isValid = verifyTOTP(secret, token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Código inválido. Verifique o horário do celular e tente novamente." },
        { status: 400 }
      );
    }

    const backupCodes = generateBackupCodes(8);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorType: "AUTHENTICATOR",
        twoFactorEnabled: true,
        threeFactorEnabled: true,
        twoFactorBackupCodes: backupCodes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ENABLE_2FA_TOTP",
        entity: "USER",
        entityId: session.user.id,
        severity: "success",
        ip: "SuperAdmin Settings",
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes,
      message: "Google Authenticator ativado com sucesso!",
    });
  } catch (error) {
    console.error("[TOTP_VERIFY_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
