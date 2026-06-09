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
  Check,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Label } from "@/components/ui/label";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { cn } from "@/lib/utils";

export default function NewWorkoutPage() {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [muscleGroupLabel, setMuscleGroupLabel] = useState("");
  const [goal, setGoal] = useState("Hipertrofia");
  const [difficulty, setDifficulty] = useState("Intermediário");
  const [duration, setDuration] = useState("60 min");
  const [restBetweenExercises, setRestBetweenExercises] = useState("2 min");

  // Selected exercises
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);

  // Dialog & exercises loader states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState("");
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [tempSelected, setTempSelected] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
        setSearchQuery("");
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

  // Add exercise selection in dialog
  const handleToggleTempSelected = (exercise: any) => {
    if (tempSelected.some((ex) => ex.id === exercise.id)) {
      setTempSelected((prev) => prev.filter((ex) => ex.id !== exercise.id));
    } else {
      setTempSelected((prev) => [...prev, exercise]);
    }
  };

  // Confirm additions from dialog to workout
  const handleConfirmAddExercises = () => {
    const newExercises = tempSelected.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroup: muscleGroups.find((g) => g.id === selectedMuscleGroupId)?.name || "Geral",
      sets: 4,
      reps: "10",
      rest: "60s",
      load: "",
      isIndividual: false,
      individualSets: Array.from({ length: 4 }, () => ({
        reps: "10",
        load: "",
        rest: "60s",
      })),
    }));

    // Filter duplicates
    const filtered = newExercises.filter(
      (ne) => !selectedExercises.some((se) => se.exerciseId === ne.exerciseId)
    );

    if (filtered.length < newExercises.length) {
      toast.info("Alguns exercícios já haviam sido adicionados e foram ignorados.");
    }

    setSelectedExercises((prev) => [...prev, ...filtered]);
    setTempSelected([]);
    setDialogOpen(false);
    toast.success(`${filtered.length} exercício(s) adicionado(s) com sucesso!`);
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
      prev.map((ex, i) => {
        if (i !== index) return ex;

        const updated = { ...ex, [field]: value };

        // If updating sets, resize the individualSets array accordingly
        if (field === "sets") {
          if (value === "") {
            updated.sets = "";
          } else {
            const parsed = parseInt(value, 10);
            const setsCount = isNaN(parsed) ? 1 : Math.max(1, parsed);
            updated.sets = setsCount;
            const currentSets = ex.individualSets || [];
            
            const repsArr = String(ex.reps).split(",").map(s => s.trim());
            const loadArr = String(ex.load).split(",").map(s => s.trim());
            const restArr = String(ex.rest).split(",").map(s => s.trim());
            const fallbackReps = repsArr[0] || "10";
            const fallbackLoad = loadArr[0] || "";
            const fallbackRest = restArr[0] || "60s";

            updated.individualSets = Array.from({ length: setsCount }, (_, si) => {
              if (currentSets[si]) {
                return {
                  reps: currentSets[si].reps,
                  load: currentSets[si].load,
                  rest: currentSets[si].rest
                };
              }
              const lastSet = currentSets[currentSets.length - 1];
              return {
                reps: lastSet?.reps || fallbackReps,
                load: lastSet?.load || fallbackLoad,
                rest: lastSet?.rest || fallbackRest
              };
            });

            if (updated.isIndividual) {
              updated.reps = updated.individualSets.map((s: any) => s.reps).join(", ");
              updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
              updated.rest = updated.individualSets.map((s: any) => s.rest).join(", ");
            }
          }
        }

        // If not customized individually, keep individualSets elements matched with uniform values
        if (!updated.isIndividual && updated.sets !== "") {
          updated.individualSets = Array.from({ length: Number(updated.sets) || 1 }, () => ({
            reps: updated.reps || "10",
            load: updated.load || "",
            rest: updated.rest || "60s",
          }));
        }

        return updated;
      })
    );
  };

  const handleUpdateIndividualSetField = (exerciseIndex: number, setIndex: number, field: string, value: string) => {
    setSelectedExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;

        const updatedSets = (ex.individualSets || []).map((s: any, si: number) =>
          si === setIndex ? { ...s, [field]: value } : s
        );

        return {
          ...ex,
          individualSets: updatedSets,
          reps: updatedSets.map((s: any) => s.reps).join(", "),
          rest: updatedSets.map((s: any) => s.rest).join(", "),
          load: updatedSets.map((s: any) => s.load).join(", "),
        };
      })
    );
  };

  const handleToggleIndividual = (index: number, checked: boolean) => {
    setSelectedExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;

        const updated = { ...ex, isIndividual: checked };

        if (checked) {
          const repsArr = String(ex.reps).split(",").map((s) => s.trim());
          const restArr = String(ex.rest).split(",").map((s) => s.trim());
          const loadArr = String(ex.load).split(",").map((s) => s.trim());

          updated.individualSets = Array.from({ length: ex.sets }, (_, si) => ({
            reps: repsArr[si] || repsArr[0] || "10",
            rest: restArr[si] || restArr[0] || "60s",
            load: loadArr[si] || loadArr[0] || "",
          }));

          updated.reps = updated.individualSets.map((s: any) => s.reps).join(", ");
          updated.rest = updated.individualSets.map((s: any) => s.rest).join(", ");
          updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
        } else {
          const firstSet = ex.individualSets?.[0] || { reps: "10", rest: "60s", load: "" };
          updated.reps = firstSet.reps;
          updated.rest = firstSet.rest;
          updated.load = firstSet.load;
          updated.individualSets = Array.from({ length: ex.sets }, () => ({
            reps: firstSet.reps,
            rest: firstSet.rest,
            load: firstSet.load,
          }));
        }

        return updated;
      })
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
          restBetweenExercises,
          muscleGroupLabel,
          exercises: selectedExercises.map((ex) => ({
            ...ex,
            sets: Math.max(1, Number(ex.sets) || 1),
          })),
          workspaceId: activeWorkspaceId,
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Nome do Treino</Label>
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

              <div className="space-y-2">
                <Label htmlFor="muscleGroupLabel" className="text-sm font-medium text-foreground">Grupamento Muscular Principal</Label>
                <Input
                  id="muscleGroupLabel"
                  type="text"
                  placeholder="Ex: Peito e Tríceps"
                  value={muscleGroupLabel}
                  onChange={(e) => setMuscleGroupLabel(e.target.value)}
                  className="bg-background/80 border-border h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="goal" className="text-sm font-medium text-foreground mb-0.5">Objetivo / Pra que serve</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="w-full h-11! bg-background border-border">
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
                <Label htmlFor="difficulty" className="text-sm font-medium text-foreground mb-0.5">Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-full h-11! bg-background border-border">
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iniciante">Iniciante</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label htmlFor="duration" className="text-sm font-medium text-foreground mb-0.5">Tempo Estimado</Label>
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

              <div className="space-y-2 flex flex-col">
                <Label htmlFor="restBetweenExercises" className="text-sm font-medium text-foreground mb-0.5">Descanso Exercícios</Label>
                <Input
                  id="restBetweenExercises"
                  type="text"
                  placeholder="Ex: 2 min"
                  value={restBetweenExercises}
                  onChange={(e) => setRestBetweenExercises(e.target.value)}
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
                  <DialogDescription>Selecione um grupamento muscular e selecione os exercícios desejados.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Grupamento Muscular
                    </span>
                    {muscleGroups.length === 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4].map((n) => (
                          <Skeleton key={n} className="h-8 w-16 rounded-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                        {muscleGroups.map((group) => {
                          const isActive = selectedMuscleGroupId === group.id;
                          return (
                            <Button
                              key={group.id}
                              type="button"
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedMuscleGroupId(group.id)}
                              className={cn(
                                "h-8 px-3 rounded-full text-xs font-medium transition-all",
                                isActive
                                  ? "bg-primary text-black hover:bg-primary/90"
                                  : "border-border hover:bg-secondary/40 text-muted-foreground"
                              )}
                            >
                              {group.name}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Exercícios Disponíveis
                    </span>
                    <Input
                      type="text"
                      placeholder="Pesquisar exercício pelo nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 bg-card border-border text-xs mb-2"
                    />
                    <div className="border border-border rounded-lg bg-background max-h-60 overflow-y-auto p-2 space-y-1">
                      {loadingExercises ? (
                        <div className="space-y-1 py-2">
                          {[1, 2, 3, 4].map((n) => (
                            <Skeleton key={n} className="h-9 w-full rounded-md" />
                          ))}
                        </div>
                      ) : availableExercises.filter((ex) =>
                        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 ? (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                          {searchQuery
                            ? "Nenhum exercício corresponde à sua pesquisa."
                            : "Nenhum exercício registrado para este grupo."}
                        </div>
                      ) : (
                        availableExercises
                          .filter((ex) =>
                            ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((exercise) => {
                            const isAdded = selectedExercises.some((ex) => ex.exerciseId === exercise.id);
                            const isChecked = tempSelected.some((ex) => ex.id === exercise.id);
                            return (
                              <button
                                key={exercise.id}
                                type="button"
                                disabled={isAdded}
                                onClick={() => handleToggleTempSelected(exercise)}
                                className={cn(
                                  "w-full text-left p-2.5 rounded-md flex items-center justify-between transition text-sm border",
                                  isAdded
                                    ? "bg-muted/20 border-transparent opacity-60 cursor-not-allowed"
                                    : isChecked
                                    ? "bg-primary/10 border-primary/50 text-primary"
                                    : "bg-transparent border-transparent hover:bg-secondary/40 text-foreground"
                                )}
                              >
                                <span className="font-medium">{exercise.name}</span>
                                <div className="shrink-0 flex items-center justify-center size-5 rounded-md border border-neutral-700 bg-neutral-950">
                                  {(isAdded || isChecked) && (
                                    <Check className={cn("size-3.5", isAdded ? "text-muted-foreground" : "text-primary")} />
                                  )}
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {tempSelected.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                        Exercícios Selecionados ({tempSelected.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {tempSelected.map((ex) => (
                          <Badge
                            key={ex.id}
                            variant="secondary"
                            className="gap-1 px-2.5 py-1 text-xs font-medium bg-secondary text-foreground rounded-full border border-border"
                          >
                            {ex.name}
                            <button
                              type="button"
                              onClick={() => setTempSelected((prev) => prev.filter((item) => item.id !== ex.id))}
                              className="hover:text-destructive text-neutral-500 font-bold ml-1 text-sm"
                            >
                              &times;
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTempSelected([]);
                        setDialogOpen(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmAddExercises}
                      disabled={tempSelected.length === 0}
                      className="gap-1.5"
                    >
                      Confirmar Adição ({tempSelected.length})
                    </Button>
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
                    className="p-4 border border-border rounded-xl bg-background/50 hover:bg-background/80 transition flex flex-col gap-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {!ex.isIndividual && (
                          <div className="grid grid-cols-4 gap-2 shrink-0 w-72">
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
                              <span className="text-[10px] uppercase font-bold text-muted-foreground pl-0.5 flex items-center gap-0.5 select-none">
                                Carga
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="size-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-neutral-900 border border-neutral-800 text-white p-2.5 rounded-xl shadow-xl">
                                      Se não for atribuída uma carga, o próprio aluno que vai colocar quando estiver treinando.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </span>
                              <Input
                                type="text"
                                value={ex.load || ""}
                                onChange={(e) => handleUpdateExerciseField(index, "load", e.target.value)}
                                className="h-9 bg-card border-border w-full text-center"
                                placeholder="Auto"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block pl-0.5">Desc.</span>
                              <Input
                                type="text"
                                value={ex.rest || "60s"}
                                onChange={(e) => handleUpdateExerciseField(index, "rest", e.target.value)}
                                className="h-9 bg-card border-border w-full text-center"
                                placeholder="Ex: 60s"
                              />
                            </div>
                          </div>
                        )}

                        {ex.isIndividual && (
                          <div className="space-y-1 shrink-0 w-24">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                            <Input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => handleUpdateExerciseField(index, "sets", e.target.value)}
                              className="h-9 bg-card border-border w-full text-center"
                              min={1}
                            />
                          </div>
                        )}

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
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <Checkbox
                        id={`individual-${index}`}
                        checked={ex.isIndividual || false}
                        onCheckedChange={(checked) => handleToggleIndividual(index, !!checked)}
                        className="rounded"
                      />
                      <label
                        htmlFor={`individual-${index}`}
                        className="text-xs text-muted-foreground cursor-pointer font-medium select-none"
                      >
                        Configurar séries individualmente
                      </label>
                    </div>

                    {ex.isIndividual && (
                      <div className="mt-2 border-t border-border/40 pt-4 space-y-3">
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                          <div>Série</div>
                          <div>Reps</div>
                          <div className="flex items-center gap-1 select-none">
                            Carga
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="size-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-neutral-900 border border-neutral-800 text-white p-2.5 rounded-xl shadow-xl">
                                  Se não for atribuída uma carga, o próprio aluno que vai colocar quando estiver treinando.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div>Descanso</div>
                        </div>

                        <div className="space-y-2">
                          {Array.from({ length: ex.sets }).map((_, si) => {
                            const setItem = ex.individualSets?.[si] || { reps: "10", load: "", rest: "60s" };
                            return (
                              <div key={si} className="grid grid-cols-4 gap-2 items-center">
                                <span className="text-sm font-semibold text-neutral-400 pl-1">#{si + 1}</span>
                                <Input
                                  type="text"
                                  value={setItem.reps}
                                  onChange={(e) => handleUpdateIndividualSetField(index, si, "reps", e.target.value)}
                                  className="h-9 bg-card border-border text-center text-sm"
                                  placeholder="Ex: 10"
                                />
                                <Input
                                  type="text"
                                  value={setItem.load}
                                  onChange={(e) => handleUpdateIndividualSetField(index, si, "load", e.target.value)}
                                  className="h-9 bg-card border-border text-center text-sm"
                                  placeholder="Auto"
                                />
                                <Input
                                  type="text"
                                  value={setItem.rest}
                                  onChange={(e) => handleUpdateIndividualSetField(index, si, "rest", e.target.value)}
                                  className="h-9 bg-card border-border text-center text-sm"
                                  placeholder="Ex: 60s"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
