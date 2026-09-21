import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { enabled } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorType: true,
        threeFactorEnabled: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Se está querendo ATIVAR o 3FA
    if (enabled) {
      // Se não possui chave do Google Authenticator vinculada ainda, solicita setup
      if (!user.twoFactorSecret) {
        return NextResponse.json({
          success: false,
          requiresSetup: true,
          message: "É necessário parear o Google Authenticator primeiro.",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          threeFactorEnabled: true,
          twoFactorEnabled: true,
          twoFactorType: "AUTHENTICATOR",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "ENABLE_3FA",
          entity: "USER",
          entityId: user.id,
          severity: "success",
          ip: "SuperAdmin Settings",
        },
      });

      return NextResponse.json({
        success: true,
        threeFactorEnabled: true,
        message: "Autenticação em 3 Fatores (3FA) ativada com sucesso!",
      });
    }

    // Se está querendo DESATIVAR o 3FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        threeFactorEnabled: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DISABLE_3FA",
        entity: "USER",
        entityId: user.id,
        severity: "warning",
        ip: "SuperAdmin Settings",
      },
    });

    return NextResponse.json({
      success: true,
      threeFactorEnabled: false,
      message: "Autenticação em 3 Fatores (3FA) desativada.",
    });
  } catch (error) {
    console.error("[TOGGLE_3FA_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
