import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logAuditEvent, logSystemError } from "@/lib/logger";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.engagePushNotification.findUnique({
      where: { id }
    });

    if (!existing) {
      return new NextResponse("Notificação não encontrada.", { status: 404 });
    }

    const {
      title,
      body: pushBody,
      titleB,
      bodyB,
      imageUrl,
      targetRole,
      targetPlan,
      triggerType,
      deepLink,
      category,
      scheduleTime,
      daysOfWeek,
      inactivityDays,
      isActive,
      priority
    } = body;

    const updated = await prisma.engagePushNotification.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(pushBody !== undefined && { body: pushBody.trim() }),
        ...(titleB !== undefined && { titleB: titleB?.trim() || null }),
        ...(bodyB !== undefined && { bodyB: bodyB?.trim() || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(targetRole !== undefined && { targetRole }),
        ...(targetPlan !== undefined && { targetPlan }),
        ...(triggerType !== undefined && { triggerType }),
        ...(deepLink !== undefined && { deepLink: deepLink || "/student/workouts" }),
        ...(category !== undefined && { category }),
        ...(scheduleTime !== undefined && { scheduleTime: scheduleTime || null }),
        ...(daysOfWeek !== undefined && { daysOfWeek: daysOfWeek || null }),
        ...(inactivityDays !== undefined && { inactivityDays: inactivityDays ? parseInt(inactivityDays) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(priority !== undefined && { priority })
      }
    });

    await logAuditEvent({
      action: "ENGAGE_PUSH_UPDATE",
      userId: session.user.id,
      entity: "ENGAGE_PUSH_NOTIFICATION",
      entityId: id,
      severity: "info",
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    await logSystemError({ action: "PUT_ENGAGE_PUSH_UPDATE", error, entity: "ENGAGE_PUSH_NOTIFICATION" });
    return new NextResponse(error.message || "Erro ao atualizar notificação.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.engagePushNotification.findUnique({
      where: { id }
    });

    if (!existing) {
      return new NextResponse("Notificação não encontrada.", { status: 404 });
    }

    await prisma.engagePushNotification.delete({
      where: { id }
    });

    await logAuditEvent({
      action: "ENGAGE_PUSH_DELETE",
      userId: session.user.id,
      entity: "ENGAGE_PUSH_NOTIFICATION",
      entityId: id,
      severity: "warning",
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    await logSystemError({ action: "DELETE_ENGAGE_PUSH", error, entity: "ENGAGE_PUSH_NOTIFICATION" });
    return new NextResponse(error.message || "Erro ao excluir notificação.", { status: 500 });
  }
}
