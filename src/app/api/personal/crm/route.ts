import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        workspaceId,
        ownerId: session.user.id,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const inNegotiation = leads.filter((l) => ["contacted", "scheduled", "proposal", "negotiation"].includes(l.status)).length;
    const converted = leads.filter((l) => l.status === "won").length;
    const lostLeads = leads.filter((l) => l.status === "lost").length;
    const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    const activeLeads = leads.filter((l) => l.status !== "won" && l.status !== "lost");
    const potentialRevenue = activeLeads.reduce((acc, l) => acc + (l.potentialValue || 0), 0);
    const closedRevenue = leads.filter((l) => l.status === "won").reduce((acc, l) => acc + (l.potentialValue || 0), 0);

    const wonLeads = leads.filter((l) => l.status === "won");
    let averageConversionTime = 0;
    if (wonLeads.length > 0) {
      const totalDays = wonLeads.reduce((acc, l) => {
        const diffTime = Math.abs(new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime());
        return acc + diffTime / (1000 * 60 * 60 * 24);
      }, 0);
      averageConversionTime = Math.round(totalDays / wonLeads.length);
    }

    return NextResponse.json({
      leads,
      metrics: {
        totalLeads,
        newLeads,
        inNegotiation,
        converted,
        lostLeads,
        conversionRate,
        potentialRevenue,
        closedRevenue,
        averageConversionTime,
      },
    });
  } catch (error) {
    console.error("GET crm leads error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      workspaceId,
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
    } = body;

    if (!workspaceId || !name || !status) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          workspaceId,
          ownerId: session.user.id,
          name,
          phone: phone || null,
          whatsapp: whatsapp || null,
          email: email || null,
          instagram: instagram || null,
          goal: goal || null,
          source: source || null,
          notes: notes || null,
          potentialValue: potentialValue ? parseFloat(potentialValue) : null,
          status,
          tags: tags && tags.length > 0 ? {
            connectOrCreate: tags.map((t: any) => ({
              where: { workspaceId_name: { workspaceId, name: t.name.trim() } },
              create: { workspaceId, name: t.name.trim(), color: t.color || "bg-primary/20" },
            })),
          } : undefined,
          customValues: customValues && customValues.length > 0 ? {
            create: customValues.map((cv: any) => ({
              fieldDefinitionId: cv.fieldDefinitionId,
              value: cv.value,
            })),
          } : undefined,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: newLead.id,
          content: "Lead criado no sistema",
        },
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      await tx.leadTask.create({
        data: {
          leadId: newLead.id,
          title: "Primeiro contato comercial",
          dueDate: tomorrow,
          time: "09:00",
          priority: "ALTA",
          status: "PENDING",
        },
      });

      return newLead;
    });

    await NotificationService.sendNotification({
      userId: session.user.id,
      type: "CRM_LEAD_CREATED",
      category: "CRM",
      title: "Novo Lead Capturado 🎯",
      description: `O lead "${name}" foi adicionado com sucesso ao seu funil de CRM.`,
      deepLink: "/personal/crm",
      source: "CRM"
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("POST crm lead error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, lostReason, lostReasonDetails } = body;

    if (!id || !status) {
      return new NextResponse("ID e Status são obrigatórios.", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const oldStatus = lead.status;

    if (oldStatus !== status) {
      const statusNames: Record<string, string> = {
        new: "Novos Leads",
        contacted: "Contato Realizado",
        scheduled: "Avaliação Agendada",
        proposal: "Proposta Enviada",
        negotiation: "Negociação",
        won: "Fechado",
        lost: "Perdido",
      };

      const updatedLead = await prisma.$transaction(async (tx) => {
        const uLead = await tx.lead.update({
          where: { id },
          data: {
            status,
            lostReason: lostReason || null,
            lostReasonDetails: lostReasonDetails || null,
          },
        });

        let content = `Status alterado de "${statusNames[oldStatus] || oldStatus}" para "${statusNames[status] || status}"`;
        if (status === "lost" && lostReason) {
          content += ` | Motivo da perda: ${lostReason}`;
        }

        await tx.leadActivity.create({
          data: {
            leadId: id,
            content,
          },
        });

        if (status === "scheduled") {
          const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000);
          const todayStr = nowLocal.toISOString().split("T")[0];
          await tx.trainerTask.create({
            data: {
              workspaceId: uLead.workspaceId,
              title: `Avaliação Comercial: ${uLead.name}`,
              time: "10:00",
              type: "avaliação",
              completed: false,
              scheduledDate: todayStr,
            },
          });
        }

        return uLead;
      });

      await NotificationService.sendNotification({
        userId: session.user.id,
        type: "CRM_LEAD_STATUS_UPDATED",
        category: "CRM",
        title: "Lead Atualizado 🔄",
        description: `O status do lead "${updatedLead.name}" foi alterado para "${statusNames[status] || status}".`,
        deepLink: "/personal/crm",
        source: "CRM"
      });

      return NextResponse.json(updatedLead);
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("PUT crm lead status error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
