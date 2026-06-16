import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";
import { logSystemError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const limiter = await rateLimit(`impersonate:${session.user.id}:${ip}`, 10, 60000);

  if (!limiter.success) {
    return new NextResponse("Muitas requisições. Tente novamente mais tarde.", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limiter.limit),
        "X-RateLimit-Remaining": String(limiter.remaining),
        "X-RateLimit-Reset": String(limiter.reset),
      },
    });
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
    await logSystemError({ action: "POST_IMPERSONATE_START", error, entity: "IMPERSONATION" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
