"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History as HistoryIcon,
  Calendar,
  Dumbbell,
  Clock,
  TrendingUp,
  ChevronRight,
  Filter,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Sparkles,
  Info,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Framer motion variants
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

export default function StudentHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal / Detail states
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [logToDelete, setLogToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load history data on mount
  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch("/api/student/history");
      if (!res.ok) {
        throw new Error("Erro ao buscar histórico de treinos.");
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão ao buscar histórico.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Delete log entry action
  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/student/history?id=${logToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg);
      }

      toast.success("Treino excluído com sucesso do seu histórico! 🗑️");
      setLogToDelete(null);
      // Silent refresh to update the timeline without skeleton flashes
      await loadHistoryData(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Não foi possível remover este treino.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper: Format weight volume
  const formatVolume = (val?: number | null) => {
    if (!val) return "-";
    if (val >= 1000) {
      return `${(val / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k kg`;
    }
    return `${val.toLocaleString("pt-BR")} kg`;
  };

  // Helper: Calculate total volume for a single session log
  const calculateSessionVolume = (log: any) => {
    let vol = 0;
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
            vol += load * rep;
          });
        }
      });
    }
    return vol;
  };

  // Helper: Format completedAt dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Hoje, ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`;
    }
    if (isYesterday) {
      return `Ontem, ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`;
    }
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  };

  // Helper: Get visual indicators for effort levels
  const getEffortBadge = (score?: number | null) => {
    if (!score) return null;
    let color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    let label = "Muito Fácil 😴";

    if (score === 2) {
      color = "bg-blue-500/10 text-blue-400 border-blue-500/20";
      label = "Fácil 😊";
    } else if (score === 3) {
      color = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      label = "Adequado 👍";
    } else if (score === 4) {
      color = "bg-orange-500/10 text-orange-400 border-orange-500/20";
      label = "Difícil ⚡";
    } else if (score === 5) {
      color = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      label = "Muito Difícil 🥵";
    }

    return (
      <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none rounded-full px-2.5 py-0.5", color)}>
        {label}
      </Badge>
    );
  };

  if (loading) {
    return <StudentHistorySkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-16 flex flex-col items-center">
        <AlertTriangle className="size-12 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">Falha ao buscar histórico</h2>
        <p className="text-neutral-400">{error}</p>
        <Button onClick={() => loadHistoryData()} variant="outline" className="gap-2 rounded-xl">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-350 mx-auto pb-24 animate-in fade-in duration-500">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/30 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <HistoryIcon className="size-7 text-primary" /> Histórico de Treinos
          </h1>
          <p className="text-sm text-neutral-400 font-semibold">
            Você completou <span className="text-primary font-black">{stats?.totalWorkoutsYear || 0} treinos</span> este ano. Continue mantendo a consistência!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        <div className="lg:col-span-1 space-y-6">
          <Card className="border p-0 border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/50 dark:bg-neutral-900/30 border-b border-border dark:border-white/4 py-4!">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground dark:text-neutral-450 flex items-center gap-1.5">
                Resumo do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400">Treinos Concluídos</span>
                <span className="text-sm font-black text-foreground">{stats?.totalWorkoutsMonth || 0} / {stats?.monthlyTarget || 16}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400">Tempo de Treino</span>
                <span className="text-sm font-black text-foreground">{stats?.totalHoursMonth || 0}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400">Volume Total Levantado</span>
                <span className="text-sm font-black text-foreground">{formatVolume(stats?.totalVolumeMonth)}</span>
              </div>

              <div className="pt-3 border-t border-border dark:border-white/[0.04]">
                <div className="h-2 w-full bg-muted dark:bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(((stats?.totalWorkoutsMonth || 0) / (stats?.monthlyTarget || 16)) * 100))}%` }}
                  />
                </div>
                <p className="text-[9px] text-center mt-2.5 font-black text-neutral-450 uppercase tracking-wider leading-none">
                  {Math.min(100, Math.round(((stats?.totalWorkoutsMonth || 0) / (stats?.monthlyTarget || 16)) * 100))}% da meta concluída
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-primary text-primary-foreground p-6 space-y-4 shadow-lg shadow-primary/10 rounded-2xl relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 size-24 bg-white/[0.05] rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <TrendingUp className="size-8 opacity-60 text-primary-foreground animate-bounce" />
            <h3 className="text-base font-black uppercase tracking-tight leading-tight">Consistência é a Chave</h3>
            <p className="text-xs text-primary-foreground/90 leading-relaxed font-semibold">
              Treinar de forma frequente acelera seus resultados. Registre todos os pesos e repetições para mapearmos sua progressão de cargas no painel do treinador!
            </p>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-1 flex items-center gap-1.5">
            Atividades Recentes
          </h3>

          {logs.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {logs.map((log) => {
                const sessionVol = calculateSessionVolume(log);
                return (
                  <motion.div key={log.id} variants={item}>
                    <Card className="group border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 hover:border-primary/30 transition-all rounded-2xl overflow-hidden shadow-sm">
                      <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">

                        <div className="flex items-center gap-4 min-w-0">
                          {/* Check Circle Circle */}
                          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <CheckCircle2 className="size-5.5" />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-base truncate max-w-[240px] text-foreground group-hover:text-primary transition-colors">
                                {log.workout?.name || "Treino Realizado"}
                              </h3>
                              {getEffortBadge(log.effortScore)}
                            </div>
                            <p className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5 leading-none">
                              <Calendar className="size-3.5 text-primary" /> {formatDate(log.completedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 md:gap-10 pt-4 md:pt-0 border-t border-border dark:border-white/[0.04] md:border-none">
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase font-black text-muted-foreground dark:text-neutral-400 tracking-wider leading-none">Duração</p>
                            <p className="text-xs font-extrabold flex items-center gap-1.5">
                              <Clock className="size-3.5 text-primary" /> {log.workout?.duration || "60 min"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase font-black text-muted-foreground dark:text-neutral-400 tracking-wider leading-none">Volume</p>
                            <p className="text-xs font-extrabold flex items-center gap-1.5">
                              <Dumbbell className="size-3.5 text-primary" /> {sessionVol > 0 ? formatVolume(sessionVol) : "—"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Detailed Info Button */}
                            <Button
                              onClick={() => setSelectedLog(log)}
                              variant="ghost"
                              size="icon"
                              className="rounded-xl size-10 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                            >
                              <ChevronRight className="size-5 text-neutral-400 group-hover:text-primary transition-colors" />
                            </Button>

                            {/* Delete Log Button */}
                            <Button
                              onClick={() => setLogToDelete(log)}
                              variant="ghost"
                              size="icon"
                              className="rounded-xl size-10 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                            >
                              <Trash2 className="size-4.5" />
                            </Button>
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <Card className="border-dashed border border-border dark:border-white/[0.12] bg-card dark:bg-neutral-950/20 flex flex-col items-center justify-center p-12 text-center rounded-2xl min-h-[300px]">
              <div className="size-12 rounded-full bg-muted dark:bg-neutral-900 flex items-center justify-center mb-4 border border-border dark:border-white/[0.04]">
                <HistoryIcon className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-extrabold text-base mb-1">Nenhum treino no histórico</h3>
              <p className="text-xs text-neutral-400 max-w-[280px] leading-relaxed">
                Você ainda não registrou nenhum treino completo neste workspace. Vá até a seção de treinos para realizar seu primeiro log de atividades!
              </p>
              <Button asChild className="mt-4 rounded-xl font-bold text-xs uppercase tracking-wider h-10 px-6 cursor-pointer shadow-md bg-primary text-primary-foreground hover:bg-primary/95">
                <a href="/student/workouts">Ir Para Meus Treinos</a>
              </Button>
            </Card>
          )}
        </div>

      </div>

      {/* DETAIL DRAWER / SHEET FOR AN INDIVIDUAL LOG */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background dark:bg-neutral-950/98 backdrop-blur-xl border-l border-border dark:border-white/[0.08] p-6 overflow-y-auto flex flex-col">
          {selectedLog && (
            <>
              <SheetHeader className="pb-4 border-b border-border dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase">
                    {selectedLog.workout?.goal || "Treino"}
                  </Badge>
                  {getEffortBadge(selectedLog.effortScore)}
                </div>
                <SheetTitle className="text-lg font-black text-foreground mt-2">
                  {selectedLog.workout?.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="size-3 text-primary" /> Concluído em {new Date(selectedLog.completedAt).toLocaleString("pt-BR")}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 mt-6">

                {/* Effort Notes / Feedback if provided */}
                {selectedLog.feedback && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground dark:text-neutral-450 flex items-center gap-1">
                      <Info className="size-3.5 text-primary" /> Feedback enviado
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted dark:bg-neutral-900/50 p-3 rounded-xl border border-border dark:border-white/[0.03]">
                      "{selectedLog.feedback}"
                    </p>
                  </div>
                )}

                {/* Exercises logged list */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Cargas & Repetições Registradas
                  </h4>

                  {selectedLog.workout?.exercises && selectedLog.workout.exercises.length > 0 ? (
                    <div className="space-y-4">
                      {selectedLog.workout.exercises.map((we: any, idx: number) => {
                        const loads = selectedLog.loads as Record<string, string[]> | null;
                        const reps = selectedLog.reps as Record<string, string[]> | null;
                        const weLoads = loads?.[we.id] || [];
                        const weReps = reps?.[we.id] || [];

                        return (
                          <div key={we.id} className="p-4 rounded-xl border border-border dark:border-white/[0.04] bg-card dark:bg-neutral-950/60 space-y-2.5">
                            <div className="flex justify-between items-start">
                              <span className="font-extrabold text-sm text-foreground flex items-center gap-2 min-w-0">
                                <span className="size-5 rounded-md bg-secondary text-[11px] flex items-center justify-center font-black text-primary shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{we.exercise.name}</span>
                              </span>
                              <span className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 shrink-0">
                                {we.sets} séries
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 pt-1.5 border-t border-border dark:border-white/[0.03]">
                              {Array.from({ length: we.sets }).map((_, setIdx) => {
                                const load = weLoads[setIdx] || "—";
                                const rep = weReps[setIdx] || "—";
                                return (
                                  <div key={setIdx} className="flex justify-between items-center text-xs bg-muted dark:bg-neutral-900/40 p-2.5 rounded-lg border border-border dark:border-white/[0.03]">
                                    <span className="font-bold text-muted-foreground dark:text-neutral-450">Série {setIdx + 1}</span>
                                    <span className="font-extrabold text-foreground">{load} kg</span>
                                    <span className="font-bold text-primary">{rep} reps</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">Estrutura de exercícios não salva neste log.</p>
                  )}
                </div>

              </div>

              <div className="pt-4 border-t border-border dark:border-white/[0.04] mt-6">
                <Button
                  onClick={() => setSelectedLog(null)}
                  className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Voltar ao Histórico
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border border-border dark:border-white/8 bg-background dark:bg-neutral-950/98 backdrop-blur-xl shadow-2xl p-6 max-w-sm">
          <AlertDialogHeader className="space-y-3 flex flex-col items-center text-center">
            <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="size-6 animate-pulse" />
            </div>
            <AlertDialogTitle className="text-lg font-black tracking-tight text-foreground">
              Excluir este treino?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground dark:text-neutral-400">
              Esta ação é irreversível. O treino será apagado do seu histórico e suas estatísticas de consistência e volume mensal serão recalculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex-col sm:flex-row w-full">
            <AlertDialogCancel
              onClick={() => setLogToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl flex-1 border border-border dark:border-white/8 font-bold text-xs uppercase tracking-wider h-11 cursor-pointer w-full"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteLog();
              }}
              disabled={isDeleting}
              className="rounded-xl flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs uppercase tracking-wider h-11 cursor-pointer w-full flex items-center justify-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Excluindo...
                </>
              ) : (
                "Sim, Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function StudentHistorySkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2 border-b border-border dark:border-white/[0.04] pb-4">
        <Skeleton className="h-9 w-64 max-w-full bg-muted dark:bg-neutral-900" />
        <Skeleton className="h-4 w-full max-w-md bg-muted dark:bg-neutral-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar skeleton */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/20 rounded-2xl h-[240px] p-5 space-y-4">
            <Skeleton className="h-4 w-32 bg-muted dark:bg-neutral-900" />
            <Skeleton className="h-10 w-full bg-muted dark:bg-neutral-900" />
            <Skeleton className="h-10 w-full bg-muted dark:bg-neutral-900" />
            <Skeleton className="h-10 w-full bg-muted dark:bg-neutral-900" />
          </Card>
          <Skeleton className="h-44 w-full bg-muted dark:bg-neutral-900 rounded-2xl" />
        </div>

        {/* Timeline skeleton */}
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-4 w-40 bg-muted dark:bg-neutral-900" />
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/20 rounded-2xl h-20 p-5 flex items-center justify-between">
              <div className="flex gap-4">
                <Skeleton className="size-11 rounded-xl bg-muted dark:bg-neutral-900" />
                <div className="space-y-2">
                  <Skeleton className="h-4.5 w-48 bg-muted dark:bg-neutral-900" />
                  <Skeleton className="h-3 w-32 bg-muted dark:bg-neutral-900" />
                </div>
              </div>
              <div className="flex gap-6">
                <Skeleton className="h-8 w-16 bg-muted dark:bg-neutral-900" />
                <Skeleton className="h-8 w-16 bg-muted dark:bg-neutral-900" />
                <Skeleton className="size-10 bg-muted dark:bg-neutral-900 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
