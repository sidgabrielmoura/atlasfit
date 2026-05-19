"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Edit2,
  Dumbbell,
  Clock,
  Activity,
  Flame,
  Gauge,
  Loader2,
  Copy,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface WorkoutDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkoutDetailsPage({ params }: WorkoutDetailsPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/personal/workouts/${id}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar detalhes do treino.");
      }
      const data = await res.json();
      setWorkout(data);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar os detalhes do treino.");
      router.push("/personal/workouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutDetails();
  }, [id]);

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/personal/workouts/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Erro ao duplicar.");
      }
      toast.success("Treino duplicado com sucesso!");
      router.push("/personal/workouts");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao duplicar treino.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este modelo de treino?")) {
      return;
    }
    try {
      const res = await fetch(`/api/personal/workouts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Erro ao excluir.");
      }
      toast.success("Modelo de treino excluído!");
      router.push("/personal/workouts");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao excluir treino.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando detalhes do treino...</p>
      </div>
    );
  }

  if (!workout) return null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      {/* Top Navigation / Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/personal/workouts">
            <ChevronLeft className="size-4.5" /> Voltar para treinos
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleDuplicate}>
            <Copy className="size-4" /> Duplicar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-primary hover:bg-primary/10" asChild>
            <Link href={`/personal/workouts/${id}/edit`}>
              <Edit2 className="size-4" /> Editar
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="size-4" /> Excluir
          </Button>
        </div>
      </div>

      {/* Main Premium Card */}
      <Card className="border border-border/80 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-purple-600 w-full" />
        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight leading-tight">{workout.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-none px-3 py-1 font-semibold">
                  {workout.goal}
                </Badge>
                <Badge variant="outline" className="border-border px-3 py-1 text-muted-foreground">
                  {workout.difficulty}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm bg-secondary/20 p-3.5 rounded-xl border border-border/50 shrink-0 self-start md:self-auto">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="size-4.5 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Tempo Estimado</span>
                  <span className="font-semibold text-foreground">{workout.duration}</span>
                </div>
              </div>

              <div className="w-px h-8 bg-border/60" />

              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="size-4.5 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Exercícios</span>
                  <span className="font-semibold text-foreground">{workout.exercises?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prescribed Exercises List */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Flame className="size-5 text-primary" /> Prescrição de Exercícios
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {(workout.exercises || []).map((we: any, index: number) => (
                <div
                  key={we.id}
                  className="p-4 rounded-xl border border-border/50 bg-background/40 hover:bg-background/80 hover:border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-lg bg-secondary/80 flex items-center justify-center shrink-0 border border-border font-bold text-sm text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-base text-foreground leading-tight truncate">
                        {we.exercise.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Activity className="size-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">
                          {we.exercise.muscleGroup?.name || "Geral"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Workout Info Badges */}
                  <div className="flex items-center gap-4 bg-secondary/20 p-2.5 px-4 rounded-xl border border-border/40 shrink-0 self-end sm:self-auto">
                    <div className="text-center min-w-14">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Séries</span>
                      <span className="font-semibold text-sm text-foreground">{we.sets}</span>
                    </div>
                    <div className="w-px h-6 bg-border/40" />
                    <div className="text-center min-w-14">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Repetições</span>
                      <span className="font-semibold text-sm text-foreground">{we.reps}</span>
                    </div>
                    <div className="w-px h-6 bg-border/40" />
                    <div className="text-center min-w-14">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Descanso</span>
                      <span className="font-semibold text-sm text-foreground">{we.rest}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
