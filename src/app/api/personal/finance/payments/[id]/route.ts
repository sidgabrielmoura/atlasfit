import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logSystemError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { studentName, planName, amount, status, method, createdAt } = body;

    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return new NextResponse("Pagamento não encontrado.", { status: 404 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: payment.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const updateData: any = {};
    if (studentName !== undefined) updateData.studentName = studentName;
    if (planName !== undefined) updateData.planName = planName;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (status !== undefined) updateData.status = status;
    if (method !== undefined) updateData.method = method;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

    const updatedPayment = await prisma.workspacePayment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    await logSystemError({ action: "PATCH_MANUAL_PAYMENT", error, entity: "PAYMENT", entityId: id });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Delete a manual payment record
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch existing payment to check workspace boundary
    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return new NextResponse("Pagamento não encontrado.", { status: 404 });
    }

    // Verify trainer belongs to this workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: payment.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    await prisma.workspacePayment.delete({
      where: { id },
    });

    return new NextResponse("Pagamento excluído com sucesso.", { status: 200 });
  } catch (error) {
    await logSystemError({ action: "DELETE_MANUAL_PAYMENT", error, entity: "PAYMENT", entityId: id });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
