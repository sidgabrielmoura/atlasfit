import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;

    const campaignExists = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!campaignExists) {
      return new NextResponse("Campaign not found", { status: 404 });
    }

    // Write a CampaignView record idempotently
    await prisma.campaignView.upsert({
      where: {
        campaignId_userId: {
          campaignId: id,
          userId: session.user.id,
        },
      },
      update: {}, // No updates needed
      create: {
        campaignId: id,
        userId: session.user.id,
      },
    });

    return new NextResponse("View registered successfully", { status: 200 });
  } catch (error) {
    await logSystemError({
      action: "POST_CAMPAIGN_VIEW",
      error,
      entity: "CAMPAIGN_VIEW",
      entityId: (await params).id,
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
