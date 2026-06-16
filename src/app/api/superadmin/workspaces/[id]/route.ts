import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    if (!id) {
      return new NextResponse("Missing workspace ID", { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        plans: true,
        workouts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            student: { select: { name: true } },
            creator: { select: { name: true } }
          }
        },
        payments: true
      }
    });

    if (!workspace) {
      return new NextResponse("Workspace not found", { status: 404 });
    }

    const owner = workspace.members.find(m => m.role === "OWNER")?.user || null;
    const studentsCount = workspace.members.filter(m => m.role === "STUDENT").length;
    const mrr = workspace.payments.reduce((acc, curr) => acc + curr.amount, 0) / 12; // estimativa se for anual, vamos assumir soma do ultimo mes idealmente. Como é demo, faremos a soma.
    const mrrReal = workspace.payments.reduce((acc, curr) => acc + curr.amount, 0);

    return NextResponse.json({
      ...workspace,
      owner,
      studentsCount,
      mrr: mrrReal
    }, { status: 200 });
  } catch (error) {
    await logSystemError({ action: "GET_WORKSPACE_BY_ID", error, entity: "WORKSPACE", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, slug, ownerId, isActive } = body;

    if (!id) {
      return new NextResponse("Missing workspace ID", { status: 400 });
    }

    const existingWorkspace = await prisma.workspace.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!existingWorkspace) {
      return new NextResponse("Workspace not found", { status: 404 });
    }

    if (slug && slug.toLowerCase() !== existingWorkspace.slug) {
      const existingSlug = await prisma.workspace.findUnique({
        where: { slug: slug.toLowerCase() }
      });

      if (existingSlug) {
        return new NextResponse("Slug already in use", { status: 400 });
      }
    }

    let updatedWorkspace;

    if (ownerId && ownerId !== existingWorkspace.ownerId) {
      updatedWorkspace = await prisma.$transaction(async (tx) => {
        const oldOwnerMember = existingWorkspace.members.find(m => m.userId === existingWorkspace.ownerId);
        if (oldOwnerMember) {
          await tx.workspaceMember.delete({
            where: { id: oldOwnerMember.id }
          });
        }

        const newOwnerMember = existingWorkspace.members.find(m => m.userId === ownerId);
        if (newOwnerMember) {
          await tx.workspaceMember.update({
            where: { id: newOwnerMember.id },
            data: { role: "OWNER" }
          });
        } else {
          await tx.workspaceMember.create({
            data: {
              userId: ownerId,
              workspaceId: id,
              role: "OWNER",
            }
          });
        }

        return await tx.workspace.update({
          where: { id },
          data: {
            name: name ?? existingWorkspace.name,
            slug: slug ? slug.toLowerCase() : existingWorkspace.slug,
            ownerId,
            isActive: isActive !== undefined ? isActive : existingWorkspace.isActive
          }
        });
      });
    } else {
      updatedWorkspace = await prisma.workspace.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          slug: slug !== undefined ? slug.toLowerCase() : undefined,
          isActive: isActive !== undefined ? isActive : undefined
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "WORKSPACE_UPDATE",
        entity: "WORKSPACE",
        entityId: id,
        severity: "success"
      }
    });

    return NextResponse.json(updatedWorkspace, { status: 200 });
  } catch (error) {
    await logSystemError({ action: "PATCH_WORKSPACE_BY_ID", error, entity: "WORKSPACE", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
