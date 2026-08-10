import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AsaasAdapter } from "@/modules/payments/providers/asaas/asaas-adapter";
import { StudentBillingStatus, LedgerEntryType, LedgerDirection } from "@prisma/client";
import { publishToChannel } from "@/lib/ably";

const adapter = new AsaasAdapter();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const studentUserId = session.user.id;

    const studentPendingBillings = await prisma.studentBilling.findMany({
      where: {
        studentUserId,
        status: StudentBillingStatus.PENDING
      },
      include: {
        account: true
      }
    });

    for (const billing of studentPendingBillings) {
      if (!billing.providerBillingId || !billing.account?.providerAccountId) continue;
      const remotePayment = await adapter.getPayment(
        billing.providerBillingId,
        billing.account.providerAccountId
      );

      if (
        remotePayment &&
        ["RECEIVED", "CONFIRMED", "DUNNING_RECEIVED", "RECEIVED_IN_CASH"].includes(remotePayment.status)
      ) {
        const isSettled = remotePayment.status === "RECEIVED" || remotePayment.status === "DUNNING_RECEIVED" || remotePayment.status === "RECEIVED_IN_CASH";
        const newStatus = isSettled ? StudentBillingStatus.SETTLED : StudentBillingStatus.CONFIRMED;

        await prisma.$transaction(async (tx) => {
          await tx.studentBilling.update({
            where: { id: billing.id },
            data: {
              status: newStatus,
              confirmedAt: billing.confirmedAt || new Date(),
              settledAt: isSettled ? new Date() : billing.settledAt,
              paidAt: billing.paidAt || new Date()
            }
          });

          await tx.walletLedgerEntry.upsert({
            where: { idempotencyKey: `LEDGER_CONFIRM_${billing.id}_STUDENT_SYNC` },
            create: {
              providerAccountId: billing.providerAccountId,
              billingId: billing.id,
              idempotencyKey: `LEDGER_CONFIRM_${billing.id}_STUDENT_SYNC`,
              type: isSettled ? LedgerEntryType.PAYMENT_SETTLED : LedgerEntryType.PAYMENT_CONFIRMED,
              direction: LedgerDirection.CREDIT,
              amountInCents: billing.personalNetEstimatedInCents,
              occurredAt: new Date(),
              description: `Pagamento sincronizado para ${billing.title}`
            },
            update: {}
          });
        });

        const studentMember = await prisma.workspaceMember.findFirst({
          where: { userId: studentUserId, role: "STUDENT" }
        });

        if (studentMember) {
          await prisma.workspacePayment.updateMany({
            where: {
              workspaceId: studentMember.workspaceId,
              status: "pendente"
            },
            data: { status: "pago" }
          });

          await publishToChannel(`workspace:${studentMember.workspaceId}`, "financial:updated", {
            type: "FINANCIAL_PAYMENT_UPDATED",
            workspaceId: studentMember.workspaceId,
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }

        if (billing.account?.personalUserId) {
          await publishToChannel(`user:${billing.account.personalUserId}`, "wallet:updated", {
            type: "BALANCE_UPDATED",
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }

        await publishToChannel(`user:${studentUserId}`, "wallet:updated", {
          type: "BALANCE_UPDATED",
          billingId: billing.id,
          timestamp: new Date().toISOString()
        });
      }
    }

    const studentMember = await prisma.workspaceMember.findFirst({
      where: { userId: studentUserId, role: "STUDENT" },
      include: { workspace: true }
    });

    const billings = await prisma.studentBilling.findMany({
      where: { studentUserId },
      orderBy: { createdAt: "desc" }
    });

    const pendingBillings = billings
      .filter((b) => b.status === "PENDING" || b.status === "OVERDUE")
      .map((b) => ({
        id: b.id,
        title: b.title,
        grossAmountInCents: b.grossAmountInCents.toString(),
        dueDate: b.dueDate.toISOString(),
        status: b.status,
        paymentMethod: b.paymentMethod,
        pixCopyPaste: b.pixPayloadEncrypted || undefined,
        hostedInvoiceUrl: b.hostedInvoiceUrl || undefined
      }));

    const paidBillings = billings
      .filter((b) => b.status === "SETTLED" || b.status === "CONFIRMED")
      .map((b) => ({
        id: b.id,
        title: b.title,
        grossAmountInCents: b.grossAmountInCents.toString(),
        paidAt: b.paidAt ? b.paidAt.toISOString() : b.createdAt.toISOString(),
        paymentMethod: b.paymentMethod,
        hostedInvoiceUrl: b.hostedInvoiceUrl || undefined
      }));

    const nextDueDate = pendingBillings.length > 0
      ? pendingBillings[0].dueDate
      : null;

    const activeRecurrence = studentMember && studentMember.billingIsActive && (studentMember.billingControlType === "AUTOMATIC" || studentMember.billingControlType === "CONFIRMATION" || (studentMember as any).billingSource === "ATLAS_PAY")
      ? {
          id: studentMember.id,
          price: studentMember.billingPrice,
          periodicity: studentMember.billingPeriodicity,
          paymentMethod: studentMember.billingPaymentMethod || "CREDIT_CARD",
          source: (studentMember as any).billingSource || "MANUAL",
          asaasSubscriptionId: (studentMember as any).asaasSubscriptionId || null,
          createdAt: (studentMember as any).billingCreatedAt ? (studentMember as any).billingCreatedAt.toISOString() : studentMember.createdAt.toISOString(),
          nextDueDate: studentMember.billingNextDueDate ? studentMember.billingNextDueDate.toISOString() : null,
          description: studentMember.billingDescription || "Mensalidade de Assessoria"
        }
      : null;

    return NextResponse.json({
      workspaceName: studentMember?.workspace?.name || "AtlasFit Workspace",
      activePlan: {
        name: "Consultoria AtlasFit",
        status: studentMember?.isActive ? "ATIVO" : "INATIVO",
        nextDueDate
      },
      activeRecurrence,
      pendingBillings,
      paidBillings
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar finanças do aluno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
