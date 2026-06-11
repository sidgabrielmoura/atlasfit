"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Play,
  Clock,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  History,
  Info,
  Check,
  X,
  Timer,
  RotateCcw,
  Trophy,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseThumbnail, ExercisePreviewModal } from "@/components/application/exercise-preview-modal";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

export default function StudentWorkoutsPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  // State Management
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar / Selection States
  const daysOfWeekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  // Video Demo Modal
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Workout Execution Modal (Overlay)
  const [activeExecutionWorkout, setActiveExecutionWorkout] = useState<any | null>(null);
  const [currentExecExerciseIdx, setCurrentExecExerciseIdx] = useState(0);
  const [setsWeights, setSetsWeights] = useState<string[]>([]);
  const [setsReps, setSetsReps] = useState<string[]>([]);
  const [setsDone, setSetsDone] = useState<boolean[]>([]);
  const [allWorkoutLoads, setAllWorkoutLoads] = useState<Record<string, string[]>>({});
  const [allWorkoutReps, setAllWorkoutReps] = useState<Record<string, string[]>>({});
  const [allWorkoutSetsDone, setAllWorkoutSetsDone] = useState<Record<string, boolean[]>>({});

  // Rest Timer States
  const [restTimer, setRestTimer] = useState<number>(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [totalTimer, setTotalTimer] = useState<number>(0);
  const [isTotalTimerRunning, setIsTotalTimerRunning] = useState(false);

  // Effort Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [effortScore, setEffortScore] = useState<number>(3); // default "Adequado"
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Congratulations Modal
  const [showConGrats, setShowConGrats] = useState(false);

  // Exercise expansion states
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

  // Load workouts data on mount
  useEffect(() => {
    loadWorkoutsData();
  }, []);

  async function loadWorkoutsData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/workouts");
      if (!res.ok) {
        throw new Error("Falha ao carregar treinos.");
      }
      const apiData = await res.json();
      setWorkouts(apiData.workouts || []);
      setHistoryLogs(apiData.logs || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  // Active workout for the selected day of the week
  const selectedWorkout = workouts.find((w) => w.dayOfWeek === selectedDay);

  const isCompletedToday = selectedWorkout
    ? historyLogs.some((log) =>
      log.workoutId === selectedWorkout.id &&
      new Date(log.completedAt).toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR")
    )
    : false;

  const currentExecExercise = activeExecutionWorkout?.exercises[currentExecExerciseIdx];
  const currentExecExerciseDone = currentExecExercise ? allWorkoutSetsDone[currentExecExercise.id] : null;
  const allSetsCompleted = currentExecExerciseDone ? currentExecExerciseDone.every((done: boolean) => done) : false;

  // Timer Effect
  useEffect(() => {
    let restInterval: NodeJS.Timeout;
    let totalInterval: NodeJS.Timeout;

    if (isRestTimerActive && restTimer > 0) {
      restInterval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsRestTimerActive(false);
            toast.success("Tempo de descanso concluído! Prepare-se para a próxima série. 🔥");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (isTotalTimerRunning) {
      totalInterval = setInterval(() => {
        setTotalTimer((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      clearInterval(restInterval);
      clearInterval(totalInterval);
    };
  }, [isRestTimerActive, restTimer, isTotalTimerRunning]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Launch Workout Execution overlay
  const handleStartWorkout = (workout: any) => {
    if (!workout.isActive) {
      toast.error("Este treino está suspenso no momento pelo seu personal trainer.");
      return;
    }

    const isDoneToday = historyLogs.some((log) => {
      return log.workoutId === workout.id &&
        new Date(log.completedAt).toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR");
    });

    if (isDoneToday) {
      toast.error("Você já concluiu este treino hoje! Não é possível realizar o mesmo treino duas vezes no mesmo dia.");
      return;
    }

    setActiveExecutionWorkout(workout);
    setCurrentExecExerciseIdx(0);
    setTotalTimer(0);
    setIsTotalTimerRunning(true);

    // Initialize accumulated sets metrics for all exercises
    const initialLoads: Record<string, string[]> = {};
    const initialReps: Record<string, string[]> = {};
    const initialDone: Record<string, boolean[]> = {};
    workout.exercises.forEach((we: any) => {
      const repsArr = String(we.reps || "10").split(",").map(s => s.trim());
      const loadArr = String(we.load || "").split(",").map(s => s.trim());
      initialLoads[we.id] = Array.from({ length: we.sets }, (_, si) => loadArr[si] || loadArr[0] || "");
      initialReps[we.id] = Array.from({ length: we.sets }, (_, si) => repsArr[si] || repsArr[0] || "10");
      initialDone[we.id] = new Array(we.sets).fill(false);
    });
    setAllWorkoutLoads(initialLoads);
    setAllWorkoutReps(initialReps);
    setAllWorkoutSetsDone(initialDone);

    // Initialize local sets arrays for fallback
    const firstEx = workout.exercises[0];
    if (firstEx) {
      const firstRepsArr = String(firstEx.reps || "10").split(",").map(s => s.trim());
      const firstLoadArr = String(firstEx.load || "").split(",").map(s => s.trim());
      setSetsWeights(Array.from({ length: firstEx.sets }, (_, si) => firstLoadArr[si] || firstLoadArr[0] || ""));
      setSetsReps(Array.from({ length: firstEx.sets }, (_, si) => firstRepsArr[si] || firstRepsArr[0] || "10"));
      setSetsDone(new Array(firstEx.sets).fill(false));
    }
  };

  const searchParams = useSearchParams();
  const startWorkoutId = searchParams.get("startWorkoutId");
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (workouts.length > 0 && startWorkoutId && !autoStartedRef.current) {
      const targetWorkout = workouts.find((w) => w.id === startWorkoutId);
      if (targetWorkout) {
        autoStartedRef.current = true;
        setSelectedDay(targetWorkout.dayOfWeek ?? new Date().getDay());
        handleStartWorkout(targetWorkout);
      }
    }
  }, [workouts, startWorkoutId, historyLogs]);

  // Toggle set status
  const handleToggleSet = (idx: number, exercise: any) => {
    const nextDone = { ...allWorkoutSetsDone };
    if (!nextDone[exercise.id]) {
      nextDone[exercise.id] = new Array(exercise.sets).fill(false);
    }
    nextDone[exercise.id][idx] = !nextDone[exercise.id][idx];
    setAllWorkoutSetsDone(nextDone);

    // Sync to local fallback setsDone for active exercise
    const fallbackDone = [...setsDone];
    fallbackDone[idx] = nextDone[exercise.id][idx];
    setSetsDone(fallbackDone);

    // If marked done, trigger rest timer
    if (nextDone[exercise.id][idx]) {
      const restValueStr = exercise.rest || "60s";
      const seconds = parseInt(restValueStr) || 60;
      setRestTimer(seconds);
      setIsRestTimerActive(true);
      toast.info(`Descanso iniciado: ${seconds} segundos.`);
    }
  };

  // Skip / Navigation between exercises in overlay
  const handleNextExercise = () => {
    if (!activeExecutionWorkout) return;

    const nextIdx = currentExecExerciseIdx + 1;
    if (nextIdx < activeExecutionWorkout.exercises.length) {
      setCurrentExecExerciseIdx(nextIdx);
      const nextEx = activeExecutionWorkout.exercises[nextIdx];
      const nextRepsArr = String(nextEx.reps || "10").split(",").map(s => s.trim());
      const nextLoadArr = String(nextEx.load || "").split(",").map(s => s.trim());
      setSetsWeights(Array.from({ length: nextEx.sets }, (_, si) => nextLoadArr[si] || nextLoadArr[0] || ""));
      setSetsReps(Array.from({ length: nextEx.sets }, (_, si) => nextRepsArr[si] || nextRepsArr[0] || "10"));
      setSetsDone(allWorkoutSetsDone[nextEx.id] || new Array(nextEx.sets).fill(false));
      setIsRestTimerActive(false);
      setRestTimer(0);
    } else {
      // Completed all exercises, trigger effort evaluation!
      setIsTotalTimerRunning(false);
      setIsEvaluating(true);
    }
  };

  const handlePrevExercise = () => {
    const prevIdx = currentExecExerciseIdx - 1;
    if (prevIdx >= 0 && activeExecutionWorkout) {
      setCurrentExecExerciseIdx(prevIdx);
      const prevEx = activeExecutionWorkout.exercises[prevIdx];
      const prevRepsArr = String(prevEx.reps || "10").split(",").map(s => s.trim());
      const prevLoadArr = String(prevEx.load || "").split(",").map(s => s.trim());
      setSetsWeights(Array.from({ length: prevEx.sets }, (_, si) => prevLoadArr[si] || prevLoadArr[0] || ""));
      setSetsReps(Array.from({ length: prevEx.sets }, (_, si) => prevRepsArr[si] || prevRepsArr[0] || "10"));
      setSetsDone(allWorkoutSetsDone[prevEx.id] || new Array(prevEx.sets).fill(false));
      setIsRestTimerActive(false);
      setRestTimer(0);
    }
  };

  // Persist workout completion to database
  const handleSaveWorkoutLog = async () => {
    if (!activeExecutionWorkout) return;
    setIsSubmittingLog(true);
    try {
      const res = await fetch("/api/student/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: activeExecutionWorkout.id,
          feedback: feedbackNotes,
          effortScore,
          loads: allWorkoutLoads,
          reps: allWorkoutReps,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar log de treino.");
      }

      toast.success("Treino concluído com sucesso! 🏆");
      setIsEvaluating(false);
      setActiveExecutionWorkout(null);
      setShowConGrats(true);
      loadWorkoutsData(); // refresh logs list
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao gravar treino.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  if (loading) {
    return <StudentWorkoutsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="size-16 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Falha ao carregar treinos</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => loadWorkoutsData()} className="rounded-xl font-bold h-11 px-6">
          Recarregar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-in fade-in duration-500">

      {/* Top Banner Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Meus Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Visualize sua planilha de exercícios e registre suas conclusões no banco de dados.
          </p>
        </div>

        {/* History Slide Sheet Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-xl font-bold h-11 gap-2 border-border/60 hover:bg-secondary/40 shadow-sm cursor-pointer w-full md:w-auto justify-center">
              <History className="size-4.5" /> Histórico de Conclusões
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l border-border p-6 overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border/40">
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" />
                Histórico de Treinos
              </SheetTitle>
              <SheetDescription className="text-xs">
                Timeline com todos os seus treinos concluídos neste workspace.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              {historyLogs.length > 0 ? (
                historyLogs.map((log: any) => (
                  <div key={log.id} className="p-4 rounded-xl border border-border/40 bg-card flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground">{log.workout.name}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.completedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">{log.workout.muscleGroupLabel || "Foco Geral"}</span>
                      {log.effortScore && (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[9px]">
                          Esforço: {log.effortScore}/5
                        </Badge>
                      )}
                    </div>
                    {log.feedback && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-secondary/20 p-2.5 rounded-lg border border-border/30 mt-1">
                        "{log.feedback}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground space-y-2 flex flex-col items-center justify-center">
                  <History className="size-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-bold">Nenhum treino concluído</p>
                  <p className="text-xs">Seus treinos finalizados aparecerão aqui.</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Touch-Friendly Weekly Calendar Strip */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1.5 scrollbar-thin scrollbar-thumb-muted">
            {daysOfWeekLabels.map((dayLabel, idx) => {
              const dayWorkouts = workouts.filter((w) => w.dayOfWeek === idx);
              const hasWorkout = dayWorkouts.length > 0;
              const isSelected = selectedDay === idx;
              const isToday = new Date().getDay() === idx;

              const isDayCompletedToday = dayWorkouts.some((w) =>
                historyLogs.some((log) =>
                  log.workoutId === w.id &&
                  new Date(log.completedAt).toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR")
                )
              );

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={cn(
                    "flex-1 min-w-[70px] py-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer",
                    isSelected && "border-primary bg-primary/10! ring-1 ring-primary/20 shadow-md shadow-primary/5",
                    !isSelected && hasWorkout && "border-border bg-card hover:bg-secondary/20",
                    !isSelected && !hasWorkout && "border-border/40 bg-secondary/5 opacity-55 hover:bg-secondary/10"
                  )}
                >
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {dayLabel}
                  </span>
                  {hasWorkout ? (
                    <Badge variant="secondary" className={cn(
                      "text-[8px] font-black tracking-tighter px-1.5 py-0 border-none flex items-center justify-center gap-0.5",
                      isDayCompletedToday
                        ? "bg-emerald-500/10 text-emerald-500"
                        : (isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
                    )}>
                      {isDayCompletedToday && <Check className="size-2 shrink-0" />}
                      {dayWorkouts[0].muscleGroupLabel?.split(" ")[0] || "TREINO"}
                    </Badge>
                  ) : (
                    <span className="text-[9px] font-bold text-muted-foreground/60">DESCANSO</span>
                  )}
                  {isToday && !isSelected && (
                    <div className="size-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Workout Display Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {selectedWorkout ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 Columns: Exercises list */}
              <div className="lg:col-span-2 space-y-6">

                {/* Active Workout Info Card */}
                <Card className="border-border/50 bg-gradient-to-r from-card to-secondary/20 overflow-hidden relative">
                  <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase gap-1.5 ring-1",
                          selectedWorkout.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-emerald-500/10"
                            : "bg-destructive/10 text-destructive border-destructive/20 ring-destructive/10"
                        )}>
                          <span className={cn("size-1.5 rounded-full", selectedWorkout.isActive ? "bg-emerald-500 animate-pulse" : "bg-destructive")} />
                          {selectedWorkout.isActive ? "Treino Ativo" : "Treino Suspenso"}
                        </Badge>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-bold uppercase">
                          {selectedWorkout.goal}
                        </Badge>
                        {isCompletedToday && (
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase gap-1.5 ring-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-emerald-500/10">
                            <Check className="size-3 text-emerald-500 animate-bounce" /> Concluído Hoje
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight">{selectedWorkout.name}</h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        Foco muscular em <span className="text-primary font-semibold">{selectedWorkout.muscleGroupLabel || "Geral"}</span>
                      </p>
                    </div>

                    {selectedWorkout.isActive && (
                      isCompletedToday ? (
                        <Button
                          disabled
                          className="w-full sm:w-auto h-12 rounded-xl font-bold text-sm bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 gap-2 shrink-0 opacity-100 cursor-not-allowed"
                        >
                          <CheckCircle2 className="size-4.5 text-emerald-500" /> TREINO CONCLUÍDO HOJE
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStartWorkout(selectedWorkout)}
                          className="w-full sm:w-auto h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10 gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                          <Play className="size-4.5 fill-current" /> INICIAR PLANILHA
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Exercises Flow */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Exercícios do Dia</h3>
                  <div className="space-y-4">
                    {selectedWorkout.exercises.map((we: any, idx: number) => {
                      const repsArr = String(we.reps || "").split(",").map(s => s.trim());
                      const loadArr = String(we.load || "").split(",").map(s => s.trim());
                      const restArr = String(we.rest || "").split(",").map(s => s.trim());
                      const isIndividual = repsArr.length > 1 || loadArr.length > 1 || restArr.length > 1;

                      return (
                        <Card key={we.id} className="border-border/50 bg-card hover:border-primary/25 transition-all shadow-sm">
                          <CardContent className="p-4 md:p-6 flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                              <div className="flex items-start gap-4 min-w-0 flex-1">
                                {/* Counter Circle Badge */}
                                <div className="size-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 font-black text-sm text-primary">
                                  {idx + 1}
                                </div>
                                <div
                                  className="cursor-pointer shrink-0"
                                  onClick={() => {
                                    setPreviewExercise(we.exercise);
                                    setIsPreviewModalOpen(true);
                                  }}
                                >
                                  <ExerciseThumbnail videoUrl={we.exercise.videoUrl} className="size-11 rounded-xl" />
                                </div>
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <h4
                                    className="font-bold text-base text-foreground leading-tight cursor-pointer hover:text-primary transition-colors truncate"
                                    onClick={() => {
                                      setPreviewExercise(we.exercise);
                                      setIsPreviewModalOpen(true);
                                    }}
                                  >
                                    {we.exercise.name}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md border border-border/40">
                                      {we.sets} séries
                                    </span>
                                    <span>{repsArr[0] || "10"} reps</span>
                                    <span>Carga: {loadArr[0] || "Auto"}</span>
                                    <span>Descanso: {restArr[0] || "60s"}</span>
                                  </div>
                                  {/* Exercise instructions / personal comments */}
                                  {(we.exercise.instructions || we.notes) && (
                                    <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium bg-secondary/15 p-3 rounded-xl border border-border/30 mt-2.5 max-w-[500px]">
                                      <Info className="size-3.5 inline mr-1 text-primary align-text-bottom shrink-0" />
                                      {we.notes || we.exercise.instructions}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Exercise video demonstration */}
                              {we.exercise.videoUrl && (
                                <Button
                                  onClick={() => {
                                    setPreviewExercise(we.exercise);
                                    setIsPreviewModalOpen(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl border-border/60 font-bold h-9 gap-1.5 text-xs w-full sm:w-auto justify-center cursor-pointer hover:bg-secondary/40"
                                >
                                  <PlayCircle className="size-4 text-primary" /> Ver Execução
                                </Button>
                              )}
                            </div>

                            {/* Collapsible individual sets section */}
                            {isIndividual && (
                              <div className="w-full">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/20 rounded-lg gap-1.5 px-2.5 -ml-2.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedExercises(prev => ({ ...prev, [we.id]: !prev[we.id] }));
                                  }}
                                >
                                  {expandedExercises[we.id] ? (
                                    <>
                                      Ocultar séries <ChevronUp className="size-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      Ver todas as {we.sets} séries <ChevronDown className="size-3.5" />
                                    </>
                                  )}
                                </Button>

                                {expandedExercises[we.id] && (
                                  <div className="mt-3 flex flex-col! gap-2.5 p-3 rounded-xl bg-secondary/15 border border-border/40">
                                    {Array.from({ length: we.sets }).map((_, si) => (
                                      <div key={si} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-card border border-border/20 text-xs">
                                        <span className="font-bold text-muted-foreground">#{si + 1}</span>
                                        <div className="flex items-center gap-3">
                                          <div>
                                            <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase">Reps</span>
                                            <span className="font-bold text-foreground">{repsArr[si] || repsArr[0] || "10"}</span>
                                          </div>
                                          <div className="w-px h-5 bg-border/40" />
                                          <div>
                                            <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase">Carga</span>
                                            <span className="font-bold text-foreground">{loadArr[si] || loadArr[0] || "Auto"}</span>
                                          </div>
                                          <div className="w-px h-5 bg-border/40" />
                                          <div>
                                            <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase">Desc.</span>
                                            <span className="font-bold text-foreground">{restArr[si] || restArr[0] || "60s"}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Right Column: Consolidation and info */}
              <div className="space-y-6">

                {/* Consolidado Info Card */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo do Treino</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2.5">
                      <span className="text-muted-foreground font-medium">Duração Estimada</span>
                      <span className="font-bold text-foreground">{selectedWorkout.duration}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2.5">
                      <span className="text-muted-foreground font-medium">Quantidade de Séries</span>
                      <span className="font-bold text-foreground">
                        {selectedWorkout.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0)} séries
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-1">
                      <span className="text-muted-foreground font-medium">Descanso entre Execs</span>
                      <span className="font-bold text-foreground">{selectedWorkout.restBetweenExercises || "2 min"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Message Advice block */}
                <Card className="border-border/50 bg-primary/5 border-dashed shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Lightbulb className="size-4 animate-pulse" />
                      Orientação do Treinador
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      Execute os exercícios focando em manter a máxima cadência na fase excêntrica (descida). O descanso entre as séries é fundamental para a recuperação dos substratos energéticos. Bom treino!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-2 border-border/60 bg-transparent flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
              <div className="size-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Calendar className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-base mb-1">Dia de Descanso ou Sem Treino</h3>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                Nenhum treino planejado para {daysOfWeekLabels[selectedDay]}. Aproveite o dia para recuperar a musculatura ou realize uma atividade aeróbica regenerativa!
              </p>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />

      {/* WORKOUT EXECUTION SHEET OVERLAY (TOUCH Gym workspace) */}
      {activeExecutionWorkout && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto flex flex-col">
          {/* Header Area */}
          <header className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/40 p-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Dumbbell className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black truncate">{activeExecutionWorkout.name}</h2>
                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Clock className="size-3 text-primary animate-pulse" /> {formatTimer(totalTimer)} exercitando
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                if (confirm("Tem certeza que deseja sair do treino? Seu progresso atual não será salvo.")) {
                  setActiveExecutionWorkout(null);
                  setIsRestTimerActive(false);
                }
              }}
              variant="destructive"
              size="icon"
              className="size-10 rounded-xl cursor-pointer"
            >
              <X className="size-5" />
            </Button>
          </header>

          {/* Active Workout exercise block */}
          {activeExecutionWorkout.exercises[currentExecExerciseIdx] ? (
            (() => {
              const execEx = activeExecutionWorkout.exercises[currentExecExerciseIdx];
              return (
                <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 pb-36">
                  {/* Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Progresso do Treino</span>
                      <span>
                        {Math.round(((currentExecExerciseIdx + 1) / activeExecutionWorkout.exercises.length) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={((currentExecExerciseIdx + 1) / activeExecutionWorkout.exercises.length) * 100}
                      className="h-1.5 rounded-full"
                    />
                  </div>

                  {/* Exercise info card */}
                  <Card className="border-border/50 overflow-hidden shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                            Exercício {currentExecExerciseIdx + 1} de {activeExecutionWorkout.exercises.length}
                          </span>
                          <h3 className="text-lg font-bold mt-1 text-foreground leading-tight">{execEx.exercise.name}</h3>
                        </div>
                        {execEx.exercise.videoUrl && (
                          <Button
                            onClick={() => {
                              setPreviewExercise(execEx.exercise);
                              setIsPreviewModalOpen(true);
                            }}
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-lg border-border/60 shrink-0 cursor-pointer"
                          >
                            <Play className="size-4 text-primary fill-current" />
                          </Button>
                        )}
                      </div>

                      {execEx.notes && (
                        <p className="text-xs text-muted-foreground/90 font-semibold p-3 bg-secondary/25 border border-border/30 rounded-xl">
                          <Lightbulb className="size-3.5 inline mr-1 text-primary align-text-bottom" />
                          {execEx.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Log sets container */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <div className="text-center">Série</div>
                      <div className="text-center">Carga (KG)</div>
                      <div className="text-center">Reps</div>
                      <div className="text-center">Status</div>
                    </div>

                    <div className="space-y-2.5">
                      {new Array(execEx.sets).fill(0).map((_, setIdx) => (
                        <div
                          key={setIdx}
                          className={cn(
                            "grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 items-center p-3 rounded-xl border transition-all shadow-sm",
                            (allWorkoutSetsDone[execEx.id]?.[setIdx])
                              ? "bg-primary/5 border-primary/30"
                              : "bg-card border-border/40"
                          )}
                        >
                          {/* Set number */}
                          <div className={cn(
                            "flex items-center justify-center size-9 rounded-lg font-black text-xs",
                            (allWorkoutSetsDone[execEx.id]?.[setIdx]) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          )}>
                            {setIdx + 1}
                          </div>

                          {/* Load Input */}
                          <Input
                            type="tel"
                            value={allWorkoutLoads[execEx.id]?.[setIdx] || ""}
                            onChange={(e) => {
                              const nextLoads = { ...allWorkoutLoads };
                              if (!nextLoads[execEx.id]) {
                                nextLoads[execEx.id] = new Array(execEx.sets).fill("");
                              }
                              nextLoads[execEx.id][setIdx] = e.target.value;
                              setAllWorkoutLoads(nextLoads);
                            }}
                            placeholder="ex: 60"
                            className="h-10 text-center font-bold bg-transparent border-none focus-visible:ring-0 text-base"
                          />

                          {/* Reps Input */}
                          <Input
                            type="tel"
                            value={allWorkoutReps[execEx.id]?.[setIdx] || ""}
                            onChange={(e) => {
                              const nextReps = { ...allWorkoutReps };
                              if (!nextReps[execEx.id]) {
                                nextReps[execEx.id] = new Array(execEx.sets).fill("");
                              }
                              nextReps[execEx.id][setIdx] = e.target.value;
                              setAllWorkoutReps(nextReps);
                            }}
                            placeholder="ex: 10"
                            className="h-10 text-center font-bold bg-transparent border-none focus-visible:ring-0 text-base"
                          />

                          {/* Complete Check button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleSet(setIdx, execEx)}
                            className={cn(
                              "size-10 rounded-lg transition-all cursor-pointer",
                              (allWorkoutSetsDone[execEx.id]?.[setIdx])
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/60 text-muted-foreground hover:bg-primary/10"
                            )}
                          >
                            {(allWorkoutSetsDone[execEx.id]?.[setIdx]) ? (
                              <Check className="size-5" />
                            ) : (
                              <div className="size-4.5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </main>
              );
            })()
          ) : null}

          {/* Floating Action footer navigation */}
          <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border/40 z-40">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-4">

              {/* Navigation Back / Next */}
              <div className="flex gap-2">
                <Button
                  onClick={handlePrevExercise}
                  disabled={currentExecExerciseIdx === 0}
                  variant="outline"
                  size="icon"
                  className="size-12 rounded-xl border-border/60 shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                {activeExecutionWorkout && currentExecExerciseIdx < activeExecutionWorkout.exercises.length - 1 ? (
                  <Button
                    onClick={handleNextExercise}
                    disabled={!allSetsCompleted}
                    className="h-12 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-6 gap-1 cursor-pointer active:scale-95 shadow-md shadow-primary/10"
                  >
                    Próximo <ChevronRight className="size-4.5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextExercise}
                    disabled={!allSetsCompleted}
                    className="h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-6 gap-1 cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10"
                  >
                    Finalizar Treino <CheckCircle2 className="size-4.5" />
                  </Button>
                )}
              </div>

              {/* Floating Rest Timer Display */}
              {restTimer > 0 && (
                <div className="flex items-center gap-3 bg-secondary/40 border border-border/40 p-2.5 rounded-xl text-xs font-semibold select-none shadow-sm shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Timer className={cn("size-4 text-primary", isRestTimerActive && "animate-pulse")} />
                    <span className="font-mono text-sm">{formatTimer(restTimer)}</span>
                  </div>
                  <Button
                    onClick={() => {
                      setIsRestTimerActive(!isRestTimerActive);
                    }}
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-md hover:bg-secondary text-primary cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                </div>
              )}

            </div>
          </footer>
        </div>
      )}

      {/* Effort Evaluation Dialog popup */}
      <Dialog open={isEvaluating} onOpenChange={(open) => !open && setIsEvaluating(false)}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-2 text-center flex flex-col items-center">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Trophy className="size-6 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">
              Treino Concluído! Mandou bem! 🔥
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-[340px]">
              Avalie como foi o esforço físico do treino de hoje para mantermos seu plano preciso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {/* Sliding Effort Score Indicator */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex justify-between px-1">
                <span>Percepção de Esforço</span>
                <span className="text-primary font-black">
                  {effortScore === 1 ? "1 - Muito Fácil 😴" :
                    effortScore === 2 ? "2 - Fácil 😊" :
                      effortScore === 3 ? "3 - Adequado 👍" :
                        effortScore === 4 ? "4 - Difícil ⚡" :
                          "5 - Muito Difícil 🥵"}
                </span>
              </label>

              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setEffortScore(val)}
                    className={cn(
                      "h-11 rounded-xl font-bold text-sm border flex flex-col items-center justify-center cursor-pointer transition-all",
                      effortScore === val
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/15"
                        : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                    )}
                  >
                    <span>{val}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional feedback comments notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Feedback para o Personal (Opcional)
              </label>
              <textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="ex: fadiguei no supino reto, ou senti desconforto no joelho..."
                className="w-full h-20 rounded-xl bg-secondary/30 border border-border/50 p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={handleSaveWorkoutLog}
              disabled={isSubmittingLog}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {isSubmittingLog ? (
                <>Salvando dados...</>
              ) : (
                <>Gravar no Histórico e Finalizar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Congratulations / Trophy Modal Popup */}
      <Dialog open={showConGrats} onOpenChange={setShowConGrats}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl p-6 text-center space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <Trophy className="size-8 animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
              Treino Salvo com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-[280px]">
              Seus dados de esforço e constância foram sincronizados no banco do treinador. Continue mantendo o foco!
            </DialogDescription>
          </div>

          <div className="bg-secondary/30 p-4 rounded-2xl border border-border/40 flex justify-around text-center mt-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Frequência</p>
              <p className="text-lg font-black text-primary">Ativa</p>
            </div>
            <div className="w-px bg-border/40" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Streak</p>
              <p className="text-lg font-black text-primary">Atualizado</p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button onClick={() => setShowConGrats(false)} className="w-full h-11 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
              Voltar ao Painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Mirroring the original layout completely (skelletonsloaders.md)
function StudentWorkoutsSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-pulse">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 max-w-full bg-muted" />
          <Skeleton className="h-4 w-full max-w-md bg-muted" />
        </div>
        <Skeleton className="h-11 w-48 bg-muted rounded-xl" />
      </div>

      {/* Calendar strip skeleton */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-16 flex-1 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Workout Panel Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardContent className="p-6 h-28 flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-muted rounded-full" />
                <Skeleton className="h-7 w-56 bg-muted rounded" />
              </div>
              <Skeleton className="h-12 w-36 bg-muted rounded-xl" />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 h-20 flex justify-between items-center">
                  <div className="flex gap-4">
                    <Skeleton className="size-9 bg-muted rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40 bg-muted" />
                      <Skeleton className="h-3.5 w-48 bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-24 bg-muted rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardContent className="p-5 h-44 bg-muted/25 rounded-2xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}
