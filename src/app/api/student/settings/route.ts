import { withRequestMemo } from "@/lib/request-memo";
import { z } from "zod";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { readGymHealthProfile, saveGymHealthProfile } from "@/modules/workspaces/application/gym-health-profile";
import { recordGymProgress } from "@/modules/workspaces/application/gym-progress-commands";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { changeOwnPassword } from "@/lib/auth/password-change-service";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";

async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Fetch user profile fields
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        whatsapp: true,
        city: true,
        bio: true, // stores objectives/biography
        objective: true,
        gender: true,
        birthDate: true,
        experienceLevel: true,
        medicalConditions: true,
        weight: true,
        height: true,
        cpfCnpj: true,
      },
    });

    if (!user) {
      return new NextResponse("Usuário não encontrado.", { status: 404 });
    }

    // 2. Fetch active workspace member details to identify active workspace
    const member = await getStudentWorkspaceMember(session.user.id);

    if (!member) return NextResponse.json({ error: "Selecione um vínculo de aluno ativo." }, { status: 404 });
    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") {
      const local = await readGymHealthProfile(workspaceId, member.id, session.user.id);
      const intake = local.intake && typeof local.intake === "object" && !Array.isArray(local.intake) ? local.intake : {};
      return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, image: user.image, whatsapp: user.whatsapp, city: user.city, gender: user.gender, birthDate: user.birthDate, cpfCnpj: user.cpfCnpj, ...intake, weight: local.physicalData.weight, height: local.physicalData.height }, physicalData: local.physicalData, workspaceId, streak: member.streak, bestStreak: member.bestStreak, progress: member.progress }, { headers: { "Cache-Control": "no-store" } });
    }

    // 3. Fetch latest physical progress metrics
    let physicalData = {
      weight: user.weight,
      height: user.height,
      bodyFat: null as number | null,
      muscleMass: null as number | null,
    };

    if (workspaceId) {
      const latestProgress = await prisma.studentProgress.findFirst({
        where: {
          studentId: session.user.id,
          workspaceId,
          date: {
            lte: new Date(),
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      if (latestProgress) {
        physicalData.bodyFat = latestProgress.bodyFat;
        physicalData.muscleMass = latestProgress.muscleMass;
        // Fallback to latestProgress if User doesn't have weight/height registered yet
        if (physicalData.weight === null || physicalData.weight === undefined) {
          physicalData.weight = latestProgress.weight;
        }
        if (physicalData.height === null || physicalData.height === undefined) {
          physicalData.height = latestProgress.height;
        }
      }
    }

    return NextResponse.json({
      user,
      physicalData,
      workspaceId,
      streak: member?.streak || 0,
      bestStreak: member?.bestStreak || 0,
      progress: member?.progress || 0,
    });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("GET student settings error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const body: any = await readJsonRequest(req, 65536);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new JsonRequestError(400, "Objeto JSON obrigatório.");
    const selected = await getStudentWorkspaceMember(session.user.id);
    if (!selected) return NextResponse.json({ error: "Selecione um vínculo de aluno ativo." }, { status: 404 });
    if (selected.workspace.type === "GYM" && body.action === "updatePhysical") {
      const progress = await recordGymProgress(selected.workspaceId, selected.id, session.user.id, { action: "logProgress", weight: body.weight, height: body.height, bodyFat: body.bodyFat, muscleMass: body.muscleMass });
      return NextResponse.json({ success: true, progress });
    }
    if (selected.workspace.type === "GYM" && body.action === "updateProfile") {
      const allowed = z.object({ action: z.literal("updateProfile"), name: z.string().trim().min(2).max(150).optional(), whatsapp: z.string().max(30).nullable().optional(), city: z.string().max(150).nullable().optional(), bio: z.string().max(2000).nullable().optional(), objective: z.string().max(2000).nullable().optional(), image: z.string().max(2048).nullable().optional(), imageKey: z.string().max(1024).nullable().optional(), cpfCnpj: z.string().max(18).optional() }).strict().safeParse(body);
      if (!allowed.success) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
      const identity = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { cpfCnpj: true, image: true, imageKey: true } });
      if ((allowed.data.cpfCnpj && allowed.data.cpfCnpj.replace(/\D/g, "") !== identity.cpfCnpj?.replace(/\D/g, "")) || (allowed.data.imageKey && allowed.data.imageKey !== identity.imageKey) || (allowed.data.image && allowed.data.image !== identity.image)) return NextResponse.json({ error: "Documento e foto da identidade devem ser alterados no fluxo verificado da conta." }, { status: 409 });
      await saveGymHealthProfile(selected.workspaceId, selected.id, session.user.id, { objective: allowed.data.objective, bio: allowed.data.bio });
      const user = await prisma.user.update({ where: { id: session.user.id }, data: { name: allowed.data.name, whatsapp: allowed.data.whatsapp, city: allowed.data.city }, select: { id: true, name: true, email: true, whatsapp: true, city: true } });
      return NextResponse.json({ success: true, user });
    }
    const {
      action,
      // Personal data
      name,
      whatsapp,
      city,
      bio,
      objective,
      image,
      // Physical data
      weight,
      height,
      bodyFat,
      muscleMass,
    } = body;

    // 1. Action: update personal details
    if (action === "updateProfile") {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: name ?? undefined,
          whatsapp: whatsapp ?? null,
          city: city ?? null,
          bio: bio ?? null,
          objective: objective ?? null,
          cpfCnpj: body.cpfCnpj ? body.cpfCnpj.replace(/\D/g, "") : undefined,
          image: image ?? undefined,
          imageKey: body.imageKey ?? undefined,
        },
        select: { id: true, name: true, email: true, whatsapp: true, city: true, bio: true, objective: true, image: true },
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }

    // 2. Action: change password
    if (action === "changePassword") {
      return NextResponse.json(await changeOwnPassword(session.user, body));
    }

    // 3. Action: save physical metrics
    if (action === "updatePhysical") {
      const parsedWeight = weight ? parseFloat(weight) : null;
      const parsedHeight = height ? parseFloat(height) : null;
      const parsedBF = bodyFat ? parseFloat(bodyFat) : null;
      const parsedMuscle = muscleMass ? parseFloat(muscleMass) : null;

      if (parsedWeight === null) {
        return new NextResponse("O peso corporal é obrigatório para registrar os dados físicos.", { status: 400 });
      }

      // 3.1. Save weight and height directly on the User model (global settings)
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          weight: parsedWeight,
          height: parsedHeight,
        },
      });

      // 3.2. Save to StudentProgress for active workspace if member exists
      const member = await getStudentWorkspaceMember(session.user.id);

      let progressRecord = null;
      if (member) {
        // Check if a progress entry was already registered today to avoid duplicate layout clutter
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const existingToday = await prisma.studentProgress.findFirst({
          where: {
            studentId: session.user.id,
            workspaceId: member.workspaceId,
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        if (existingToday) {
          // Update today's existing record
          progressRecord = await prisma.studentProgress.update({
            where: { id: existingToday.id },
            data: {
              weight: parsedWeight,
              height: parsedHeight,
              bodyFat: parsedBF,
              muscleMass: parsedMuscle,
            },
          });
        } else {
          // Create new progress record
          progressRecord = await prisma.studentProgress.create({
            data: {
              studentId: session.user.id,
              workspaceId: member.workspaceId,
              weight: parsedWeight,
              height: parsedHeight,
              bodyFat: parsedBF,
              muscleMass: parsedMuscle,
              date: new Date(),
            },
          });
        }
      }

      return NextResponse.json({ success: true, progress: progressRecord });
    }

    return new NextResponse("Ação inválida.", { status: 400 });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    if (error instanceof JsonRequestError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("PATCH student settings error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
