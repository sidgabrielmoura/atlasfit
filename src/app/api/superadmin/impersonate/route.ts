import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";
import { logSystemError, logAuditEvent } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const limiter = await rateLimit(`impersonate:${session.user.id}:${ip}`, 10, 60000);

  if (!limiter.success) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente mais tarde." }, {
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
    const { targetUserId, reason } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "O ID do usuário alvo é obrigatório." }, { status: 400 });
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json({
        error: "A justificativa/motivo do impersonation é obrigatória (mínimo de 5 caracteres) para fins de auditoria e conformidade de segurança.",
      }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || !targetUser.email) {
      return NextResponse.json({ error: "Usuário alvo não encontrado ou não possui e-mail cadastrado." }, { status: 404 });
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
      },
    });

    // Registrar auditoria rigorosa de segurança
    await logAuditEvent({
      userId: session.user.id,
      action: `IMPERSONATION_STARTED: Target ${targetUser.email} - Justificativa: ${reason.trim()}`,
      entity: "USER",
      entityId: targetUserId,
      severity: "warning",
      ip,
    });

    return NextResponse.json({ token, email: targetUser.email }, { status: 200 });
  } catch (error) {
    await logSystemError({ action: "POST_IMPERSONATE_START", error, entity: "IMPERSONATION" });
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
