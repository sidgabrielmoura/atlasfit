import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorType: true,
        twoFactorSecret: true,
        threeFactorEnabled: true,
        email: true,
        totpDevices: {
          select: {
            id: true,
            deviceName: true,
            createdAt: true,
            lastUsedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let devices = user.totpDevices;

    // Migração transparente: se possui secret legado mas nenhum registro em totpDevices
    if (user.twoFactorSecret && devices.length === 0) {
      const migrated = await prisma.userTotpDevice.create({
        data: {
          userId: user.id,
          deviceName: "Celular Principal",
          secret: user.twoFactorSecret,
        },
        select: {
          id: true,
          deviceName: true,
          createdAt: true,
          lastUsedAt: true,
        },
      });
      devices = [migrated];
    }

    const hasTotpSecret = Boolean(user.twoFactorSecret) || devices.length > 0;
    const threeFactorEnabled = Boolean(user.threeFactorEnabled);
    const isTotpEnabled =
      Boolean(user.twoFactorEnabled) && (user.twoFactorType === "AUTHENTICATOR" || devices.length > 0);

    return NextResponse.json({
      enabled: isTotpEnabled,
      threeFactorEnabled,
      hasTotpSecret,
      devices,
      type: user.twoFactorType || "EMAIL",
      email: user.email,
    });
  } catch (error) {
    console.error("[TOTP_STATUS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
