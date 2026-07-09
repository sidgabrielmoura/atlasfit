import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";
import { EngageUserStatusType, EngageEventType } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id: experienceId } = await params;
    const body = await req.json();
    const { eventType, metadata } = body;

    if (!eventType) {
      return new NextResponse("Missing eventType", { status: 400 });
    }

    const experience = await prisma.engageExperience.findUnique({
      where: { id: experienceId },
      select: { id: true }
    });

    if (!experience) {
      return new NextResponse("Experience not found", { status: 404 });
    }

    // Determine the next user status based on the event type
    let nextStatus: EngageUserStatusType | undefined;
    const dataToUpdate: any = {};

    if (eventType === "VIEW") {
      nextStatus = EngageUserStatusType.VIEWED;
      dataToUpdate.firstViewedAt = new Date();
    } else if (eventType === "CLICK") {
      nextStatus = EngageUserStatusType.INTERACTED;
      dataToUpdate.lastInteractedAt = new Date();
    } else if (eventType === "JOIN") {
      nextStatus = EngageUserStatusType.PARTICIPATING;
      dataToUpdate.lastInteractedAt = new Date();
    } else if (eventType === "COMPLETE") {
      nextStatus = EngageUserStatusType.COMPLETED;
      dataToUpdate.completedAt = new Date();
    } else if (eventType === "DISMISS") {
      nextStatus = EngageUserStatusType.ARCHIVED;
    }

     // Transactionally log event and update user status state
    await prisma.$transaction(async (tx) => {
      // 1. Check for duplicate logs of the same type within a 3-second threshold to prevent double counting
      const recentLog = await tx.engageEventLog.findFirst({
        where: {
          experienceId,
          userId: session.user.id,
          eventType: eventType as EngageEventType,
          createdAt: {
            gte: new Date(Date.now() - 3000)
          }
        }
      });

      if (!recentLog) {
        await tx.engageEventLog.create({
          data: {
            experienceId,
            userId: session.user.id,
            eventType: eventType as EngageEventType,
            metadata: metadata || {},
          }
        });
      }

      // 2. Fetch current status to avoid going backwards in status flows (e.g. Completed -> Viewed)
      const current = await tx.engageUserStatus.findUnique({
        where: {
          experienceId_userId: {
            experienceId,
            userId: session.user.id
          }
        }
      });

      let shouldUpdateStatus = true;
      if (current) {
        const order = ["NOT_VIEWED", "VIEWED", "INTERACTED", "PARTICIPATING", "COMPLETED", "ARCHIVED"];
        const currentIndex = order.indexOf(current.status);
        const nextIndex = nextStatus ? order.indexOf(nextStatus) : -1;
        if (nextIndex <= currentIndex) {
          shouldUpdateStatus = false;
        }
      }

      if (shouldUpdateStatus && nextStatus) {
        await tx.engageUserStatus.upsert({
          where: {
            experienceId_userId: {
              experienceId,
              userId: session.user.id
            }
          },
          update: {
            status: nextStatus,
            ...dataToUpdate
          },
          create: {
            experienceId,
            userId: session.user.id,
            status: nextStatus,
            ...dataToUpdate
          }
        });
      }
    });

    return new NextResponse("Event logged successfully", { status: 200 });
  } catch (error) {
    await logSystemError({
      action: "POST_ENGAGE_EVENT",
      error,
      entity: "ENGAGE_EVENT_LOG",
      entityId: (await params).id,
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
