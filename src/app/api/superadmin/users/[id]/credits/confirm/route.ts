import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";
import { z } from "zod";

const confirmSchema = z.object({
  challengeId: z.string().min(1, "ID do desafio não fornecido."),
  code: z.string().length(6, "O código de verificação deve ter exatamente 6 dígitos."),
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
    const parseResult = confirmSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const { challengeId, code } = parseResult.data;

    const result = await prisma.$transaction(async (tx) => {
      const challenge = await tx.creditGrantChallenge.findUnique({
        where: { id: challengeId },
      });

      if (
        !challenge ||
        challenge.targetUserId !== targetUserId ||
        challenge.actorUserId !== session.user.id
      ) {
        return {
          status: 404,
          error: "Solicitação de validação não encontrada.",
        };
      }

      if (challenge.status !== "PENDING") {
        const msg =
          challenge.status === "COMPLETED"
            ? "Este código já foi validado e utilizado."
            : challenge.status === "EXHAUSTED"
              ? "Este código foi bloqueado por excesso de tentativas incorretas."
              : "Este código expirou ou foi cancelado.";
        return { status: 400, error: msg, codeExhausted: true };
      }

      // Check expiration
      if (new Date() > challenge.expiresAt) {
        await tx.creditGrantChallenge.update({
          where: { id: challenge.id },
          data: { status: "EXPIRED" },
        });
        return {
          status: 400,
          error: "O tempo limite de 5 minutos para validação do código expirou.",
          codeExpired: true,
        };
      }

      // Check attempts limit
      if (challenge.attempts >= challenge.maxAttempts) {
        await tx.creditGrantChallenge.update({
          where: { id: challenge.id },
          data: { status: "EXHAUSTED" },
        });
        return {
          status: 400,
          error: "Limite de tentativas excedido (3/3). Operação cancelada.",
          codeExhausted: true,
        };
      }

      // Timing-safe comparison of code hash
      const inputHash = crypto.createHash("sha256").update(code).digest("hex");
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(challenge.codeHash),
        Buffer.from(inputHash)
      );

      if (!isMatch) {
        const newAttempts = challenge.attempts + 1;
        const isExhausted = newAttempts >= challenge.maxAttempts;

        await tx.creditGrantChallenge.update({
          where: { id: challenge.id },
          data: {
            attempts: newAttempts,
            status: isExhausted ? "EXHAUSTED" : "PENDING",
          },
        });

        // Audit log: CREDIT_GRANT_CODE_FAILED
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: "CREDIT_GRANT_CODE_FAILED",
            entity: "USER",
            entityId: targetUserId,
            severity: "warning",
            metadata: {
              challengeId: challenge.id,
              attemptNumber: newAttempts,
              maxAttempts: challenge.maxAttempts,
              exhausted: isExhausted,
              remainingAttempts: Math.max(0, challenge.maxAttempts - newAttempts),
            },
          },
        });

        return {
          status: 400,
          error: isExhausted
            ? "Código de verificação incorreto. Limite de 3 tentativas atingido. Operação cancelada."
            : `Código de verificação incorreto. Restam ${challenge.maxAttempts - newAttempts} tentativa(s).`,
          codeExhausted: isExhausted,
          remainingAttempts: Math.max(0, challenge.maxAttempts - newAttempts),
        };
      }

      // Code matched!
      // Mark challenge as completed
      await tx.creditGrantChallenge.update({
        where: { id: challenge.id },
        data: { status: "COMPLETED" },
      });

      // Atomically increment importCredits
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          importCredits: { increment: challenge.amount },
        },
        select: {
          id: true,
          email: true,
          name: true,
          importCredits: true,
        },
      });

      // Audit log: CREDIT_GRANT_CONFIRMED
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREDIT_GRANT_CONFIRMED",
          entity: "USER",
          entityId: targetUserId,
          severity: "high",
          metadata: {
            challengeId: challenge.id,
            amountAdded: challenge.amount,
            newCreditBalance: updatedUser.importCredits,
            targetUserId,
            targetUserEmail: updatedUser.email,
          },
        },
      });

      return {
        status: 200,
        success: true,
        newCredits: updatedUser.importCredits,
        amountAdded: challenge.amount,
      };
    });

    if (result.status !== 200) {
      return NextResponse.json(
        {
          error: result.error,
          codeExhausted: result.codeExhausted,
          codeExpired: result.codeExpired,
          remainingAttempts: result.remainingAttempts,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      newCredits: result.newCredits,
      amountAdded: result.amountAdded,
    });
  } catch (error: any) {
    console.error("[CREDIT_GRANT_CONFIRM] Error:", error);
    return NextResponse.json(
      { error: "Erro ao confirmar código de concessão de créditos." },
      { status: 500 }
    );
  }
}
