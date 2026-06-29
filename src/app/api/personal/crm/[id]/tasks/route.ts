import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, dueDate, time, priority } = body;

    if (!title) {
      return new NextResponse("O título da tarefa é obrigatório.", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.leadTask.create({
        data: {
          leadId: id,
          title,
          dueDate: dueDate ? new Date(dueDate) : null,
          time: time || "09:00",
          priority: priority || "MEDIA",
          status: "PENDING",
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          content: `Tarefa criada: "${title}"`,
        },
      });

      return newTask;
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST crm task error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { taskId, status, title, dueDate, time, priority } = body;

    if (!taskId) {
      return new NextResponse("ID da tarefa é obrigatório.", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const task = await prisma.leadTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.leadId !== id) {
      return new NextResponse("Tarefa não encontrada.", { status: 404 });
    }

    const dataToUpdate: any = {};
    const oldStatus = task.status;

    if (status !== undefined) dataToUpdate.status = status;
    if (title !== undefined) dataToUpdate.title = title;
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (time !== undefined) dataToUpdate.time = time;
    if (priority !== undefined) dataToUpdate.priority = priority;

    const updatedTask = await prisma.$transaction(async (tx) => {
      const uTask = await tx.leadTask.update({
        where: { id: taskId },
        data: dataToUpdate,
      });

      if (status !== undefined && oldStatus !== status) {
        let text = `Status da tarefa "${task.title}" alterado para `;
        if (status === "COMPLETED") text += '"Concluída"';
        else if (status === "PENDING") text += '"Pendente"';
        else if (status === "OVERDUE") text += '"Atrasada"';
        else text += `"${status}"`;

        await tx.leadActivity.create({
          data: {
            leadId: id,
            content: text,
          },
        });
      }

      return uTask;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PATCH crm task error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return new NextResponse("ID da tarefa é obrigatório.", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const task = await prisma.leadTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.leadId !== id) {
      return new NextResponse("Tarefa não encontrada.", { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.leadTask.delete({
        where: { id: taskId },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          content: `Tarefa excluída: "${task.title}"`,
        },
      });
    });

    return new NextResponse("Tarefa excluída com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE crm task error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
