"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  Clock,
  Activity,
  Loader2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewWorkoutPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("Hipertrofia");
  const [difficulty, setDifficulty] = useState("Intermediário");
  const [duration, setDuration] = useState("60 min");

  // Selected exercises
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);

  // Dialog & exercises loader states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState("");
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Fetch muscle groups when opening dialog
  const handleOpenDialog = async () => {
    setDialogOpen(true);
    if (muscleGroups.length > 0) return;
    try {
      const res = await fetch("/api/personal/workouts/muscle-groups");
      if (res.ok) {
        const data = await res.json();
        setMuscleGroups(data);
        if (data.length > 0) {
          setSelectedMuscleGroupId(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar grupamentos musculares.");
    }
  };

  // Load exercises when muscle group selection changes
  useEffect(() => {
    if (!selectedMuscleGroupId) return;

    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const res = await fetch(`/api/personal/workouts/exercises?muscleGroupId=${selectedMuscleGroupId}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableExercises(data);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar exercícios.");
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, [selectedMuscleGroupId]);

  // Add exercise to workout
  const handleAddExercise = (exercise: any) => {
    // Check if already added
    if (selectedExercises.some((ex) => ex.exerciseId === exercise.id)) {
      toast.info("Este exercício já foi adicionado ao treino.");
      return;
    }

    setSelectedExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: muscleGroups.find((g) => g.id === selectedMuscleGroupId)?.name || "Geral",
        sets: 4,
        reps: "10",
        rest: "60s",
      },
    ]);

    toast.success(`${exercise.name} adicionado!`);
    setDialogOpen(false);
  };

  // Remove exercise from workout
  const handleRemoveExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  // Reorder exercises
  const moveExercise = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === selectedExercises.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newList = [...selectedExercises];
    const temp = newList[index];
    newList[index] = newList[newIndex];
    newList[newIndex] = temp;

    setSelectedExercises(newList);
  };

  const handleUpdateExerciseField = (index: number, field: string, value: any) => {
    setSelectedExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  // Create Workout submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor, informe o nome do treino.");
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error("Por favor, adicione pelo menos um exercício ao treino.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/personal/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          difficulty,
          duration,
          exercises: selectedExercises,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao criar treino.");
      }

      toast.success("Modelo de treino criado com sucesso!");
      router.push("/personal/workouts");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Falha ao criar o treino. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <Link href="/personal/workouts">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Criar Modelo de Treino</h2>
          <p className="text-muted-foreground mt-0.5">Monte um novo modelo de treino estruturado para seus alunos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Informações Gerais</CardTitle>
            <CardDescription>Defina os dados fundamentais para identificar e organizar este treino.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">Nome do Treino</label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Treino A — Peitorais & Tríceps"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background/80 border-border h-11"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 flex flex-col">
                <label htmlFor="goal" className="text-sm font-medium text-foreground mb-0.5">Objetivo / Pra que serve</label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="w-full h-11 bg-background border-border">
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="Força">Força</SelectItem>
                    <SelectItem value="Resistência">Resistência</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                <label htmlFor="difficulty" className="text-sm font-medium text-foreground mb-0.5">Dificuldade</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-full h-11 bg-background border-border">
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iniciante">Iniciante</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium text-foreground">Tempo Estimado</label>
                <Input
                  id="duration"
                  type="text"
                  placeholder="Ex: 60 min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="bg-background/80 border-border h-11"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercícios */}
        <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
            <div>
              <CardTitle className="text-lg">Exercícios Prescritos</CardTitle>
              <CardDescription>Adicione e configure a lista de exercícios deste modelo.</CardDescription>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" onClick={handleOpenDialog} size="sm" className="gap-1.5 h-9">
                  <Plus className="size-4" /> Adicionar Exercício
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95%] rounded-xl">
                <DialogHeader>
                  <DialogTitle>Pesquisar Exercício</DialogTitle>
                  <DialogDescription>Selecione um grupamento muscular para ver a biblioteca de exercícios ativa.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label htmlFor="muscleGroupSelect" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Grupamento Muscular
                    </label>
                    {muscleGroups.length === 0 ? (
                      <div className="h-10 flex items-center justify-center border border-border rounded-md bg-secondary/10">
                        <Loader2 className="size-4 animate-spin text-primary mr-2" />
                        <span className="text-xs text-muted-foreground">Carregando grupos...</span>
                      </div>
                    ) : (
                      <Select value={selectedMuscleGroupId} onValueChange={setSelectedMuscleGroupId}>
                        <SelectTrigger className="w-full h-11 bg-background border-border">
                          <SelectValue placeholder="Selecione um grupamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {muscleGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Exercícios Disponíveis
                    </span>
                    <div className="border border-border rounded-lg bg-background max-h-60 overflow-y-auto p-2 space-y-1">
                      {loadingExercises ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="size-6 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Buscando exercícios...</span>
                        </div>
                      ) : availableExercises.length === 0 ? (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                          Nenhum exercício registrado para este grupo.
                        </div>
                      ) : (
                        availableExercises.map((exercise) => (
                          <button
                            key={exercise.id}
                            type="button"
                            onClick={() => handleAddExercise(exercise)}
                            className="w-full text-left p-2.5 rounded-md hover:bg-secondary/40 active:bg-secondary/60 flex items-center justify-between group transition text-sm"
                          >
                            <span className="font-medium">{exercise.name}</span>
                            <Plus className="size-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedExercises.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-xl bg-secondary/15 flex flex-col items-center justify-center gap-2">
                <Dumbbell className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground font-medium">Nenhum exercício adicionado ainda.</p>
                <Button type="button" onClick={handleOpenDialog} variant="outline" size="sm" className="mt-2 text-xs">
                  Procurar na Biblioteca
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedExercises.map((ex, index) => (
                  <div
                    key={index}
                    className="p-4 border border-border rounded-xl bg-background/50 hover:bg-background/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start md:items-center gap-3 min-w-0">
                      <div className="size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border">
                        <Activity className="size-4.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">{ex.name}</h4>
                        <Badge variant="secondary" className="text-[10px] mt-1 bg-secondary/80 text-muted-foreground">
                          {ex.muscleGroup}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 shrink-0 md:max-w-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                        <Input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleUpdateExerciseField(index, "sets", e.target.value)}
                          className="h-9 bg-card border-border w-full text-center"
                          min={1}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block pl-0.5">Reps</span>
                        <Input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => handleUpdateExerciseField(index, "reps", e.target.value)}
                          className="h-9 bg-card border-border w-full text-center"
                          placeholder="Ex: 10"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block pl-0.5">Descanso</span>
                        <Input
                          type="text"
                          value={ex.rest}
                          onChange={(e) => handleUpdateExerciseField(index, "rest", e.target.value)}
                          className="h-9 bg-card border-border w-full text-center"
                          placeholder="Ex: 60s"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveExercise(index, "up")}
                        disabled={index === 0}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveExercise(index, "down")}
                        disabled={index === selectedExercises.length - 1}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExercise(index)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botoes de Acao */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" type="button" className="h-11 px-6" asChild>
            <Link href="/personal/workouts">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="h-11 px-8 min-w-36 gap-2">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Check className="size-4.5" /> Criar Treino
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
