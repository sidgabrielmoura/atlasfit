import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const manualEntrySchema = z.object({
  targetType: z.enum(["PERSONAL", "GYM"]),
  userId: z.string().min(1).optional(),
  workspaceId: z.string().min(1).optional(),
  amount: z.number().positive("O valor deve ser maior que zero."),
  paymentMethod: z.string().min(1, "A forma de pagamento é obrigatória."),
  description: z.string().min(1, "A descrição é obrigatória."),
  paidAt: z.string().optional(),
  isRecurring: z.boolean().default(false),
  periodicity: z.enum(["MENSAL", "QUINZENAL", "SEMANAL", "ANUAL"]).default("MENSAL"),
  nextDueDate: z.string().optional(),
  autoSuspendEnabled: z.boolean().default(true),
  toleranceDays: z.number().int().min(0).max(365).default(5),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = manualEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.targetType === "PERSONAL" && !data.userId) {
      return NextResponse.json(
        { error: "Selecione o Personal Trainer para o lançamento." },
        { status: 400 }
      );
    }

    if (data.targetType === "GYM" && !data.workspaceId) {
      return NextResponse.json(
        { error: "Selecione a Academia para o lançamento." },
        { status: 400 }
      );
    }

    if (data.isRecurring && !data.nextDueDate) {
      return NextResponse.json(
        { error: "A data do próximo vencimento é obrigatória para pagamentos recorrentes." },
        { status: 400 }
      );
    }

    const priceInCents = Math.round(data.amount * 100);
    const paidAtDate = data.paidAt ? new Date(data.paidAt) : new Date();
    const nextDueDateObj = data.isRecurring && data.nextDueDate ? new Date(data.nextDueDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      let transactionUserId = "";
      let transactionWorkspaceId: string | null = null;

      if (data.targetType === "PERSONAL") {
        const user = await tx.user.findUnique({
          where: { id: data.userId },
          include: { subscription: true },
        });

        if (!user) {
          throw new Error("Personal Trainer não encontrado.");
        }

        transactionUserId = user.id;

        // Ensure plan exists for subscription
        let planId = user.subscription?.planId;
        if (!planId) {
          const defaultPlan = await tx.plan.findFirst();

          if (!defaultPlan) {
            throw new Error("Nenhum plano cadastrado no sistema.");
          }
          planId = defaultPlan.id;
        }

        if (data.isRecurring) {
          if (user.subscription) {
            await tx.subscription.update({
              where: { id: user.subscription.id },
              data: {
                status: "active",
                billingControlType: "MANUAL",
                nextDueDate: nextDueDateObj,
                priceInCents,
                paymentMethod: data.paymentMethod,
                periodicity: data.periodicity,
                autoSuspendEnabled: data.autoSuspendEnabled,
                toleranceDays: data.toleranceDays,
                endDate: nextDueDateObj || user.subscription.endDate,
              },
            });
          } else {
            await tx.subscription.create({
              data: {
                userId: user.id,
                planId,
                status: "active",
                startDate: paidAtDate,
                endDate: nextDueDateObj,
                billingControlType: "MANUAL",
                nextDueDate: nextDueDateObj,
                priceInCents,
                paymentMethod: data.paymentMethod,
                periodicity: data.periodicity,
                autoSuspendEnabled: data.autoSuspendEnabled,
                toleranceDays: data.toleranceDays,
              },
            });
          }
        } else {
          // Pagamento avulso / pontual: mantém a assinatura ativa sem alterar as regras de recorrência do workspace
          if (user.subscription) {
            await tx.subscription.update({
              where: { id: user.subscription.id },
              data: { status: "active" },
            });
          }
        }

        // Reativar workspaces do personal se estivessem suspensos
        await tx.workspace.updateMany({
          where: { ownerId: user.id, type: "PERSONAL", isActive: false },
          data: { isActive: true },
        });

      } else {
        // GYM
        const gymWorkspace = await tx.workspace.findUnique({
          where: { id: data.workspaceId },
          include: { subscription: true },
        });

        if (!gymWorkspace || gymWorkspace.type !== "GYM") {
          throw new Error("Academia não encontrada.");
        }

        transactionUserId = gymWorkspace.ownerId;
        transactionWorkspaceId = gymWorkspace.id;

        let gymPlanId = gymWorkspace.subscription?.planId;
        if (!gymPlanId) {
          const defaultGymPlan = await tx.plan.findFirst();

          gymPlanId = defaultGymPlan?.id || null;
        }

        if (data.isRecurring) {
          if (gymWorkspace.subscription) {
            await tx.workspaceSubscription.update({
              where: { id: gymWorkspace.subscription.id },
              data: {
                status: "ACTIVE",
                billingControlType: "MANUAL",
                nextDueDate: nextDueDateObj,
                priceInCents,
                paymentMethod: data.paymentMethod,
                periodicity: data.periodicity,
                autoSuspendEnabled: data.autoSuspendEnabled,
                toleranceDays: data.toleranceDays,
                endDate: nextDueDateObj || gymWorkspace.subscription.endDate,
              },
            });
          } else {
            await tx.workspaceSubscription.create({
              data: {
                workspaceId: gymWorkspace.id,
                planId: gymPlanId,
                status: "ACTIVE",
                startDate: paidAtDate,
                endDate: nextDueDateObj,
                billingControlType: "MANUAL",
                nextDueDate: nextDueDateObj,
                priceInCents,
                paymentMethod: data.paymentMethod,
                periodicity: data.periodicity,
                autoSuspendEnabled: data.autoSuspendEnabled,
                toleranceDays: data.toleranceDays,
              },
            });
          }
        } else {
          // Pagamento avulso / pontual para academia
          if (gymWorkspace.subscription) {
            await tx.workspaceSubscription.update({
              where: { id: gymWorkspace.subscription.id },
              data: { status: "ACTIVE" },
            });
          }
        }

        // Reativar academia se estivesse suspensa
        if (!gymWorkspace.isActive) {
          await tx.workspace.update({
            where: { id: gymWorkspace.id },
            data: { isActive: true },
          });
        }
      }

      // Criar transação financeira
      const createdTx = await tx.transaction.create({
        data: {
          userId: transactionUserId,
          workspaceId: transactionWorkspaceId,
          amount: data.amount,
          status: "APPROVED",
          paymentMethod: data.paymentMethod,
          description: data.description,
          createdAt: paidAtDate,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "MANUAL_FINANCIAL_ENTRY",
          entity: data.targetType === "PERSONAL" ? "Subscription" : "WorkspaceSubscription",
          entityId: data.targetType === "PERSONAL" ? data.userId : data.workspaceId,
          severity: "info",
          metadata: {
            transactionId: createdTx.id,
            targetType: data.targetType,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            isRecurring: data.isRecurring,
            nextDueDate: data.nextDueDate || null,
            autoSuspendEnabled: data.autoSuspendEnabled,
            toleranceDays: data.toleranceDays,
          },
        },
      });

      return createdTx;
    });

    return NextResponse.json({
      success: true,
      transaction: result,
      message: "Lançamento financeiro manual registrado com sucesso.",
    });
  } catch (error: any) {
    console.error("[MANUAL_ENTRY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao registrar lançamento manual." },
      { status: 500 }
    );
  }
}
