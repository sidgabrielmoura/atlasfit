import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationType, NotificationCategory, NotificationPriority } from "@/lib/notifications/types";

export const GET = withAuditedRequest(async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      include: {
        subscription: {
          include: { plan: true },
        },
        units: {
          where: { isActive: true },
          select: { id: true },
        },
        members: {
          where: { role: "OWNER" },
          include: {
            user: {
              include: {
                subscription: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedWorkspaces = workspaces.map((ws) => {
      const ownerMember = ws.members[0];
      const owner = ownerMember?.user;
      const effectiveSubscription =
        ws.type === "GYM" ? ws.subscription : owner?.subscription || null;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        type: ws.type,
        ownerId: ws.ownerId,
        isActive: ws.isActive,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
        unitsCount: ws.units.length,
        _count: ws._count,
        ownerName: owner?.name || "Sem Dono",
        ownerEmail: owner?.email || "Sem Email",
        subscription: effectiveSubscription,
      };
    });

    return NextResponse.json(formattedWorkspaces);
  } catch (error) {
    await logSystemError({ action: "GET_WORKSPACES", error, entity: "WORKSPACE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, slug, ownerId, type, maxStudents, maxStaff, maxUnits } = body;

    if (!name || !slug || !ownerId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const { SuperAdminGymService } = await import("@/modules/workspaces");

    const newWorkspace = await SuperAdminGymService.provisionWorkspace(
      {
        name,
        slug,
        ownerId,
        type: type || "PERSONAL",
        maxStudents,
        maxStaff,
        maxUnits,
      },
      session.user.id
    );

    try {
      await NotificationService.sendToSuperAdmins({
        type: NotificationType.SYSTEM,
        category: NotificationCategory.SYSTEM,
        title: `Novo Workspace Criado (${newWorkspace.type}) 🏢`,
        description: `O workspace "${newWorkspace.name}" (${newWorkspace.slug}) foi provisionado com sucesso.`,
        priority: NotificationPriority.NORMAL,
        deepLink: "/superadmin/workspaces",
      });
    } catch (notifErr) {
      console.error("Erro ao notificar superadmins sobre novo workspace:", notifErr);
    }

    return NextResponse.json(newWorkspace, { status: 201 });
  } catch (error: any) {
    await logSystemError({ action: "POST_WORKSPACE_CREATE", error, entity: "WORKSPACE" });
    return NextResponse.json(
      { error: error?.message || "Internal Error" },
      { status: 400 }
    );
  }
});
