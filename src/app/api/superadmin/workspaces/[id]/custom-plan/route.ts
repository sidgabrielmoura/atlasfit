import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { logSystemError } from "@/lib/logger";

const customPlanSchema = z.object({
  name: z.string().min(2, "Nome do plano deve ter pelo menos 2 caracteres").max(100),
  price: z.number().min(0, "O valor deve ser maior ou igual a zero"),
  maxWorkspaces: z.number().int().min(1).default(1),
  maxStudents: z.number().int().min(0).nullable().optional(),
  importQuota: z.number().int().min(0).default(25),
  storageLimitMb: z.number().int().min(1).default(1024),
  features: z.string().optional(),
  isRecurring: z.boolean().default(true),
  periodicity: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]).default("MENSAL"),
  paymentMethod: z.string().default("PIX"),
  nextDueDate: z.string().optional().nullable(),
  autoSuspendEnabled: z.boolean().default(true),
  toleranceDays: z.number().int().min(0).default(5),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: workspaceId } = await params;

  try {
    const json = await req.json();
    const data = customPlanSchema.parse(json);

    const priceInCents = Math.round(data.price * 100);
    const nextDueDateObj = data.nextDueDate ? new Date(data.nextDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const effectiveStorageMb = data.storageLimitMb > 0 && data.storageLimitMb <= 50
      ? data.storageLimitMb * 1024
      : data.storageLimitMb;

    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          subscription: { include: { plan: true } },
        },
      });

      if (!workspace) {
        throw new Error("Workspace não encontrado.");
      }

      // 1. Criar registro de plano personalizado
      const plan = await tx.plan.create({
        data: {
          name: data.name,
          price: data.price,
          interval: data.periodicity === "ANUAL" ? "year" : "month",
          features: data.features || `Plano customizado para ${workspace.name}`,
          maxWorkspaces: data.maxWorkspaces,
          maxStudents: data.maxStudents ?? null,
          importQuota: data.importQuota,
          storageLimitMb: effectiveStorageMb,
          paymentMethods: data.paymentMethod,
        },
      });

      // 2. Atualizar ou vincular à assinatura
      if (workspace.type === "GYM") {
        await tx.workspaceSubscription.upsert({
          where: { workspaceId: workspace.id },
          create: {
            workspaceId: workspace.id,
            planId: plan.id,
            status: "ACTIVE",
            startDate: new Date(),
            endDate: nextDueDateObj,
            maxStudents: data.maxStudents ?? 1000,
            maxStaff: 50,
            maxUnits: data.maxWorkspaces,
            storageLimitMb: effectiveStorageMb,
            billingControlType: data.isRecurring ? "MANUAL" : "AUTOMATIC",
            nextDueDate: nextDueDateObj,
            priceInCents,
            paymentMethod: data.paymentMethod,
            periodicity: data.periodicity,
            autoSuspendEnabled: data.autoSuspendEnabled,
            toleranceDays: data.toleranceDays,
          },
          update: {
            planId: plan.id,
            status: "ACTIVE",
            endDate: nextDueDateObj,
            maxStudents: data.maxStudents ?? 1000,
            maxUnits: data.maxWorkspaces,
            storageLimitMb: effectiveStorageMb,
            billingControlType: data.isRecurring ? "MANUAL" : "AUTOMATIC",
            nextDueDate: nextDueDateObj,
            priceInCents,
            paymentMethod: data.paymentMethod,
            periodicity: data.periodicity,
            autoSuspendEnabled: data.autoSuspendEnabled,
            toleranceDays: data.toleranceDays,
          },
        });

        // Reativar workspace caso estivesse suspenso
        await tx.workspace.update({
          where: { id: workspace.id },
          data: { isActive: true },
        });
      } else {
        // PERSONAL
        const existingSub = await tx.subscription.findUnique({
          where: { userId: workspace.ownerId },
        });

        if (existingSub) {
          await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              planId: plan.id,
              status: "active",
              billingControlType: data.isRecurring ? "MANUAL" : "AUTOMATIC",
              nextDueDate: nextDueDateObj,
              priceInCents,
              paymentMethod: data.paymentMethod,
              periodicity: data.periodicity,
              autoSuspendEnabled: data.autoSuspendEnabled,
              toleranceDays: data.toleranceDays,
              endDate: nextDueDateObj,
            },
          });
        } else {
          await tx.subscription.create({
            data: {
              userId: workspace.ownerId,
              planId: plan.id,
              status: "active",
              startDate: new Date(),
              endDate: nextDueDateObj,
              billingControlType: data.isRecurring ? "MANUAL" : "AUTOMATIC",
              nextDueDate: nextDueDateObj,
              priceInCents,
              paymentMethod: data.paymentMethod,
              periodicity: data.periodicity,
              autoSuspendEnabled: data.autoSuspendEnabled,
              toleranceDays: data.toleranceDays,
            },
          });
        }

        // Reativar workspace caso estivesse suspenso
        await tx.workspace.update({
          where: { id: workspace.id },
          data: { isActive: true },
        });
      }

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          action: "CREATE_CUSTOM_WORKSPACE_PLAN",
          entity: "Workspace",
          entityId: workspace.id,
          userId: session.user.id,
          severity: "info",
          metadata: {
            planId: plan.id,
            planName: plan.name,
            price: data.price,
            isRecurring: data.isRecurring,
            periodicity: data.periodicity,
            toleranceDays: data.toleranceDays,
            maxWorkspaces: data.maxWorkspaces,
            maxStudents: data.maxStudents,
            storageLimitMb: effectiveStorageMb,
            importQuota: data.importQuota,
          },
        },
      });

      return { plan };
    });

    return NextResponse.json({ success: true, plan: result.plan });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    await logSystemError({
      action: "CREATE_CUSTOM_WORKSPACE_PLAN",
      error,
      entity: "WORKSPACE",
      entityId: workspaceId,
    });

    return NextResponse.json(
      { error: error.message || "Erro ao salvar plano personalizado." },
      { status: 500 }
    );
  }
}
