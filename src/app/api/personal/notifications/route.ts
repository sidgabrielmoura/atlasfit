import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Deleta notificações com mais de 7 dias
    await prisma.notification.deleteMany({
      where: {
        userId: session.user.id,
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET notifications error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    console.error("PATCH notifications error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    await prisma.notification.deleteMany({
      where: { userId: session.user.id }
    });

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    console.error("DELETE notifications error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
