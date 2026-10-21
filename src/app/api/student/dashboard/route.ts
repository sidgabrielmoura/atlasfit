import { studentTrainingSummary, studentProgressSummary } from "@/lib/student-training-summary";
import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { studentWorkoutScope } from "@/lib/student-workout-scope";
import { getGymStudentFinance } from "@/modules/workspaces/application/gym-student-finance";

async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const selected = await getStudentWorkspaceMember(session.user.id);
    if (!selected) return new NextResponse("Selecione um vínculo estudantil ativo.", { status: 409 });
    const identity = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { name: true } });
    const member = { ...selected, user: identity };

    // Fetch trainer (workspace owner) details for contact info
    const trainer = await prisma.user.findUnique({
      where: { id: member.workspace.ownerId },
      select: {
        name: true,
        whatsapp: true,
      }
    });

    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.read.assigned", { allowSelf: true });
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const workouts = await prisma.workout.findMany({
      where: {
        ...studentWorkoutScope(workspaceId, member.workspace.type, session.user.id)
      },
      select: { id: true, name: true, dayOfWeek: true, muscleGroupLabel: true, duration: true, isActive: true, _count: { select: { exercises: true } } },
      orderBy: { dayOfWeek: "asc" }
    });

    // 3. Fetch progress history for evolution (weight, BF%)
    const progress = await studentProgressSummary(workspaceId, session.user.id);
    const progressHistory = progress.points;

    // 4. Fetch physical evaluations
    const physicalEvaluations = await prisma.physicalEvaluation.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      select: { weight: true, bodyFat: true },
      take: 1,
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    // 4.5. Fetch completed workouts history (WorkoutLog) for PR calculations
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + (now.getDay() === 0 ? -6 : 1 - now.getDay())); weekStart.setHours(0, 0, 0, 0);
    const workoutLogs = await prisma.workoutLog.findMany({ where: { studentId: session.user.id, workspaceId, completedAt: { gte: weekStart }, workout: { workspaceId } }, select: { workoutId: true, completedAt: true, workout: { select: { name: true, dayOfWeek: true } } }, orderBy: [{ completedAt: "asc" }, { id: "asc" }] });
    const training = await studentTrainingSummary(workspaceId, session.user.id);

    // 5. Fetch adjustment requests / chat messages
    const adjustmentRequests = await prisma.exerciseAdjustmentRequest.findMany({
      where: {
        requesterId: session.user.id,
        exercise: { workoutExercises: { some: { workout: studentWorkoutScope(workspaceId, member.workspace.type, session.user.id) } } },
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
    const manual = member.workspace.type === "GYM" ? await getGymStudentFinance(workspaceId, member.id, session.user.id) : null;
    const studentPayments = manual ? [] : await prisma.workspacePayment.findMany({
      where: {
        workspaceId,
        studentName,
        status: { in: ["pendente", "atrasado"] },
      },
      select: { status: true, amount: true },
    });

    const hasOverdue = manual ? BigInt(manual.totals.overdueInCents) > BigInt(0) : studentPayments.some((p) => p.status === "atrasado");
    const hasPending = manual ? BigInt(manual.totals.outstandingInCents) > BigInt(0) : studentPayments.some((p) => p.status === "pendente");
    
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
    const streak = training.streak;
    const calculatedBestStreak = Math.max(training.bestStreak, member.bestStreak || 0);
    if (member.streak !== streak || member.bestStreak !== calculatedBestStreak) await prisma.workspaceMember.update({ where: { id: member.id }, data: { streak, bestStreak: calculatedBestStreak } });
    const adherence = member.progress || 0; // standard progress value acts as adherence

    // Determine current/next workout and today's workouts
    const todayWorkouts = workouts.filter(w => w.dayOfWeek === currentDayOfWeek);
    const todayWorkout = todayWorkouts[0] || null;
    const nextWorkout = todayWorkout || workouts.find(w => w.dayOfWeek !== null && w.dayOfWeek > currentDayOfWeek) || workouts[0] || null;

    // Start and end of current week (Monday to Sunday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const completedWorkoutIdsThisWeek = workoutLogs
      .filter(log => log.completedAt >= startOfWeek && log.completedAt <= endOfWeek)
      .map(log => log.workoutId);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const logsCompletedToday = workoutLogs.filter(
      log => log.completedAt >= todayStart && log.completedAt <= todayEnd
    );
    const completedWorkoutIdsToday = logsCompletedToday.map(log => log.workoutId);

    // Detect if student completed a workout today that is different from today's scheduled workout
    const todayScheduledWorkoutIds = todayWorkouts.map(w => w.id);
    const outOfScheduleLogToday = logsCompletedToday.find(
      log => !todayScheduledWorkoutIds.includes(log.workoutId)
    );

    const differentWorkoutDoneToday = outOfScheduleLogToday ? {
      id: outOfScheduleLogToday.workoutId,
      name: outOfScheduleLogToday.workout?.name || "Treino Alternativo",
      dayOfWeek: outOfScheduleLogToday.workout?.dayOfWeek ?? null,
      completedAt: outOfScheduleLogToday.completedAt.toISOString(),
    } : null;

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
    if (progress.first && latestProgress && progress.first.id !== latestProgress.id) {
      const firstWeight = progress.first.weight;
      const lastWeight = currentWeight;
      if (firstWeight && lastWeight) {
        evolutionPercent = parseFloat((((firstWeight - lastWeight) / firstWeight) * 100).toFixed(1));
      }
    }

    // Buscar a notificação de solicitação de foto pendente mais recente
    const photoRequestNotification = await prisma.notification.findFirst({
      where: {
        userId: session.user.id,
        type: "PHOTO_REQUEST",
        isRead: false,
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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

    const prs = training.records.map(record => ({ id: `pr-${record.exerciseName.toLowerCase().replace(/\s+/g, "-")}`, exercise: `${record.exerciseName} (Carga Máxima)`, value: `${record.maxLoad} kg`, date: record.date.toLocaleDateString("pt-BR"), previousBest: record.previousBest ? `${record.previousBest} kg` : "--", rawLoad: record.maxLoad, rawDate: record.date.getTime() }));

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

    const weeklyFrequency = workoutLogs.filter(log => log.completedAt >= startOfWeek).length;

    const payload = {
      workspace: {
        id: workspaceId,
        type: member.workspace.type,
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
        exercisesCount: nextWorkout._count.exercises,
      } : null,
      canDoAnyWorkoutDay: member.canDoAnyWorkoutDay ?? false,
      completedWorkoutIdsThisWeek,
      differentWorkoutDoneToday,
      todayWorkouts: todayWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        muscleGroupLabel: w.muscleGroupLabel || "Geral",
        duration: w.duration,
        exercisesCount: w._count.exercises,
        isActive: w.isActive,
        isCompletedToday: completedWorkoutIdsToday.includes(w.id),
        isCompletedThisWeek: completedWorkoutIdsThisWeek.includes(w.id),
      })),
      weightHistory,
      weightHistoryBasis: { period: "LATEST_READING_PER_MONTH", limit: 24 },
      prs,
      alerts,
      pendingTasks,
      photoRequest: photoRequestNotification
        ? {
            id: photoRequestNotification.id,
            title: photoRequestNotification.title,
            description: photoRequestNotification.description,
            createdAt: photoRequestNotification.createdAt.toISOString(),
          }
        : null,
      recentMessages: recentMessages.slice(0, 3),
      finance: {
        status: paymentStatus,
        kind: manual ? "GYM_MANUAL" : "PERSONAL",
        pendingAmount: manual ? `${BigInt(manual.totals.outstandingInCents) / BigInt(100)},${(BigInt(manual.totals.outstandingInCents) % BigInt(100)).toString().padStart(2, "0")}` : pendingPaymentAmount,
        pendingAmountInCents: manual?.totals.outstandingInCents || null,
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
        isCompletedThisWeek: completedWorkoutIdsThisWeek.includes(w.id),
      }))
    };

    return NextResponse.json(payload);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("Student Dashboard API Error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
