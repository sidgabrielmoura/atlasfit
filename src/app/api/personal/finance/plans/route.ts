import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET: Fetch all plans of a given workspace
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
    // Verify that the logged-in trainer belongs to this workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Fetch all plans of the workspace
    let plans = await prisma.workspacePlan.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Seed default plans if none exist for a fresh, wow-effect experience!
    if (plans.length === 0) {
      const defaultPlans = [
        {
          name: "Plano Mensal",
          price: 150.0,
          interval: "mensal",
          link: "https://checkout.atlasfit.com/plano-mensal",
          isActive: true,
        },
        {
          name: "Plano Trimestral",
          price: 390.0,
          interval: "trimestral",
          link: "https://checkout.atlasfit.com/plano-trimestral",
          isActive: true,
        },
        {
          name: "Plano Anual",
          price: 1320.0,
          interval: "anual",
          link: "https://checkout.atlasfit.com/plano-anual",
          isActive: true,
        },
      ];

      await prisma.workspacePlan.createMany({
        data: defaultPlans.map((p) => ({
          ...p,
          workspaceId,
        })),
      });

      // Refetch
      plans = await prisma.workspacePlan.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }

    // Map plans to include active subscriber count dynamically!
    // We can count students from WorkspaceMember whose 'plan' field matches the plan's name.
    const mappedPlans = await Promise.all(
      plans.map(async (plan) => {
        const subscriberCount = await prisma.workspaceMember.count({
          where: {
            workspaceId,
            role: "STUDENT",
            plan: plan.name,
            isActive: true,
          },
        });

        return {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
          link: plan.link || "",
          active: plan.isActive,
          subscribers: subscriberCount,
        };
      })
    );

    return NextResponse.json(mappedPlans);
  } catch (error) {
    console.error("GET plans error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// POST: Create a new plan for a workspace
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, name, price, interval, isActive } = body;

    if (!workspaceId || !name || price === undefined) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify workspace membership of the logged-in trainer
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Create the plan
    const createdPlan = await prisma.workspacePlan.create({
      data: {
        workspaceId,
        name,
        price: parseFloat(price),
        interval: interval || "mensal",
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Generate gateway link automatically
    const gatewayLink = `https://checkout.gateway.com/plan-${createdPlan.id}`;

    // Update with gateway link
    const updatedPlan = await prisma.workspacePlan.update({
      where: { id: createdPlan.id },
      data: {
        link: gatewayLink,
      },
    });

    return NextResponse.json(updatedPlan, { status: 201 });
  } catch (error) {
    console.error("POST plan error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
