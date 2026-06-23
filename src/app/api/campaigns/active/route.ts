import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const now = new Date();

    // Auto-deactivate campaigns in the database if their endDate has passed
    await prisma.campaign.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now }
      },
      data: {
        isActive: false
      }
    });

    // Map the GlobalRole to CampaignTarget
    const targetRoles: ("PERSONAL" | "STUDENT" | "ALL")[] = ["ALL"];
    
    if (user.role === "TRAINER") {
      targetRoles.push("PERSONAL");
    } else if (user.role === "STUDENT" || user.role === "USER") {
      targetRoles.push("STUDENT");
    }

    // Retrieve active campaigns filtering by date, role, and already-viewed constraints
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        isActive: true,
        targetRole: { in: targetRoles },
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { showOnlyOnce: false },
          {
            showOnlyOnce: true,
            views: {
              none: {
                userId: user.id
              }
            }
          }
        ]
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json(activeCampaigns);
  } catch (error) {
    await logSystemError({ action: "GET_ACTIVE_CAMPAIGNS", error, entity: "CAMPAIGN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
