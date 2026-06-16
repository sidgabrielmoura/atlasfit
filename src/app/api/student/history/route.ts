import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { calculateStreaks, verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";

function getYearAndMonthInSP(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")!.value);
  const month = parseInt(parts.find(p => p.type === "month")!.value) - 1;
  return { year, month };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Get active student workspace member
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

    // 2. Fetch completed workouts history (WorkoutLog)
    const logs = await prisma.workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            muscleGroupLabel: true,
            duration: true,
            goal: true,
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // 3. Compute stats using Brazil timezone
    const now = new Date();
    const { year: currentYear, month: currentMonth } = getYearAndMonthInSP(now);

    // Filter logs for stats
    const logsThisYear = logs.filter((log) => {
      const { year: logYear } = getYearAndMonthInSP(new Date(log.completedAt));
      return logYear === currentYear;
    });

    const logsThisMonth = logs.filter((log) => {
      const { year: logYear, month: logMonth } = getYearAndMonthInSP(new Date(log.completedAt));
      return logYear === currentYear && logMonth === currentMonth;
    });

    const totalWorkoutsYear = logsThisYear.length;
    const totalWorkoutsMonth = logsThisMonth.length;

    // Estimate total hours trained in the current month
    let totalMinutesMonth = 0;
    logsThisMonth.forEach((log) => {
      const durationStr = log.workout?.duration || "60 min";
      const durationVal = parseInt(durationStr) || 60;
      totalMinutesMonth += durationVal;
    });
    const totalHoursMonth = Math.round((totalMinutesMonth / 60) * 10) / 10;

    // Calculate total weight volume (tonelagem) inside this month
    let totalVolumeMonth = 0;
    logsThisMonth.forEach((log) => {
      const loads = log.loads as Record<string, string[]> | null;
      const reps = log.reps as Record<string, string[]> | null;
      if (loads && reps) {
        Object.keys(loads).forEach((weId) => {
          const weLoads = loads[weId];
          const weReps = reps[weId];
          if (Array.isArray(weLoads) && Array.isArray(weReps)) {
            weLoads.forEach((loadStr, setIdx) => {
              const load = parseFloat(loadStr) || 0;
              const rep = parseInt(weReps[setIdx]) || 0;
              totalVolumeMonth += load * rep;
            });
          }
        });
      }
    });

    // Calculate monthly target based on weekly workouts count
    const weeklyWorkoutsCount = await prisma.workout.count({
      where: {
        workspaceId,
        dayOfWeek: { not: null },
        OR: [
          { studentId: session.user.id },
          { studentId: null },
        ],
      },
    });
    const monthlyTarget = (weeklyWorkoutsCount || 4) * 4;

    console.log("Computed stats:", {
      totalWorkoutsYear,
      totalWorkoutsMonth,
      monthlyTarget,
      totalHoursMonth,
      totalVolumeMonth,
    });

    const { streak: activeStreak, bestStreak: activeBestStreak } = await verifyAndDecayWorkspaceMemberStreak(
      member,
      logs.map((l: any) => l.completedAt)
    );

    return NextResponse.json({
      logs,
      stats: {
        totalWorkoutsYear,
        totalWorkoutsMonth,
        monthlyTarget,
        totalHoursMonth,
        totalVolumeMonth,
        streak: activeStreak,
        bestStreak: activeBestStreak,
        progress: member.progress || 0,
      },
    });
  } catch (error) {
    console.error("GET student history error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("id");

    if (!logId) {
      return new NextResponse("ID do log é obrigatório.", { status: 400 });
    }

    // 1. Fetch active workspace member
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

    // 2. Validate log existence and ownership
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      return new NextResponse("Registro de treino não encontrado.", { status: 404 });
    }

    if (existingLog.studentId !== session.user.id) {
      return new NextResponse("Não autorizado a excluir este registro.", { status: 403 });
    }

    // 3. Delete log entry
    await prisma.workoutLog.delete({
      where: { id: logId },
    });

    // 4. Recalculate streak and progress dynamically from remaining history
    const allLogs = await prisma.workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      select: {
        completedAt: true,
      },
    });

    const { streak: newStreak, bestStreak: newBestStreak } = calculateStreaks(
      allLogs.map((l: any) => l.completedAt)
    );

    // Recalculate weekly compliance
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyCompletionsCount = await prisma.workoutLog.count({
      where: {
        studentId: session.user.id,
        workspaceId,
        completedAt: {
          gte: startOfWeek,
        },
      },
    });

    const weeklyWorkoutsCount = await prisma.workout.count({
      where: {
        workspaceId,
        dayOfWeek: { not: null },
        OR: [
          { studentId: session.user.id },
          { studentId: null },
        ],
      },
    });
    const targetFrequency = weeklyWorkoutsCount || 4;
    const newProgress = Math.min(100, Math.round((weeklyCompletionsCount / targetFrequency) * 100));

    // Update active member statistics
    await prisma.workspaceMember.update({
      where: { id: member.id },
      data: {
        streak: newStreak,
        bestStreak: newBestStreak,
        progress: newProgress,
      },
    });

    return NextResponse.json({
      success: true,
      streak: newStreak,
      bestStreak: newBestStreak,
      progress: newProgress,
    });
  } catch (error) {
    console.error("DELETE student history error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
