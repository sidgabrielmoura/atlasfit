"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Battery,
  Smile,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Wind,
  Loader2,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface Observation {
  id: string;
  date: string;
  text: string;
  workoutName: string;
}

export default function StudentFeedbackPage() {
  const [energy, setEnergy] = useState<number>(80);
  const [fatigue, setFatigue] = useState<number>(40);
  const [humor, setHumor] = useState<number>(80);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasWorkspace, setHasWorkspace] = useState<boolean>(true);

  const [averages, setAverages] = useState({ energy: 0, fatigue: 0, humor: 0 });
  const [recentObservations, setRecentObservations] = useState<Observation[]>([]);
  const [hasSubmittedToday, setHasSubmittedToday] = useState<boolean>(false);

  // Fetch feedback configurations, averages, and observations
  async function fetchFeedbacksData() {
    try {
      const response = await fetch("/api/student/feedbacks");
      if (!response.ok) {
        throw new Error("Falha ao carregar dados do feedback.");
      }
      const data = await response.json();

      setHasWorkspace(data.hasActiveWorkspace);
      if (data.hasActiveWorkspace) {
        setAverages(data.averages);
        setRecentObservations(data.recentObservations);

        if (data.todayFeedback) {
          setEnergy(data.todayFeedback.energy);
          setFatigue(data.todayFeedback.fatigue);
          setHumor(data.todayFeedback.humor);
          setHasSubmittedToday(true);
        } else {
          setHasSubmittedToday(false);
        }
      }
    } catch (error) {
      console.error("Erro no fetch de feedbacks:", error);
      toast.error("Não foi possível carregar o histórico de feedbacks.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchFeedbacksData();
  }, []);

  // Submit feedback
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/student/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy, fatigue, humor }),
      });

      if (!response.ok) {
        const errMsg = await response.text();
        throw new Error(errMsg || "Erro ao registrar feedback.");
      }

      toast.success(
        hasSubmittedToday
          ? "Feedback de hoje atualizado com sucesso!"
          : "Feedback diário registrado com sucesso!"
      );
      setHasSubmittedToday(true);

      // Refresh averages and observations
      await fetchFeedbacksData();
    } catch (error: any) {
      console.error("Erro ao submeter feedback:", error);
      toast.error(error.message || "Ocorreu um erro ao enviar o relatório.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading skeleton state matching the UI layout to avoid layout shift
  if (isLoading) {
    return <StudentFeedbackSkeleton />;
  }

  if (!hasWorkspace) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Sem Workspace Ativo</h1>
        <p className="text-sm text-muted-foreground max-w-md mt-2">
          Você não possui uma inscrição ativa em um workspace de personal trainer no momento.
          Entre em contato com seu treinador para ativar sua conta.
        </p>
        <Button className="mt-6 rounded-xl font-bold" asChild>
          <Link href="/student/profile">Ir para Perfil</Link>
        </Button>
      </div>
    );
  }

  // Dynamic recovery advice and recommendations based on current average values
  const getRecoveryDetails = () => {
    if (averages.energy === 0 && averages.fatigue === 0 && averages.humor === 0) {
      return {
        title: "Primeiro Registro",
        desc: "Faça o reporte diário de hoje para começar a computar a análise de recovery dos últimos 7 dias.",
        type: "info",
        advice: "A consistência nos reportes ajuda o seu personal trainer a calibrar o volume de treino ideal para você."
      };
    }

    if (averages.energy >= 70 && averages.fatigue <= 45) {
      return {
        title: "Estado Ideal de Performance",
        desc: "Sua recuperação média está excelente. Nível de energia alto e fadiga controlada. Pronto para treinar forte!",
        type: "success",
        advice: "Aproveite esta janela ideal para focar em progressão de carga e treinos de alta intensidade programados."
      };
    }

    if (averages.fatigue >= 60) {
      return {
        title: "Fadiga Acumulada Alta",
        desc: "Sua fadiga média de 7 dias está elevada. Seu corpo precisa de atenção extra para evitar lesões.",
        type: "warning",
        advice: "Foque em alongamentos leves, durma mais de 7 horas hoje e considere um treino regenerativo (deload)."
      };
    }

    if (averages.energy <= 50 && averages.humor <= 60) {
      return {
        title: "Disposição e Humor em Baixa",
        desc: "A recuperação psicológica e física indica estresse acumulado ou cansaço sistêmico.",
        type: "caution",
        advice: "Mantenha a hidratação alta, reduza a intensidade geral se necessário e faça uma caminhada leve."
      };
    }

    return {
      title: "Recuperação Equilibrada",
      desc: "Métricas de recuperação dentro da média ideal. Mantenha a rotina e respeite os tempos de descanso.",
      type: "normal",
      advice: "Sessões rápidas de 10 a 15 min de mobilidade ajudam a acelerar a eliminação de toxinas e reduzem a rigidez."
    };
  };

  const recovery = getRecoveryDetails();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reporte de Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Como está seu corpo hoje? Registre sua recuperação para que seu personal otimize suas cargas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit}>
            <Card className="border-border/50 bg-card shadow-sm">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-base font-bold">Registro Diário</CardTitle>
                  <CardDescription className="text-xs">
                    Avalie seu estado para calibração personalizada de treinos.
                  </CardDescription>
                </div>
                {hasSubmittedToday && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    Respondido Hoje
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-8 pb-8">
                {/* Energia Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        <Zap className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Disposição & Energia</p>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          Nível de energia geral e prontidão física
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-amber-500">{energy}%</span>
                  </div>
                  <Slider
                    value={[energy]}
                    onValueChange={(val) => setEnergy(val[0])}
                    min={0}
                    max={100}
                    step={5}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>Esgotado</span>
                    <span>Moderado</span>
                    <span>Excelente</span>
                  </div>
                </div>

                {/* Fadiga Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <Battery className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Fadiga Muscular</p>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          Cansaço acumulado e dores musculares
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-red-500">{fatigue}%</span>
                  </div>
                  <Slider
                    value={[fatigue]}
                    onValueChange={(val) => setFatigue(val[0])}
                    min={0}
                    max={100}
                    step={5}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>Sem Fadiga</span>
                    <span>Normal / Tensa</span>
                    <span>Extrema</span>
                  </div>
                </div>

                {/* Humor Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Smile className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Estado Psicológico & Humor</p>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          Nível de estresse, ânimo e bem-estar geral
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-indigo-500">{humor}%</span>
                  </div>
                  <Slider
                    value={[humor]}
                    onValueChange={(val) => setHumor(val[0])}
                    min={0}
                    max={100}
                    step={5}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>Estressado / Apático</span>
                    <span>Estável</span>
                    <span>Ótimo / Motivado</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-10! py-3 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        SALVANDO...
                      </span>
                    ) : hasSubmittedToday ? (
                      "RE-ENVIAR AVALIAÇÃO DE HOJE"
                    ) : (
                      "ENVIAR RELATÓRIO HOJE"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10! py-3 rounded-xl font-bold border-border/60"
                    disabled={isSubmitting}
                    asChild
                  >
                    <Link href="/student/history">VER HISTÓRICO DE TREINOS</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Recents Analyses / Statistics */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
              Médias & Análises Recentes (7d)
            </h3>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Media cards */}
              <motion.div variants={item}>
                <Card className="bg-card/50 border-border/40 p-4 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Energia Média
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-amber-500">
                      {averages.energy}%
                    </span>
                    <Zap className="size-4 text-amber-500/60 shrink-0" />
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card className="bg-card/50 border-border/40 p-4 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Fadiga Média
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-red-500">
                      {averages.fatigue}%
                    </span>
                    <Battery className="size-4 text-red-500/60 shrink-0" />
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card className="bg-card/50 border-border/40 p-4 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Humor Médio
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-indigo-500">
                      {averages.humor}%
                    </span>
                    <Smile className="size-4 text-indigo-500/60 shrink-0" />
                  </div>
                </Card>
              </motion.div>
            </motion.div>

            {/* Dynamic Diagnosis Block */}
            <motion.div
              variants={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2"
            >
              <Card
                className={cn(
                  "p-5 flex gap-4 border shadow-xs",
                  recovery.type === "success" && "bg-emerald-500/5 border-emerald-500/20",
                  recovery.type === "warning" && "bg-red-500/5 border-red-500/20",
                  recovery.type === "caution" && "bg-amber-500/5 border-amber-500/20",
                  recovery.type === "info" && "bg-secondary/20 border-border/40",
                  recovery.type === "normal" && "bg-indigo-500/5 border-indigo-500/20"
                )}
              >
                <div
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0",
                    recovery.type === "success" && "bg-emerald-500/10 text-emerald-500",
                    recovery.type === "warning" && "bg-red-500/10 text-red-500",
                    recovery.type === "caution" && "bg-amber-500/10 text-amber-500",
                    recovery.type === "info" && "bg-secondary/40 text-primary",
                    recovery.type === "normal" && "bg-indigo-500/10 text-indigo-500"
                  )}
                >
                  {recovery.type === "success" || recovery.type === "normal" ? (
                    <TrendingUp className="size-5" />
                  ) : (
                    <AlertCircle className="size-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">{recovery.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {recovery.desc}
                  </p>
                </div>
              </Card>
            </motion.div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Recent Comments Timeline */}
          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MessageSquare className="size-4" />
                Comentários nos Treinos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentObservations.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-xl bg-secondary/5">
                  Nenhum comentário enviado nos treinos finalizados.
                </div>
              ) : (
                recentObservations.map((obs) => (
                  <div key={obs.id} className="space-y-2 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="p-3 bg-secondary/15 rounded-xl border border-border/20 text-xs text-muted-foreground leading-relaxed font-medium italic">
                      "{obs.text}"
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold px-1">
                      <span className="uppercase tracking-wider text-primary/80">
                        {obs.workoutName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground/60" />
                        {new Date(obs.date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recovery Tips Block */}
          <Card className="border-none bg-primary text-primary-foreground p-6 space-y-4 shadow-lg shadow-primary/20 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
              <Wind className="size-48" />
            </div>
            <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Wind className="size-5" />
            </div>
            <h3 className="text-lg font-bold leading-tight">Dica de Recovery</h3>
            <p className="text-xs text-primary-foreground/95 leading-relaxed font-medium">
              {recovery.advice}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentFeedbackSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card p-6 space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>

            {/* Energia Slider Skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>

            {/* Fadiga Slider Skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>

            {/* Humor Slider Skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
          </Card>

          {/* Statistics Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-44 px-1" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                </Card>
              ))}
            </div>
            <Card className="p-5 flex gap-4">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar Widgets Skeleton */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-4 w-36" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </Card>

          <Card className="p-6 space-y-4">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
