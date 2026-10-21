import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function handleGET() {
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

    // Reading status cannot register a factor without the protected mutation flow.
    const devices = user.totpDevices;

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
export const GET = withRequestMemo(handleGET);
