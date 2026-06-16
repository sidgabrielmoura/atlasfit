import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      include: {
        members: {
          where: { role: "OWNER" },
          include: {
            user: {
              include: {
                subscription: {
                  include: {
                    plan: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedWorkspaces = workspaces.map((ws) => {
      const ownerMember = ws.members[0];
      const owner = ownerMember?.user;
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        ownerId: ws.ownerId,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
        _count: ws._count,
        ownerName: owner?.name || "Sem Dono",
        ownerEmail: owner?.email || "Sem Email",
        subscription: owner?.subscription || null,
      };
    });

    return NextResponse.json(formattedWorkspaces);
  } catch (error) {
    await logSystemError({ action: "GET_WORKSPACES", error, entity: "WORKSPACE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, slug, ownerId } = body;

    if (!name || !slug || !ownerId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingSlug = await prisma.workspace.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (existingSlug) {
      return new NextResponse("Slug already in use", { status: 400 });
    }

    const newWorkspace = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug: slug.toLowerCase(),
          ownerId,
        }
      });

      await tx.workspaceMember.create({
        data: {
          userId: ownerId,
          workspaceId: workspace.id,
          role: "OWNER",
        }
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "WORKSPACE_UPDATE",
          entity: "WORKSPACE",
          entityId: workspace.id,
          severity: "success"
        }
      });

      return workspace;
    });

    return NextResponse.json(newWorkspace, { status: 201 });
  } catch (error) {
    await logSystemError({ action: "POST_WORKSPACE_CREATE", error, entity: "WORKSPACE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
