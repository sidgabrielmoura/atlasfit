import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";

// POST /api/personal/clients/[id]/progress/photos/request
// Dispara uma solicitação de foto de progresso para o aluno via notificação push/in-app
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
    }

    // Validar se o personal trainer pertence ao workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Enviar a notificação push e In-App para o aluno
    await NotificationService.sendNotification({
      userId: studentId,
      type: "PHOTO_REQUEST",
      category: "ASSESSMENT",
      title: "Solicitação de Foto 📷",
      description: "Seu personal trainer solicitou uma nova foto de progresso para acompanhar sua evolução.",
      priority: "HIGH",
      deepLink: "/student/evolution?tab=photos",
      workspaceId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST request photo error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
