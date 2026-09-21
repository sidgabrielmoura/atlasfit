import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prisma.$transaction([
      prisma.userTotpDevice.deleteMany({
        where: { userId: session.user.id },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          twoFactorSecret: null,
          twoFactorType: "EMAIL",
          twoFactorEnabled: false,
          threeFactorEnabled: false,
          twoFactorBackupCodes: [],
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DISABLE_2FA_TOTP",
        entity: "USER",
        entityId: session.user.id,
        severity: "warning",
        ip: "SuperAdmin Settings",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google Authenticator desativado com sucesso.",
    });
  } catch (error) {
    console.error("[TOTP_DISABLE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
