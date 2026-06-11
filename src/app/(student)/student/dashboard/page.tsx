"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Flame,
  TrendingUp,
  Scale,
  Play,
  ChevronRight,
  ChevronLeft,
  Zap,
  Activity,
  Dumbbell,
  Target,
  CalendarCheck2,
  Clock,
  Trophy,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Camera,
  CreditCard,
  CheckCircle2,
  Calendar,
  Smile,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Grid container stagger animation
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function StudentDashboardPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWorkoutIdx, setActiveWorkoutIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(new Date().getDay());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student/dashboard");
        if (!res.ok) {
          throw new Error("Erro ao buscar dados do dashboard do aluno.");
        }
        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao carregar os dados.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return <StudentDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <div className="size-16 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Ops! Algo deu errado.</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Não conseguimos carregar suas informações da jornada agora. Tente recarregar a página.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-xl font-bold h-11 px-6">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const {
    streak,
    bestStreak = 0,
    adherence,
    weeklyFrequency,
    currentWeight,
    currentBF,
    evolutionPercent,
    weightHistory,
    prs,
    pendingTasks,
    finance,
    workoutsOfTheWeek,
    todayWorkouts = [],
    studentName,
  } = data;

  const daysOfWeekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const currentDayOfWeek = new Date().getDay();
  const selectedDayWorkouts = workoutsOfTheWeek.filter((w: any) => w.dayOfWeek === selectedDayIdx);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* 1. Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {getGreeting()}, {studentName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Que bom ver você de volta. Vamos aos treinos de hoje!
          </p>
        </div>

        <div className="flex items-center gap-3 bg-secondary/30 backdrop-blur-md px-3.5 py-2 rounded-full border border-border/40 text-xs font-semibold w-fit transition-all duration-300 hover:bg-secondary/40">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Membro Elite · {data.workspace.name}</span>
        </div>
      </div>

      {/* 2. Today's Workout Card */}
      {todayWorkouts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-dashed border-2 border-border/60 bg-card/40 flex flex-col items-center justify-center p-8 text-center min-h-[200px] relative overflow-hidden rounded-2xl">
            <div className="size-12 rounded-full bg-secondary/80 flex items-center justify-center mb-3">
              <Calendar className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">Dia de Descanso</h3>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              Hoje é o seu dia de descanso planejado! Aproveite para recuperar as energias e regenerar sua musculatura. 🔋
            </p>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={cn(
            "overflow-hidden p-0 border shadow-lg relative group transition-all duration-300 rounded-2xl",
            todayWorkouts[activeWorkoutIdx]?.isCompletedToday
              ? "border-emerald-500/25 bg-gradient-to-br from-card to-emerald-500/5 shadow-emerald-500/[0.02]"
              : "border-primary/20 bg-gradient-to-br from-card to-secondary/10 shadow-primary/5"
          )}>
            <div className="absolute top-0 right-0 p-8 text-primary/5 select-none pointer-events-none group-hover:text-primary/10 transition-colors hidden md:block">
              <Dumbbell className="size-44 rotate-12" />
            </div>

            {todayWorkouts.length > 1 && (
              <div className="flex items-center justify-between border-b border-border/30 px-6 py-3 bg-secondary/10">
                <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest">
                  <Activity className="size-3.5 animate-pulse" />
                  Treino Recomendado {activeWorkoutIdx + 1} de {todayWorkouts.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg hover:bg-secondary/60 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveWorkoutIdx(prev => (prev === 0 ? todayWorkouts.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="flex gap-1">
                    {todayWorkouts.map((_: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "size-1.5 rounded-full transition-all duration-300",
                          activeWorkoutIdx === i ? "bg-primary w-3" : "bg-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg hover:bg-secondary/60 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveWorkoutIdx(prev => (prev === todayWorkouts.length - 1 ? 0 : prev + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={todayWorkouts[activeWorkoutIdx]?.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col md:flex-row"
              >
                {/* Workout summary */}
                <div className="flex-1 p-6 md:p-8 space-y-4">
                  <div className="space-y-2">
                    {todayWorkouts.length === 1 && (
                      <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest">
                        <Activity className="size-3.5 animate-pulse" />
                        Treino Recomendado
                      </div>
                    )}
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                      {todayWorkouts[activeWorkoutIdx]?.name}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      {todayWorkouts[activeWorkoutIdx]?.muscleGroupLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {todayWorkouts[activeWorkoutIdx]?.duration || "60 min"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="size-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {todayWorkouts[activeWorkoutIdx]?.exercisesCount || 0} Exercícios
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workout CTA block */}
                <div className="bg-secondary/20 p-6 md:w-64 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-border/50 gap-4 shrink-0">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status Atual</p>
                    {todayWorkouts[activeWorkoutIdx]?.isCompletedToday ? (
                      <p className="text-sm font-bold text-emerald-500 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Concluído
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-amber-500 flex items-center justify-center gap-1.5">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        Pendente
                      </p>
                    )}
                  </div>
                  {todayWorkouts[activeWorkoutIdx]?.isCompletedToday ? (
                    <Button
                      disabled
                      className="w-full h-12 rounded-xl font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 opacity-100 cursor-not-allowed"
                    >
                      CONCLUÍDO
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <Link href={`/student/workouts?startWorkoutId=${todayWorkouts[activeWorkoutIdx]?.id}`}>
                        <Play className="size-4 mr-2 fill-current" /> INICIAR TREINO
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* 3. Pending Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Pendências do Aluno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTasks.length > 0 ? (
              <div className="divide-y divide-border/40">
                {pendingTasks.map((task: any) => {
                  const getTaskLink = (t: any) => {
                    if (t.id === "task-photo") return "/student/evolution";
                    if (t.id === "task-weight") return "/student/evolution";
                    if (t.id.startsWith("task-workout")) return `/student/workouts?startWorkoutId=${t.workoutId || ""}`;
                    if (t.id === "task-feedback") return "/student/feedbacks";
                    return "#";
                  };

                  const itemContent = (
                    <div className="p-4 flex items-center gap-3 hover:bg-secondary/15 transition-colors cursor-pointer">
                      <div className={cn(
                        "size-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                        task.icon === "Camera" ? "bg-blue-500/10 text-blue-500" :
                          task.icon === "Scale" ? "bg-amber-500/10 text-amber-500" :
                            task.icon === "Smile" ? "bg-indigo-500/10 text-indigo-500" :
                              "bg-primary/10 text-primary"
                      )}>
                        {task.icon === "Camera" ? <Camera className="size-4.5" /> :
                          task.icon === "Scale" ? <Scale className="size-4.5" /> :
                            task.icon === "Smile" ? <Smile className="size-4.5" /> :
                              <Dumbbell className="size-4.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-foreground">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                    </div>
                  );

                  const link = getTaskLink(task);
                  if (link === "#") return <div key={task.id}>{itemContent}</div>;

                  return (
                    <Link key={task.id} href={link} className="block">
                      {itemContent}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2 flex flex-col items-center">
                <CheckCircle2 className="size-6 text-emerald-500" />
                <p className="text-xs font-bold">Tudo em dia! 🎉</p>
                <p className="text-[10px] text-muted-foreground">Nenhuma pendência para hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Streak Motivation Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border border-orange-500/25 bg-gradient-to-br from-card via-card to-orange-500/5 overflow-hidden rounded-2xl relative shadow-md shadow-orange-500/[0.02]">
          <div className="absolute -right-6 -bottom-6 opacity-[0.08] pointer-events-none select-none">
            <Flame className="size-48 text-orange-500 animate-pulse" />
          </div>
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0 relative">
                <Flame className="size-8 animate-bounce fill-current" />
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                  Streak de Treinos
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Mantenha a chama acesa! Cada dia de treino concluído aumenta sua constância e acelera seus resultados.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 divide-x divide-border border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-around md:justify-end">
              <div className="text-center px-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Atual</span>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center gap-1">
                  {streak} <span className="text-xs font-bold text-muted-foreground">dias</span>
                </span>
              </div>
              <div className="text-center px-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Recorde</span>
                <span className="text-3xl font-black text-foreground flex items-center justify-center gap-1">
                  {bestStreak} <span className="text-xs font-bold text-muted-foreground">dias</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 5. KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Adherence Rate */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20 rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aderência</span>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Target className="size-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{adherence}%</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">De conclusão</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Frequency */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20 rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Frequência</span>
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <CalendarCheck2 className="size-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{weeklyFrequency}x</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">Nesta semana</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Weight */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20 rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Peso Corporal</span>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Scale className="size-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {currentWeight !== null && currentWeight !== undefined ? `${currentWeight} kg` : "-- kg"}
                </h3>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                  {currentBF !== null && currentBF !== undefined ? `${currentBF}% BF` : "--% BF"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* 6. Evolution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Evolução Corporal
              </CardTitle>
              <CardDescription className="text-xs">Peso histórico</CardDescription>
            </div>
            {evolutionPercent !== 0 && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
                {evolutionPercent > 0 ? `-${evolutionPercent}%` : `+${Math.abs(evolutionPercent)}%`} desde o início
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {weightHistory && weightHistory.length > 0 ? (
              <div className="h-[220px] w-full min-w-0">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-muted-foreground" />
                      <YAxis tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} className="text-[10px] font-bold text-muted-foreground" />
                      <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                      <Area type="monotone" dataKey="value" name="Peso (kg)" stroke="var(--primary)" strokeWidth={2.5} fill="url(#fillWeight)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-border/40 rounded-xl bg-secondary/5">
                <TrendingUp className="size-8 text-muted-foreground/50" />
                <p className="text-xs font-bold text-foreground">Nenhum registro de evolução</p>
                <p className="text-[10px] text-muted-foreground max-w-[280px]">
                  Seu treinador ainda não registrou nenhuma pesagem ou avaliação física para acompanhar seu progresso corporal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 7. Divisão de Treinos (Compact & Interactive for Mobile/Desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/50 rounded-2xl overflow-hidden bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Divisão de Treinos Semanais
            </CardTitle>
            <CardDescription className="text-xs">Clique nos dias para visualizar a programação</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-4">
            {/* 7-Day Interactive Strip */}
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {daysOfWeekLabels.map((dayLabel, idx) => {
                const dayWorkouts = workoutsOfTheWeek.filter((w: any) => w.dayOfWeek === idx);
                const hasWorkout = dayWorkouts.length > 0;
                const isCompleted = hasWorkout && dayWorkouts.every((w: any) => w.isCompletedToday);
                const isToday = currentDayOfWeek === idx;
                const isSelected = selectedDayIdx === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayIdx(idx)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all duration-200 cursor-pointer relative",
                      isSelected
                        ? "bg-secondary/40 ring-1 ring-primary/30"
                        : "hover:bg-secondary/20"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isToday ? "text-primary font-black" : "text-muted-foreground"
                    )}>
                      {dayLabel}
                    </span>

                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                        : hasWorkout
                          ? isToday
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-primary/5 text-primary/80 border border-primary/20"
                          : "bg-secondary/50 text-muted-foreground/40 border border-transparent"
                    )}>
                      {isCompleted ? (
                        <Check className="size-3.5 stroke-[3]" />
                      ) : hasWorkout ? (
                        <Dumbbell className="size-3.5" />
                      ) : (
                        <Clock className="size-3.5 opacity-40" />
                      )}
                    </div>

                    {isToday && (
                      <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Details Panel */}
            <div className="bg-secondary/15 rounded-xl p-3 border border-border/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Programação de {selectedDayIdx === currentDayOfWeek ? "Hoje (Atual)" : daysOfWeekLabels[selectedDayIdx]}
                </span>
                {selectedDayWorkouts.length === 0 && (
                  <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground border-border bg-secondary/30">
                    Descanso
                  </Badge>
                )}
              </div>

              {selectedDayWorkouts.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayWorkouts.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between bg-card p-2.5 rounded-lg border border-border/40 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "size-7 rounded-lg flex items-center justify-center shrink-0",
                          w.isCompletedToday ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                        )}>
                          <Dumbbell className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{w.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{w.muscleGroupLabel || "Geral"}</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase border-none px-2 py-0.5 shadow-none",
                        w.isCompletedToday
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-amber-500/15 text-amber-500"
                      )}>
                        {w.isCompletedToday ? "Concluído" : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Nenhum treino planejado para este dia. Aproveite para descansar! 🔋
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 8. Resumo Financeiro & Minimalist PRs (Side-by-side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumo Financeiro */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className={cn(
            "border-border/50 shadow-sm h-full transition-all duration-300 rounded-2xl",
            (finance.status === "Pendente" || finance.status === "Atrasado" || finance.status === "Expirado") ? "border-amber-500/30 bg-amber-500/[0.02]" : "bg-card"
          )}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Financeiro</CardTitle>
                <CardDescription className="text-xs">Status de faturas</CardDescription>
              </div>
              <Badge className={cn(
                "rounded-full border-none px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                (finance.status === "Pendente" || finance.status === "Atrasado" || finance.status === "Expirado")
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-500"
              )}>
                {finance.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-xl border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <CreditCard className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {(finance.status === "Pendente" || finance.status === "Atrasado" || finance.status === "Expirado")
                        ? "Cobranças em Aberto"
                        : "Financeiro Regularizado"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(finance.status === "Pendente" || finance.status === "Atrasado" || finance.status === "Expirado")
                        ? `Valor total: R$ ${finance.pendingAmount}`
                        : "Nenhuma pendência"}
                    </p>
                  </div>
                </div>
              </div>

              {(finance.status === "Pendente" || finance.status === "Atrasado" || finance.status === "Expirado") && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-amber-500 leading-relaxed font-medium">
                    Existe uma cobrança pendente de <strong>R$ {finance.pendingAmount}</strong>. Regularize para evitar o bloqueio de seus treinos.
                  </p>
                  <Button asChild className="w-full h-10 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-sm cursor-pointer">
                    <Link href="/student/finance">
                      Verificar Faturas
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Minimalist Personal Records (PRs) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 shadow-sm h-full rounded-2xl bg-card">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-4.5 text-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recordes Pessoais (PR)</span>
              </div>
              {prs && prs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {prs.map((pr: any) => (
                    <div key={pr.id} className="flex justify-between items-center bg-secondary/15 px-3 py-2 rounded-xl border border-border/20 text-xs">
                      <span className="font-bold truncate text-foreground text-left max-w-[150px]">
                        {pr.exercise.split(" (")[0]}
                      </span>
                      <Badge className="bg-primary/10 hover:bg-primary/20 text-primary border-none font-bold text-[10px] px-2 py-0.5 shrink-0">
                        {pr.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground py-2">Nenhum recorde de carga registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StudentDashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-24 animate-pulse w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="space-y-2 w-full">
          <Skeleton className="h-8 w-full max-w-[240px] bg-muted" />
          <Skeleton className="h-4 w-full max-w-[320px] bg-muted" />
        </div>
        <Skeleton className="h-8 w-full max-w-[176px] bg-muted rounded-full shrink-0" />
      </div>

      <Card className="border-border/50 bg-card w-full">
        <div className="flex flex-col md:flex-row w-full">
          <div className="flex-1 p-6 md:p-8 space-y-6 w-full">
            <div className="space-y-3 w-full">
              <Skeleton className="h-3 w-full max-w-[112px] bg-muted" />
              <Skeleton className="h-7 w-full max-w-[240px] bg-muted" />
              <Skeleton className="h-4 w-full max-w-[160px] bg-muted" />
            </div>
            <div className="flex gap-6 w-full">
              <Skeleton className="h-4 w-full max-w-[64px] bg-muted" />
              <Skeleton className="h-4 w-full max-w-[80px] bg-muted" />
            </div>
          </div>
          <div className="bg-secondary/10 p-6 md:w-64 w-full flex flex-col justify-center items-center gap-4 shrink-0">
            <Skeleton className="h-8 w-full max-w-[96px] bg-muted" />
            <Skeleton className="h-12 w-full bg-muted rounded-xl" />
          </div>
        </div>
      </Card>

      {/* Pending Tasks */}
      <Card className="border-border/50 w-full">
        <CardHeader className="pb-3 w-full">
          <Skeleton className="h-4 w-full max-w-[128px] bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3 w-full">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-muted rounded-xl" />
          ))}
        </CardContent>
      </Card>

      {/* Streak skeleton */}
      <Card className="border-border/50 w-full">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left flex-1 w-full">
            <Skeleton className="size-16 bg-muted rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1 w-full flex flex-col items-center sm:items-start">
              <Skeleton className="h-5 w-full max-w-[144px] bg-muted" />
              <Skeleton className="h-4 w-full max-w-[280px] bg-muted" />
            </div>
          </div>
          <div className="flex gap-6 shrink-0 divide-x divide-border border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-around md:justify-end">
            <div className="text-center px-4 space-y-2">
              <Skeleton className="h-3 w-10 bg-muted mx-auto" />
              <Skeleton className="h-8 w-16 bg-muted mx-auto" />
            </div>
            <div className="text-center px-6 space-y-2">
              <Skeleton className="h-3 w-12 bg-muted mx-auto" />
              <Skeleton className="h-8 w-16 bg-muted mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/60 rounded-2xl w-full">
            <CardContent className="p-4 flex flex-col justify-between h-28 w-full">
              <div className="flex justify-between items-start w-full">
                <Skeleton className="h-3 w-full max-w-[64px] bg-muted" />
                <Skeleton className="size-8 rounded-lg bg-muted shrink-0" />
              </div>
              <div className="space-y-2 w-full">
                <Skeleton className="h-6 w-full max-w-[80px] bg-muted" />
                <Skeleton className="h-3 w-full max-w-[96px] bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evolution Chart */}
      <Card className="border-border/50 rounded-2xl w-full">
        <CardHeader className="space-y-2 w-full">
          <Skeleton className="h-4 w-full max-w-[128px] bg-muted" />
          <Skeleton className="h-3 w-full max-w-[192px] bg-muted" />
        </CardHeader>
        <CardContent className="w-full">
          <Skeleton className="h-[220px] w-full bg-muted/30 rounded-xl" />
        </CardContent>
      </Card>

      {/* Weekly Workouts Map */}
      <Card className="border-border/50 rounded-2xl w-full">
        <CardHeader className="pb-3 w-full">
          <Skeleton className="h-4 w-full max-w-[144px] bg-muted" />
          <Skeleton className="h-3 w-full max-w-[192px] bg-muted" />
        </CardHeader>
        <CardContent className="p-4 space-y-4 w-full">
          <div className="flex gap-2 w-full overflow-x-auto no-scrollbar">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-16 flex-1 min-w-[44px] bg-muted rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-16 w-full bg-muted rounded-xl" />
        </CardContent>
      </Card>

      {/* Finance and PRs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <Card className="border border-border/50 bg-card rounded-2xl w-full">
          <CardHeader className="pb-3 w-full">
            <Skeleton className="h-4 w-full max-w-[112px] bg-muted" />
            <Skeleton className="h-3 w-full max-w-[144px] bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4 w-full">
            <Skeleton className="h-14 w-full bg-muted rounded-xl" />
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card rounded-2xl w-full">
          <CardContent className="p-6 flex flex-col gap-4 w-full">
            <Skeleton className="h-4 w-full max-w-[128px] bg-muted" />
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-muted rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
