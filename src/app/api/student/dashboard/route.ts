import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";
import { processRecurringPaymentsForMember } from "@/lib/recurrence";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Find active student membership
    let member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        workspace: true,
        user: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro do workspace não encontrado.", { status: 404 });
    }

    // Process recurring payments for this member to sync invoices and planEndDate
    await processRecurringPaymentsForMember(member.id);

    // Re-fetch member to have the latest planEndDate after recurrence processing
    const updatedMember = await prisma.workspaceMember.findUnique({
      where: { id: member.id },
      include: {
        workspace: true,
        user: true,
      }
    });
    if (updatedMember) {
      member = updatedMember;
    }

    // Fetch trainer (workspace owner) details for contact info
    const trainer = await prisma.user.findUnique({
      where: { id: member.workspace.ownerId },
      select: {
        name: true,
        whatsapp: true,
      }
    });

    const workspaceId = member.workspaceId;
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // 2. Fetch workouts for the week assigned to the student in this workspace
    const workouts = await prisma.workout.findMany({
      where: {
        workspaceId,
        OR: [
          { studentId: session.user.id },
          { studentId: null } // general templates in this workspace
        ]
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          }
        }
      },
      orderBy: { dayOfWeek: "asc" }
    });

    // 3. Fetch progress history for evolution (weight, BF%)
    const progressHistory = await prisma.studentProgress.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "asc" },
    });

    // 4. Fetch physical evaluations
    const physicalEvaluations = await prisma.physicalEvaluation.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
    });

    // 4.5. Fetch completed workouts history (WorkoutLog) for PR calculations
    const workoutLogs = await prisma.workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "asc",
      },
    });

    // 5. Fetch adjustment requests / chat messages
    const adjustmentRequests = await prisma.exerciseAdjustmentRequest.findMany({
      where: {
        requesterId: session.user.id,
      },
      include: {
        exercise: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // 6. Fetch progress photos to extract trainer tips / likes
    const progressPhotos = await prisma.studentProgressPhoto.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    // 6.5. Fetch daily feedbacks for the chat list
    const dailyFeedbacks = await prisma.dailyFeedback.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    // 7. Check if there are pending or overdue payments
    const studentName = member.user.name || session.user.name || "Aluno";
    const studentPayments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId,
        studentName,
      },
      orderBy: { createdAt: "desc" },
    });

    const hasOverdue = studentPayments.some((p) => p.status === "atrasado");
    const hasPending = studentPayments.some((p) => p.status === "pendente");
    
    let paymentStatus = "Em dia";
    if (hasOverdue) {
      paymentStatus = "Atrasado";
    } else if (hasPending) {
      paymentStatus = "Pendente";
    }

    const pendingPaymentAmount = studentPayments
      .filter((p) => p.status === "pendente" || p.status === "atrasado")
      .reduce((sum, p) => sum + p.amount, 0);

    // 8. Calculations and formatting
    const { streak, bestStreak: calculatedBestStreak } = await verifyAndDecayWorkspaceMemberStreak(
      member,
      workoutLogs.map((log) => log.completedAt)
    );
    const adherence = member.progress || 0; // standard progress value acts as adherence

    // Determine current/next workout and today's workouts
    const todayWorkouts = workouts.filter(w => w.dayOfWeek === currentDayOfWeek);
    const todayWorkout = todayWorkouts[0] || null;
    const nextWorkout = todayWorkout || workouts.find(w => w.dayOfWeek !== null && w.dayOfWeek > currentDayOfWeek) || workouts[0] || null;
    const completedWorkoutIdsToday = workoutLogs
      .filter(log => log.completedAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) && log.completedAt <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999))
      .map(log => log.workoutId);

    // Weight and body fat evolution chart data
    const weightHistory = progressHistory.map((ph) => ({
      date: ph.date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
      value: ph.weight || 0.0,
      bf: ph.bodyFat || 0.0,
    }));

    const latestProgress = progressHistory[progressHistory.length - 1];
    const latestEval = physicalEvaluations[0];

    const currentWeight = latestProgress?.weight || latestEval?.weight || null;
    const currentBF = latestProgress?.bodyFat || latestEval?.bodyFat || null;

    // Calculate weight change from first logged progress
    let evolutionPercent = 0;
    if (progressHistory.length > 1) {
      const firstWeight = progressHistory[0].weight;
      const lastWeight = currentWeight;
      if (firstWeight && lastWeight) {
        evolutionPercent = parseFloat((((firstWeight - lastWeight) / firstWeight) * 100).toFixed(1));
      }
    }

    // Build Trainer Alerts
    const alerts = [];
    if (progressPhotos.some(p => p.comment)) {
      const photoWithComment = progressPhotos.find(p => p.comment);
      if (photoWithComment?.comment) {
        alerts.push({
          id: `tip-${photoWithComment.id}`,
          text: `Dica do Personal: "${photoWithComment.comment}"`,
          type: "tip",
        });
      }
    }
    if (alerts.length === 0) {
      alerts.push({
        id: "alert-default",
        text: "Mantenha a hidratação alta hoje. Seu treino exige bastante energia metabólica!",
        type: "tip",
      });
    }

    // Pending Tasks
    const pendingTasks = [];
    
    // Check if progress photo uploaded in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const hasRecentPhoto = progressPhotos.some(p => p.date >= sevenDaysAgo);
    if (!hasRecentPhoto) {
      pendingTasks.push({
        id: "task-photo",
        title: "Enviar foto de progresso",
        description: "Seu treinador precisa ver sua evolução visual.",
        icon: "Camera",
      });
    }

    // Check if weight logged in the last 7 days
    const hasRecentProgress = progressHistory.some(p => p.date >= sevenDaysAgo);
    if (!hasRecentProgress) {
      pendingTasks.push({
        id: "task-weight",
        title: "Registrar peso da semana",
        description: "Mantenha sua pesagem semanal sempre em dia.",
        icon: "Scale",
      });
    }

    // Check if daily feedback submitted today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const dailyFeedbackToday = await prisma.dailyFeedback.findFirst({
      where: {
        studentId: session.user.id,
        workspaceId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (!dailyFeedbackToday) {
      pendingTasks.push({
        id: "task-feedback",
        title: "Reportar como me sinto hoje",
        description: "Deixe seu feedback de disposição, fadiga e humor.",
        icon: "Smile",
      });
    }

    // Today's workouts checkin tasks
    for (const w of todayWorkouts) {
      const isCompletedToday = completedWorkoutIdsToday.includes(w.id);
      if (!isCompletedToday) {
        pendingTasks.push({
          id: `task-workout-${w.id}`,
          title: `Realizar ${w.name}`,
          description: `${w.muscleGroupLabel || "Foco do dia"} • Estimado: ${w.duration}`,
          icon: "Dumbbell",
          workoutId: w.id,
        });
      }
    }

    // Dynamic PRs (Recordes Pessoais) from WorkoutLog load history
    interface PRRecord {
      maxLoad: number;
      date: Date;
      previousBest: number | null;
    }
    const prMap = new Map<string, PRRecord>();

    for (const log of workoutLogs) {
      if (!log.loads || typeof log.loads !== "object") continue;
      const loadsRecord = log.loads as Record<string, string[]>;

      const exerciseMap = new Map<string, string>();
      log.workout?.exercises?.forEach((we) => {
        if (we.exercise?.name) {
          exerciseMap.set(we.id, we.exercise.name);
        }
      });

      Object.entries(loadsRecord).forEach(([weId, setLoads]) => {
        const exerciseName = exerciseMap.get(weId);
        if (!exerciseName || !Array.isArray(setLoads)) return;

        let maxLoadInLog = 0;
        setLoads.forEach((loadStr) => {
          if (!loadStr) return;
          const numericLoad = parseFloat(String(loadStr).replace(/[^0-9.]/g, "")) || 0;
          if (numericLoad > maxLoadInLog) {
            maxLoadInLog = numericLoad;
          }
        });

        if (maxLoadInLog > 0) {
          const existing = prMap.get(exerciseName);
          if (!existing) {
            prMap.set(exerciseName, {
              maxLoad: maxLoadInLog,
              date: log.completedAt,
              previousBest: null,
            });
          } else if (maxLoadInLog > existing.maxLoad) {
            prMap.set(exerciseName, {
              maxLoad: maxLoadInLog,
              date: log.completedAt,
              previousBest: existing.maxLoad,
            });
          }
        }
      });
    }

    const prs = Array.from(prMap.entries())
      .map(([exerciseName, record]) => ({
        id: `pr-${exerciseName.toLowerCase().replace(/\s+/g, "-")}`,
        exercise: `${exerciseName} (Carga Máxima)`,
        value: `${record.maxLoad} kg`,
        date: record.date.toLocaleDateString("pt-BR"),
        previousBest: record.previousBest ? `${record.previousBest} kg` : "--",
        rawLoad: record.maxLoad,
        rawDate: record.date.getTime(),
      }))
      .sort((a, b) => b.rawDate - a.rawDate)
      .slice(0, 3);

    // Dynamic Messages (including both exercise adjustments and daily feeling feedbacks)
    const recentMessages = [];
    
    // Add adjustment request messages
    for (const req of adjustmentRequests) {
      if (req.messages.length > 0) {
        const msg = req.messages[0];
        recentMessages.push({
          id: msg.id,
          sender: msg.senderId === session.user.id ? "Você" : "Treinador",
          text: msg.message,
          exercise: req.exercise.name,
          date: msg.createdAt.toLocaleDateString("pt-BR"),
          rawDate: msg.createdAt,
        });
      }
    }

    // Add daily feedbacks to the message stream
    for (const df of dailyFeedbacks) {
      recentMessages.push({
        id: df.id,
        sender: "Você",
        text: `Reporte de bem-estar registrado. Disposição: ${df.energy}%, Fadiga: ${df.fatigue}%, Humor: ${df.humor}%.`,
        exercise: "Sentimento Diário",
        date: df.date.toLocaleDateString("pt-BR"),
        rawDate: df.date,
      });
    }

    // Sort all messages by date descending
    recentMessages.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    // Finance status variables are already computed in step 7

    // Days frequency in the current week (from Monday to Sunday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyFrequency = workoutLogs.filter(log => log.completedAt >= startOfWeek).length;

    const payload = {
      workspace: {
        name: member.workspace.name,
        logoUrl: member.workspace.logoUrl,
        primaryColor: member.workspace.primaryColor,
        slogan: member.workspace.slogan,
      },
      studentName: session.user.name || "Aluno",
      streak,
      bestStreak: calculatedBestStreak || 0,
      adherence,
      weeklyFrequency,
      currentWeight,
      currentBF,
      evolutionPercent,
      nextWorkout: nextWorkout ? {
        id: nextWorkout.id,
        name: nextWorkout.name,
        muscleGroupLabel: nextWorkout.muscleGroupLabel || "Geral",
        duration: nextWorkout.duration,
        exercisesCount: nextWorkout.exercises.length,
      } : null,
      todayWorkouts: todayWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        muscleGroupLabel: w.muscleGroupLabel || "Geral",
        duration: w.duration,
        exercisesCount: w.exercises.length,
        isActive: w.isActive,
        isCompletedToday: completedWorkoutIdsToday.includes(w.id),
      })),
      weightHistory,
      prs,
      alerts,
      pendingTasks,
      recentMessages: recentMessages.slice(0, 3),
      finance: {
        status: paymentStatus,
        pendingAmount: pendingPaymentAmount,
      },
      planEndDate: member.planEndDate ? member.planEndDate.toISOString() : null,
      trainerWhatsApp: trainer?.whatsapp || null,
      trainerName: trainer?.name || "Personal Trainer",
      workoutsOfTheWeek: workouts.map(w => ({
        id: w.id,
        name: w.name,
        dayOfWeek: w.dayOfWeek,
        muscleGroupLabel: w.muscleGroupLabel,
        isCompletedToday: completedWorkoutIdsToday.includes(w.id),
      }))
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Student Dashboard API Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
