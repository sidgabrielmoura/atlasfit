import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["health.read.assigned", "students.read", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.read.assigned");

    const progressHistory = await prisma.studentProgress.findMany({
      where: {
        studentId: member.userId,
        workspaceId: context.workspaceId,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(progressHistory);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym student progress error:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      workspaceId,
      date,
      weight,
      height,
      bodyFat,
      muscleMass,
      chest,
      waist,
      abdomen,
      hips,
      rightArm,
      leftArm,
      rightForearm,
      leftForearm,
      rightThigh,
      leftThigh,
      rightCalf,
      leftCalf,
      notes,
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["health.manage.assigned", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.manage.assigned");

    const toFloatOrNull = (val: any) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = parseFloat(String(val).replace(",", "."));
      return isNaN(num) ? null : num;
    };

    const newProgress = await serializableTransaction(async (tx) => {
      const record = await tx.studentProgress.create({
        data: {
          studentId: member.userId,
          workspaceId: context.workspaceId,
          date: date ? new Date(date) : new Date(),
          weight: toFloatOrNull(weight),
          height: toFloatOrNull(height),
          bodyFat: toFloatOrNull(bodyFat),
          muscleMass: toFloatOrNull(muscleMass),
          chest: toFloatOrNull(chest),
          waist: toFloatOrNull(waist),
          abdomen: toFloatOrNull(abdomen),
          hips: toFloatOrNull(hips),
          rightArm: toFloatOrNull(rightArm),
          leftArm: toFloatOrNull(leftArm),
          rightForearm: toFloatOrNull(rightForearm),
          leftForearm: toFloatOrNull(leftForearm),
          rightThigh: toFloatOrNull(rightThigh),
          leftThigh: toFloatOrNull(leftThigh),
          rightCalf: toFloatOrNull(rightCalf),
          leftCalf: toFloatOrNull(leftCalf),
          notes: notes?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_PROGRESS_RECORDED",
          entity: "STUDENT_PROGRESS",
          entityId: record.id,
          severity: "info",
        },
      });

      return record;
    });

    return NextResponse.json(newProgress, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("POST gym student progress error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao registrar medidas." }, { status: 500 });
  }
});
