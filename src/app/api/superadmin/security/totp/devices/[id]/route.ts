import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID do aparelho não informado." }, { status: 400 });
  }

  try {
    const device = await prisma.userTotpDevice.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Aparelho não encontrado ou não pertence a esta conta." },
        { status: 404 }
      );
    }

    await prisma.userTotpDevice.delete({
      where: { id },
    });

    // Verifica quantos aparelhos restam
    const remainingDevices = await prisma.userTotpDevice.findMany({
      where: { userId: session.user.id },
      select: { id: true, secret: true },
    });

    // Se ainda restarem aparelhos, atualiza twoFactorSecret do user com o secret de um dos aparelhos ativos
    if (remainingDevices.length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          twoFactorSecret: remainingDevices[0].secret,
        },
      });
    } else {
      // Se não restou nenhum aparelho, desativa 3FA
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          twoFactorSecret: null,
          threeFactorEnabled: false,
          twoFactorType: "EMAIL",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REMOVE_TOTP_DEVICE",
        entity: "USER",
        entityId: session.user.id,
        severity: "warning",
        ip: "SuperAdmin Settings",
      },
    });

    return NextResponse.json({
      success: true,
      remainingCount: remainingDevices.length,
      message: `Aparelho "${device.deviceName}" removido com sucesso.`,
    });
  } catch (error) {
    console.error("[DELETE_DEVICE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
