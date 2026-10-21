import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { attachGymProgressPhoto } from "@/modules/workspaces/application/gym-progress-photo";
import { isGymWorkspace, deleteGymStoredObject } from "@/modules/workspaces/application/gym-storage";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";
import { NotificationService } from "@/lib/notifications/service";
import { recordGymProgress, removeGymEvolutionRecord } from "@/modules/workspaces/application/gym-progress-commands";


export const GET = withAuditedRequest(async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Locate active student membership to identify the workspace
    const member = await getStudentWorkspaceMember(session.user.id);

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
    const gym = await isGymWorkspace(workspaceId);
    if (gym) await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.read.assigned", { allowSelf: true });

    // 2. Fetch chronological student progress (weight & circumferences)
    const progress = await prisma.studentProgress.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "asc" },
    });

    // 3. Fetch physical evaluations recorded by the personal trainer
    const evaluations = await prisma.physicalEvaluation.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
    });

    // 4. Fetch progress photos uploaded chronologically
    const photos = await prisma.studentProgressPhoto.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      progress,
      evaluations,
      photos,
      workspace: {
        primaryColor: member.workspaceId, // to pass standard check
      }
    });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("Student Evolution API GET Error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const member = await getStudentWorkspaceMember(session.user.id);

    if (!member) {
      return new NextResponse("Workspace associado não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
    const gym = await isGymWorkspace(workspaceId);
    if (gym) await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.read.assigned", { allowSelf: true });
    const body = await req.json();
    const { action } = body;

    if (action === "logProgress") {
      const {
        weight, height, bodyFat, muscleMass,
        chest, waist, abdomen, hips,
        rightArm, leftArm, rightForearm, leftForearm,
        rightThigh, leftThigh, rightCalf, leftCalf,
        notes
      } = body;

      const newProgress = gym ? await recordGymProgress(workspaceId, member.id, session.user.id, body) : await prisma.studentProgress.create({
        data: {
          studentId: session.user.id,
          workspaceId,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          bodyFat: bodyFat ? parseFloat(bodyFat) : null,
          muscleMass: muscleMass ? parseFloat(muscleMass) : null,
          chest: chest ? parseFloat(chest) : null,
          waist: waist ? parseFloat(waist) : null,
          abdomen: abdomen ? parseFloat(abdomen) : null,
          hips: hips ? parseFloat(hips) : null,
          rightArm: rightArm ? parseFloat(rightArm) : null,
          leftArm: leftArm ? parseFloat(leftArm) : null,
          rightForearm: rightForearm ? parseFloat(rightForearm) : null,
          leftForearm: leftForearm ? parseFloat(leftForearm) : null,
          rightThigh: rightThigh ? parseFloat(rightThigh) : null,
          leftThigh: leftThigh ? parseFloat(leftThigh) : null,
          rightCalf: rightCalf ? parseFloat(rightCalf) : null,
          leftCalf: leftCalf ? parseFloat(leftCalf) : null,
          notes: notes || null,
          date: new Date(),
        },
      });

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true }
      });
      if (workspace?.ownerId) {
        await NotificationService.sendNotification({
          userId: workspace.ownerId,
          type: "ASSESSMENT_CREATED",
          category: "ASSESSMENT",
          title: "Novas Medidas de Progresso 📈",
          description: `O aluno "${session.user.name || "Aluno"}" registrou novas medidas corporais.`,
          deepLink: `/personal/clients/${session.user.id}/progress`,
          source: "ASSESSMENT",
          workspaceId
        });
      }

      return NextResponse.json({ success: true, progress: newProgress });
    }

    if (action === "uploadPhoto") {
      const { photoUrl, objectKey } = body;
      if (!photoUrl) {
        return new NextResponse("photoUrl é obrigatório para envio de foto.", { status: 400 });
      }

      const newPhoto = gym ? await attachGymProgressPhoto({ workspaceId, studentMemberId: member.id, actorUserId: session.user.id, photoUrl, objectKey }) : await prisma.studentProgressPhoto.create({ data: { studentId: session.user.id, workspaceId, photoUrl, objectKey: objectKey || null, date: new Date() } });

      // Marcar notificações de solicitação de foto pendentes como lidas
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          type: "PHOTO_REQUEST",
          isRead: false,
          workspaceId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true }
      });
      if (workspace?.ownerId) {
        await NotificationService.sendNotification({
          userId: workspace.ownerId,
          type: "ASSESSMENT_CREATED",
          category: "ASSESSMENT",
          title: "Novas Fotos de Progresso 📷",
          description: `O aluno "${session.user.name || "Aluno"}" enviou uma nova foto de progresso.`,
          deepLink: `/personal/clients/${session.user.id}/progress`,
          source: "ASSESSMENT",
          workspaceId
        });
      }

      return NextResponse.json({ success: true, photo: newPhoto });
    }

    return new NextResponse("Ação inválida ou não especificada.", { status: 400 });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("Student Evolution API POST Error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});

export const DELETE = withAuditedRequest(async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const member = await prisma.workspaceMember.findFirst({ where: { userId: session.user.id, role: "STUDENT", isActive: true } });
    if (!member) return new NextResponse("Vínculo estudantil indisponível.", { status: 403 });
    const workspaceId = member.workspaceId;
    const gym = await isGymWorkspace(workspaceId);
    if (gym) await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.manage.assigned", { allowSelf: true });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id || !type) {
      return new NextResponse("ID e tipo de registro são obrigatórios.", { status: 400 });
    }

    if (type === "photo") {
      const photoRecord = await prisma.studentProgressPhoto.findUnique({
        where: {
          id,
          studentId: session.user.id,
          workspaceId,
        },
      });

      if (photoRecord) {
        if (photoRecord.objectKey) {
          if (gym) await deleteGymStoredObject(photoRecord.objectKey, workspaceId, session.user.id, session.user.id);
          else await storageService.deleteObject(photoRecord.objectKey);
        }
        if (gym) await removeGymEvolutionRecord(workspaceId, member.id, session.user.id, "photo", id);
        else await prisma.studentProgressPhoto.delete({
          where: {
            id,
          },
        });
      }
    } else if (type === "progress") {
      if (gym) await removeGymEvolutionRecord(workspaceId, member.id, session.user.id, "progress", id);
      else await prisma.studentProgress.delete({
        where: {
          id,
          studentId: session.user.id,
          workspaceId,
        },
      });
    } else {
      return new NextResponse("Tipo de remoção desconhecido.", { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("Student Evolution API DELETE Error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});
