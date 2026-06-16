import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function GET(req: Request) {
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
      },
    });

    if (!user) {
      return new NextResponse("Usuário não encontrado.", { status: 404 });
    }

    // 2. Fetch active workspace member details to identify active workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    const workspaceId = member?.workspaceId || null;

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
    console.error("GET student settings error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      action,
      // Personal data
      name,
      whatsapp,
      city,
      bio,
      objective,
      image,
      // Password change
      currentPassword,
      newPassword,
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
          image: image ?? undefined,
        },
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }

    // 2. Action: change password
    if (action === "changePassword") {
      if (!currentPassword || !newPassword) {
        return new NextResponse("A senha atual e a nova senha são obrigatórias.", { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!dbUser || !dbUser.password) {
        return new NextResponse("Acesso inválido ou usuário sem senha configurada.", { status: 400 });
      }

      const isPasswordValid = await bcryptjs.compare(currentPassword, dbUser.password);
      if (!isPasswordValid) {
        return new NextResponse("Senha atual incorreta.", { status: 400 });
      }

      const hashedPassword = await bcryptjs.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          password: hashedPassword,
        },
      });

      return NextResponse.json({ success: true, message: "Senha alterada com sucesso!" });
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
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          role: "STUDENT",
          isActive: true,
        },
      });

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
  } catch (error: any) {
    console.error("PATCH student settings error:", error);
    return new NextResponse(error.message || "Erro Interno do Servidor", { status: 500 });
  }
}
