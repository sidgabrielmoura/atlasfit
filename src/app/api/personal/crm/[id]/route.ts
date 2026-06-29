import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
        },
        tags: true,
        customValues: {
          include: {
            definition: true,
          },
        },
        files: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("GET crm lead detail error:", error);
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
    const {
      name,
      phone,
      whatsapp,
      email,
      instagram,
      goal,
      source,
      notes,
      potentialValue,
      status,
      tags,
      customValues,
      lostReason,
      lostReasonDetails,
    } = body;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const dataToUpdate: any = {};
    const changes: string[] = [];

    if (name !== undefined && name !== lead.name) {
      dataToUpdate.name = name;
      changes.push(`Nome alterado para "${name}"`);
    }
    if (phone !== undefined && phone !== lead.phone) {
      dataToUpdate.phone = phone || null;
      changes.push(phone ? `Telefone alterado para "${phone}"` : "Telefone removido");
    }
    if (whatsapp !== undefined && whatsapp !== lead.whatsapp) {
      dataToUpdate.whatsapp = whatsapp || null;
      changes.push(whatsapp ? `WhatsApp alterado para "${whatsapp}"` : "WhatsApp removido");
    }
    if (email !== undefined && email !== lead.email) {
      dataToUpdate.email = email || null;
      changes.push(email ? `E-mail alterado para "${email}"` : "E-mail removido");
    }
    if (instagram !== undefined && instagram !== lead.instagram) {
      dataToUpdate.instagram = instagram || null;
      changes.push(instagram ? `Instagram alterado para "${instagram}"` : "Instagram removido");
    }
    if (goal !== undefined && goal !== lead.goal) {
      dataToUpdate.goal = goal || null;
      changes.push(goal ? `Objetivo alterado para "${goal}"` : "Objetivo removido");
    }
    if (source !== undefined && source !== lead.source) {
      dataToUpdate.source = source || null;
      changes.push(source ? `Origem alterada para "${source}"` : "Origem removida");
    }
    if (notes !== undefined && notes !== lead.notes) {
      dataToUpdate.notes = notes || null;
      changes.push("Anotações atualizadas");
    }
    if (potentialValue !== undefined) {
      const pVal = potentialValue ? parseFloat(potentialValue) : null;
      if (pVal !== lead.potentialValue) {
        dataToUpdate.potentialValue = pVal;
        changes.push(pVal !== null ? `Valor potencial alterado para R$ ${pVal}` : "Valor potencial removido");
      }
    }
    if (status !== undefined && status !== lead.status) {
      dataToUpdate.status = status;
      changes.push(`Status alterado para "${status}"`);
    }
    if (lostReason !== undefined && lostReason !== lead.lostReason) {
      dataToUpdate.lostReason = lostReason || null;
      dataToUpdate.lostReasonDetails = lostReasonDetails || null;
      changes.push(lostReason ? `Motivo da perda definido: ${lostReason}` : "Motivo da perda removido");
    }

    if (tags !== undefined) {
      dataToUpdate.tags = {
        set: [],
        connectOrCreate: tags.map((t: any) => ({
          where: { workspaceId_name: { workspaceId: lead.workspaceId, name: t.name.trim() } },
          create: { workspaceId: lead.workspaceId, name: t.name.trim(), color: t.color || "bg-primary/20" },
        })),
      };
      changes.push("Etiquetas atualizadas");
    }

    const updatedLead = await prisma.$transaction(async (tx) => {
      if (customValues !== undefined) {
        await tx.customFieldValue.deleteMany({
          where: { leadId: id },
        });
        if (customValues.length > 0) {
          await tx.customFieldValue.createMany({
            data: customValues.map((cv: any) => ({
              leadId: id,
              fieldDefinitionId: cv.fieldDefinitionId,
              value: cv.value,
            })),
          });
        }
        changes.push("Campos personalizados atualizados");
      }

      const uLead = await tx.lead.update({
        where: { id },
        data: dataToUpdate,
      });

      for (const change of changes) {
        await tx.leadActivity.create({
          data: {
            leadId: id,
            content: change,
          },
        });
      }

      return await tx.lead.findUnique({
        where: { id },
        include: {
          tags: true,
          customValues: {
            include: {
              definition: true,
            },
          },
          files: {
            orderBy: { createdAt: "desc" },
          },
          tasks: {
            orderBy: { createdAt: "desc" },
          },
          activities: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("PATCH crm lead error:", error);
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
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return new NextResponse("Lead excluído com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE crm lead error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
