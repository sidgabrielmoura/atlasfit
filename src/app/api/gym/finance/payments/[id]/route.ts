import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { planName, amount, status, method, createdAt } = body;

    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId: payment.workspaceId,
      anyCapability: ["payments.record", "invoices.issue", "workspace.manage"],
    });

    const updateData: any = {};
    if (planName !== undefined) updateData.planName = planName;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (status !== undefined) {
      updateData.status = status;
      if (status === "pago" && payment.status !== "pago") {
        updateData.paidAt = new Date();
        updateData.paidBy = context.userId;
        updateData.actionType = "MANUAL";
      } else if (status === "pendente" && payment.status === "pago") {
        updateData.paidAt = null;
        updateData.paidBy = null;
        updateData.reopenedAt = new Date();
        updateData.reopenedBy = context.userId;
        updateData.actionType = "MANUAL";
      }
    }
    if (method !== undefined) updateData.method = method;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

    const updatedPayment = await serializableTransaction(async (tx) => {
      const p = await tx.workspacePayment.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_PAYMENT_UPDATED",
          entity: "PAYMENT",
          entityId: id,
          severity: "info",
        },
      });

      return p;
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("PATCH gym payment error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao atualizar pagamento." }, { status: 500 });
  }
});

export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId: payment.workspaceId,
      anyCapability: ["payments.record", "invoices.issue", "workspace.manage"],
    });

    await serializableTransaction(async (tx) => {
      await tx.workspacePayment.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_PAYMENT_DELETED",
          entity: "PAYMENT",
          entityId: id,
          severity: "info",
        },
      });
    });

    return NextResponse.json({ success: true, message: "Pagamento excluído com sucesso." });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("DELETE gym payment error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao excluir pagamento." }, { status: 500 });
  }
});
