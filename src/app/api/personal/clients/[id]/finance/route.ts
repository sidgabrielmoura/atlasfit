import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // 1. Verify that the logged-in trainer belongs to this workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // 2. Fetch the student profile & member details to obtain name and active plan
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const studentName = studentMember.user.name || "Sem Nome";
    const studentPlan = studentMember.plan || "Mensal";

    // 3. Find payments matching student's name
    let payments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId,
        studentName,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. If payments are empty, do not seed anymore to keep database clean.

    // 5. Compute metric summaries for the student
    const totalReceived = payments
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = payments
      .filter((p) => p.status === "atrasado")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      metrics: {
        totalReceived,
        totalPending,
        totalOverdue,
      },
      payments: payments.map((p) => ({
        id: p.id,
        planName: p.planName,
        amount: p.amount,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET student finance history error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const { workspaceId, planName, amount, status, method, createdAt } = body;

    if (!workspaceId || !planName || amount === undefined || !status || !method) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify trainer belongs to the workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Fetch student's name
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const studentName = studentMember.user.name || "Sem Nome";
    const paymentDate = createdAt ? new Date(createdAt) : new Date();

    const newPayment = await prisma.workspacePayment.create({
      data: {
        workspaceId,
        studentName,
        planName,
        amount: parseFloat(amount),
        status,
        method,
        createdAt: paymentDate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newPayment);
  } catch (error) {
    console.error("POST client dynamic payment error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
