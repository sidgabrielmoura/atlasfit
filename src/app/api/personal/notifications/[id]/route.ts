import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const { id } = await params;

    await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { isRead: true, readAt: new Date() }
    });

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    console.error("PATCH notification error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const { id } = await params;

    await prisma.notification.deleteMany({
      where: { id, userId: session.user.id }
    });

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    console.error("DELETE notification error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
