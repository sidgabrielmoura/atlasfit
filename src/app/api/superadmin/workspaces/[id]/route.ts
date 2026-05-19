import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
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

    if (slug && slug !== existingWorkspace.slug) {
      const existingSlug = await prisma.workspace.findUnique({
        where: { slug }
      });

      if (existingSlug) {
        return new NextResponse("Slug already in use", { status: 400 });
      }
    }

    let updatedWorkspace;

    // Se houver alteração de dono
    if (ownerId && ownerId !== existingWorkspace.ownerId) {
      updatedWorkspace = await prisma.$transaction(async (tx) => {
        // Remove a role de OWNER do antigo (se houver e se ele estiver lá)
        const oldOwnerMember = existingWorkspace.members.find(m => m.userId === existingWorkspace.ownerId);
        if (oldOwnerMember) {
          await tx.workspaceMember.delete({
            where: { id: oldOwnerMember.id }
          });
        }

        // Adiciona a role de OWNER para o novo dono
        // Precisamos checar se o novo dono já é membro. Se sim, atualiza a role. Se não, cria.
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

        // Atualiza os dados do Workspace
        return await tx.workspace.update({
          where: { id },
          data: {
            name: name ?? existingWorkspace.name,
            slug: slug ?? existingWorkspace.slug,
            ownerId,
            isActive: isActive !== undefined ? isActive : existingWorkspace.isActive
          }
        });
      });
    } else {
      // Se não houver alteração de dono
      updatedWorkspace = await prisma.workspace.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          slug: slug !== undefined ? slug : undefined,
          isActive: isActive !== undefined ? isActive : undefined
        }
      });
    }

    return NextResponse.json(updatedWorkspace, { status: 200 });
  } catch (error) {
    console.error("UPDATE_WORKSPACE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
