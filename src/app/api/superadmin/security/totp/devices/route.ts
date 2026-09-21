import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { verifyTOTP, generateBackupCodes } from "@/lib/auth/totp";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const devices = await prisma.userTotpDevice.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("[GET_DEVICES_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { deviceName, secret, token } = body;

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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        twoFactorBackupCodes: true,
        totpDevices: { select: { id: true } },
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const existingCount = user.totpDevices.length;
    const finalDeviceName =
      deviceName && deviceName.trim().length > 0
        ? deviceName.trim()
        : `Aparelho ${existingCount + 1}`;

    const backupCodes =
      user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0
        ? user.twoFactorBackupCodes
        : generateBackupCodes(8);

    const [newDevice] = await prisma.$transaction([
      prisma.userTotpDevice.create({
        data: {
          userId: user.id,
          deviceName: finalDeviceName,
          secret,
        },
        select: {
          id: true,
          deviceName: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorType: "AUTHENTICATOR",
          twoFactorEnabled: true,
          threeFactorEnabled: true,
          twoFactorBackupCodes: backupCodes,
          twoFactorSecret: secret, // Mantém sync de contingência
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "ADD_TOTP_DEVICE",
          entity: "USER",
          entityId: user.id,
          severity: "success",
          ip: "SuperAdmin Settings",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      device: newDevice,
      backupCodes,
      message: `Aparelho "${finalDeviceName}" conectado com sucesso!`,
    });
  } catch (error) {
    console.error("[ADD_DEVICE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
