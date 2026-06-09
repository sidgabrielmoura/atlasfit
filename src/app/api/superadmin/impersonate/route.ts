import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return new NextResponse("Missing target user ID", { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser || !targetUser.email) {
      return new NextResponse("User not found or has no email", { status: 404 });
    }

    // Gerar um token seguro único e temporário (expira em 2 minutos)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 2);

    await prisma.verificationToken.create({
      data: {
        identifier: `IMPERSONATION:${targetUser.email}:${session.user.email}`,
        token,
        expires,
      }
    });

    return NextResponse.json({ token, email: targetUser.email }, { status: 200 });
  } catch (error) {
    console.error("IMPERSONATE_TOKEN_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
