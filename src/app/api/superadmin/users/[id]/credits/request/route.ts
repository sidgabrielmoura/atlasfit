import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";
import { z } from "zod";
import { EmailService } from "@/lib/emails/service";

const requestSchema = z.object({
  amount: z.number().int().min(1, "Quantidade de créditos deve ser maior que zero.").max(1000000, "Limite de 1.000.000 de créditos por concessão."),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "ID do usuário não fornecido." }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const { amount } = parseResult.data;

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, importCredits: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário de destino não encontrado." }, { status: 404 });
    }

    // Verify superadmin email exists to receive verification code
    const superadminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    const superadminEmail = superadminUser?.email || session.user.email;
    if (!superadminEmail) {
      return NextResponse.json(
        { error: "Seu usuário SuperAdmin não possui um e-mail cadastrado para validação." },
        { status: 400 }
      );
    }

    // Invalidate any previously pending challenge for this user pair
    await prisma.creditGrantChallenge.updateMany({
      where: {
        targetUserId,
        actorUserId: session.user.id,
        status: "PENDING",
      },
      data: { status: "EXPIRED" },
    });

    // Generate cryptographically secure 6-digit code and SHA-256 hash
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Create challenge record in DB
    const challenge = await prisma.creditGrantChallenge.create({
      data: {
        targetUserId,
        actorUserId: session.user.id,
        amount,
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        status: "PENDING",
        expiresAt,
      },
    });

    // Send verification code to superadmin email
    await EmailService.sendCreditGrantVerificationCode({
      to: superadminEmail,
      code,
      amount,
      targetUserName: targetUser.name || targetUser.email || "Usuário",
    });

    // Audit log: CREDIT_GRANT_REQUESTED
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREDIT_GRANT_REQUESTED",
        entity: "USER",
        entityId: targetUserId,
        severity: "info",
        metadata: {
          challengeId: challenge.id,
          amount,
          targetUserId,
          targetUserEmail: targetUser.email,
          superadminEmail,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      challengeId: challenge.id,
      expiresInSeconds,
      superadminEmail,
      amount,
    });
  } catch (error: any) {
    console.error("[CREDIT_GRANT_REQUEST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar solicitação de concessão de créditos." },
      { status: 500 }
    );
  }
}
