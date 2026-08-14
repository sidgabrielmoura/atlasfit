import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createPollSchema } from "@/lib/roadmap/schemas";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const body = await req.json();
    const parsed = createPollSchema.parse(body);

    // Deactivate existing active polls
    await prisma.roadmapPoll.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "CLOSED" },
    });

    const poll = await prisma.roadmapPoll.create({
      data: {
        title: parsed.title,
        description: parsed.description || null,
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
        allowVoteChange: parsed.allowVoteChange,
        status: "ACTIVE",
        createdById: session.user.id,
        options: {
          create: parsed.options.map((optionTitle, index) => ({
            title: optionTitle,
            position: index + 1,
          })),
        },
      },
      include: { options: true },
    });

    await prisma.roadmapAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "POLL_CREATED",
        entity: "POLL",
        entityId: poll.id,
        metadata: JSON.stringify({ title: poll.title }),
      },
    });

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("POST /api/superadmin/roadmap/polls error:", error);
    return new NextResponse("Erro ao criar enquete", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const body = await req.json();
    const { pollId, title, description, endsAt, allowVoteChange, status } = body;

    if (!pollId) {
      return new NextResponse("pollId é obrigatório", { status: 400 });
    }

    const dataToUpdate: any = {};
    if (title) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (endsAt !== undefined) dataToUpdate.endsAt = endsAt ? new Date(endsAt) : null;
    if (allowVoteChange !== undefined) dataToUpdate.allowVoteChange = Boolean(allowVoteChange);
    if (status) dataToUpdate.status = status;

    const poll = await prisma.roadmapPoll.update({
      where: { id: pollId },
      data: dataToUpdate,
    });

    await prisma.roadmapAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "POLL_UPDATED",
        entity: "POLL",
        entityId: pollId,
        metadata: JSON.stringify(dataToUpdate),
      },
    });

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    console.error("PATCH /api/superadmin/roadmap/polls error:", error);
    return new NextResponse("Erro ao atualizar enquete", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pollId = searchParams.get("pollId");

    if (!pollId) {
      return new NextResponse("pollId é obrigatório", { status: 400 });
    }

    await prisma.roadmapPoll.delete({
      where: { id: pollId },
    });

    await prisma.roadmapAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "POLL_DELETED",
        entity: "POLL",
        entityId: pollId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/superadmin/roadmap/polls error:", error);
    return new NextResponse("Erro ao excluir enquete", { status: 500 });
  }
}
