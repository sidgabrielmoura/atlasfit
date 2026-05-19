import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH: Edit plan details or active status
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const plan = await prisma.workspacePlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return new NextResponse("Plano não encontrado.", { status: 404 });
    }

    // Verify workspace membership of the logged-in trainer
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: plan.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const body = await req.json();
    const { name, price, interval, isActive } = body;

    const updatedPlan = await prisma.workspacePlan.update({
      where: { id },
      data: {
        name: name !== undefined ? name : plan.name,
        price: price !== undefined ? parseFloat(price) : plan.price,
        interval: interval !== undefined ? interval : plan.interval,
        isActive: isActive !== undefined ? isActive : plan.isActive,
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("PATCH plan error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Delete a plan
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const plan = await prisma.workspacePlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return new NextResponse("Plano não encontrado.", { status: 404 });
    }

    // Verify workspace membership of the logged-in trainer
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: plan.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    await prisma.workspacePlan.delete({
      where: { id },
    });

    return new NextResponse("Plano deletado com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE plan error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

