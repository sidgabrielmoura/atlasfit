import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const activities = await prisma.subscriptionActivity.findMany({
      include: {
        user: true,
        plan: true
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    
    const formattedActivities = activities.map(act => ({
      ...act,
      workspace: {
        name: act.user?.name || "Conta de Personal",
        logo: act.user?.name?.slice(0, 2).toUpperCase() || "CP"
      }
    }));
    
    // Fallback to active subscriptions if activities are empty
    if (formattedActivities.length === 0) {
      const subscriptions = await prisma.subscription.findMany({
        include: {
          user: true,
          plan: true
        },
        orderBy: { startDate: "desc" }
      });
      return NextResponse.json(subscriptions.map(sub => ({
        ...sub,
        createdAt: sub.startDate, // Map for UI consistency
        type: "NEW_SUBSCRIPTION",
        workspace: {
          name: sub.user?.name || "Conta de Personal",
          logo: sub.user?.name?.slice(0, 2).toUpperCase() || "CP"
        }
      })));
    }

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error("GET_SUBSCRIPTIONS_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
