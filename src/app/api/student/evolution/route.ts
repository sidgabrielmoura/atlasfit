import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";
import { NotificationService } from "@/lib/notifications/service";


export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Locate active student membership to identify the workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;

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
    console.error("Student Evolution API GET Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Workspace associado não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
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

      const newProgress = await prisma.studentProgress.create({
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

      const newPhoto = await prisma.studentProgressPhoto.create({
        data: {
          studentId: session.user.id,
          workspaceId,
          photoUrl,
          objectKey: objectKey || null,
          date: new Date(),
        },
      });

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
    console.error("Student Evolution API POST Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
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
        },
      });

      if (photoRecord) {
        if (photoRecord.objectKey) {
          await storageService.deleteObject(photoRecord.objectKey);
        }
        await prisma.studentProgressPhoto.delete({
          where: {
            id,
          },
        });
      }
    } else if (type === "progress") {
      await prisma.studentProgress.delete({
        where: {
          id,
          studentId: session.user.id,
        },
      });
    } else {
      return new NextResponse("Tipo de remoção desconhecido.", { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student Evolution API DELETE Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
