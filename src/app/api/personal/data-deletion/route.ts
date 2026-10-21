import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logSystemError } from "@/lib/logger";

async function handleGET() {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const request = await prisma.dataDeletionRequest.findUnique({
      where: { userId: session.user.id }
    });

    if (!request || request.status !== "PENDING") {
      return NextResponse.json({ requested: false });
    }

    return NextResponse.json({
      requested: true,
      requestedAt: request.requestedAt.toISOString(),
    });
  } catch (error) {
    await logSystemError({ action: "GET_PERSONAL_DATA_DELETION_REQUEST", error, entity: "USER" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function POST() {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const userId = session.user.id;

    const request = await prisma.dataDeletionRequest.upsert({
      where: { userId },
      update: {
        status: "PENDING",
        requestedAt: new Date(),
      },
      create: {
        userId,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DATA_DELETION_REQUESTED",
        entity: "USER",
        entityId: userId,
        severity: "warning",
      },
    });

    return NextResponse.json({
      success: true,
      requestedAt: request.requestedAt.toISOString(),
    });
  } catch (error) {
    await logSystemError({ action: "POST_PERSONAL_DATA_DELETION_REQUEST", error, entity: "USER" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE() {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const userId = session.user.id;

    await prisma.dataDeletionRequest.deleteMany({
      where: { userId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DATA_DELETION_CANCELLED",
        entity: "USER",
        entityId: userId,
        severity: "info",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await logSystemError({ action: "DELETE_PERSONAL_DATA_DELETION_REQUEST", error, entity: "USER" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
