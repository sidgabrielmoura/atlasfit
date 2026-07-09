import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, objective: true }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const now = new Date();

    const freeTrial = await prisma.freeTrial.findUnique({
      where: { userId: session.user.id }
    });
    const isTrialActive = !!(freeTrial && now < new Date(freeTrial.endDate));

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { workspaceId: true, plan: true }
    });

    const workspaceIds = memberships.map(m => m.workspaceId);
    const planNames = memberships.map(m => m.plan);

    let allowedWorkspaceIds = workspaceIds;
    if (requestedWorkspaceId) {
      if (workspaceIds.includes(requestedWorkspaceId)) {
        allowedWorkspaceIds = [requestedWorkspaceId];
      } else {
        allowedWorkspaceIds = [];
      }
    }

    // Reactively update status of expired experiences to COMPLETED
    await prisma.engageExperience.updateMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: now }
      },
      data: {
        status: "COMPLETED"
      }
    });

    // Query active experiences for this user (global OR from user's workspaces)
    const experiences = await prisma.engageExperience.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { workspaceId: null },
          { workspaceId: { in: allowedWorkspaceIds } }
        ]
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    });

    if (experiences.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch user status records for these experiences
    const userStatuses = await prisma.engageUserStatus.findMany({
      where: {
        userId: user.id,
        experienceId: { in: experiences.map((e: any) => e.id) }
      }
    });

    const statusMap = new Map(userStatuses.map((s: any) => [s.experienceId, s.status]));

    // Programmatic advanced segmentation filters
    const filtered = experiences.filter((exp: any) => {
      const userStatus = statusMap.get(exp.id) || "NOT_VIEWED";

          // 1. Exclude if showOnlyOnce is true and the user has already viewed, completed, or dismissed it
      if (exp.showOnlyOnce && userStatus !== "NOT_VIEWED") {
        return false;
      }

      const seg = (exp.segmentation as any) || {};

      // 3. Filter by User Role
      if (seg.roles && seg.roles.length > 0) {
        const mappedRole = user.role === "SUPERADMIN" ? "ALL" : user.role === "TRAINER" ? "PERSONAL" : "STUDENT";
        if (!seg.roles.includes(mappedRole) && !seg.roles.includes("ALL")) {
          return false;
        }
      }

      // 4. Filter by Physical Objective
      if (seg.objective && seg.objective !== "all") {
        if (!user.objective || user.objective.toLowerCase() !== seg.objective.toLowerCase()) {
          return false;
        }
      }

      // 5. Filter by Subscribed Plans
      if (seg.plans && seg.plans.length > 0) {
        const hasPlan = planNames.some(p => seg.plans.includes(p));
        if (!hasPlan) return false;
      }

      return true;
    });

    const mapped = filtered.map((exp: any) => {
      if (isTrialActive) return exp;
      return {
        ...exp,
        blocks: exp.blocks ? exp.blocks.filter((b: any) => b.type !== "COUPON") : []
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    await logSystemError({ action: "GET_ACTIVE_ENGAGE", error, entity: "ENGAGE_EXPERIENCE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
