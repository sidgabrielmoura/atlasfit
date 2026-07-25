import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const { id } = await params;

    // Find the deletion request either by its primary id or by target userId
    const deletionRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        OR: [
          { id },
          { userId: id }
        ]
      },
      include: {
        user: true
      }
    });

    const targetUserId = deletionRequest ? deletionRequest.userId : id;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        }
      }
    });

    if (!targetUser) {
      return new NextResponse("Usuário não encontrado.", { status: 404 });
    }

    // 1. Find all workspaces owned by this trainer
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: targetUserId },
      select: { id: true }
    });
    const ownedWorkspaceIds = ownedWorkspaces.map(w => w.id);

    // 2. Find students belonging to these workspaces
    if (ownedWorkspaceIds.length > 0) {
      const studentMemberships = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: { in: ownedWorkspaceIds },
          role: "STUDENT"
        },
        select: { userId: true }
      });

      const candidateStudentUserIds = Array.from(new Set(studentMemberships.map(m => m.userId)));

      // Delete students who are exclusively in this trainer's workspaces
      for (const studentId of candidateStudentUserIds) {
        const otherMemberships = await prisma.workspaceMember.count({
          where: {
            userId: studentId,
            workspaceId: { notIn: ownedWorkspaceIds }
          }
        });

        if (otherMemberships === 0) {
          try {
            await prisma.user.delete({
              where: { id: studentId }
            });
          } catch (e) {
            console.error(`Erro ao apagar conta do aluno ${studentId}:`, e);
          }
        }
      }

      // 3. Delete all owned workspaces (cascade-deletes plans, payments, tasks, workouts, leads, etc.)
      await prisma.workspace.deleteMany({
        where: { ownerId: targetUserId }
      });
    }

    // 4. Delete data deletion request if exists
    await prisma.dataDeletionRequest.deleteMany({
      where: { userId: targetUserId }
    });

    // 5. Delete the personal trainer user account
    await prisma.user.delete({
      where: { id: targetUserId }
    });

    // 6. Register superadmin audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SUPERADMIN_DATA_WIPE",
        entity: "USER",
        entityId: targetUserId,
        severity: "critical",
      }
    });

    return NextResponse.json({
      success: true,
      deletedUserId: targetUserId
    });
  } catch (error) {
    console.error("[DELETION_REQUEST_DELETE_ERROR]", error);
    return new NextResponse("Erro ao realizar exclusão em cascata dos dados.", { status: 500 });
  }
}
