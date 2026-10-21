"use client";

import { useState, useEffect, use } from "react";
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
  Info,
  Play
} from "lucide-react";
import { ExercisePreviewModal } from "@/components/application/exercise-preview-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RestTimeInput } from "@/components/application/RestTimeInput";
import { WorkoutDurationSelect } from "@/components/application/WorkoutDurationSelect";
import { CreateCustomExerciseDialog } from "@/components/workouts/create-custom-exercise-dialog";

interface GymEditWorkoutPageProps {
  params: Promise<{ id: string }>;
}

export default function GymEditWorkoutPage({ params }: GymEditWorkoutPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [muscleGroupLabel, setMuscleGroupLabel] = useState("");
  const [goal, setGoal] = useState("Hipertrofia");
  const [difficulty, setDifficulty] = useState("Intermediário");
  const [duration, setDuration] = useState("60 min");
  const [restBetweenExercises, setRestBetweenExercises] = useState("02:00");
  const [allowRepsModification, setAllowRepsModification] = useState(true);
  const [allowCompleteView, setAllowCompleteView] = useState(false);
  const [allowSkipExercises, setAllowSkipExercises] = useState(false);

  // Exercise Preview State
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Selected exercises
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);

  // Advanced methods states
  const [workoutGroups, setWorkoutGroups] = useState<any[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

  // Group Dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupType, setGroupType] = useState<"BISET" | "TRISET" | "CIRCUIT">("BISET");
  const [circuitRounds, setCircuitRounds] = useState(3);
  const [circuitRest, setCircuitRest] = useState(60);

  // Method Dialog per exercise
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const [activeMethodType, setActiveMethodType] = useState<"NONE" | "DROPSET" | "REST_PAUSE">("NONE");

  // Dropset specific
  const [dropsCount, setDropsCount] = useState(2);
  const [dropsReduction, setDropsReduction] = useState(20);

  // Rest pause specific
  const [restPauseTime, setRestPauseTime] = useState(15);
  const [restPauseRounds, setRestPauseRounds] = useState(2);

  // Dialog & exercises loader states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState("");
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [tempSelected, setTempSelected] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateCustomOpen, setIsCreateCustomOpen] = useState(false);

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/gym/workouts/${id}`);
        if (!res.ok) {
          throw new Error("Erro ao carregar treino.");
        }
        const data = await res.json();

        setName(data.name || "");
        setMuscleGroupLabel(data.muscleGroupLabel || "");
        setGoal(data.goal || "Hipertrofia");
        setDifficulty(data.difficulty || "Intermediário");
        setDuration(data.duration || "60 min");
        setRestBetweenExercises(data.restBetweenExercises || "02:00");
        setAllowRepsModification(data.allowRepsModification ?? true);
        setAllowCompleteView(data.allowCompleteView ?? false);
        setAllowSkipExercises(data.allowSkipExercises ?? false);

        if (data.exerciseGroups && data.exerciseGroups.length > 0) {
          setWorkoutGroups(
            data.exerciseGroups.map((g: any) => ({
              id: g.id,
              type: g.type,
              config: g.config,
            }))
          );
        }

        if (data.exercises && data.exercises.length > 0) {
          const loadedExercises = data.exercises.map((we: any) => {
            const repsArr = String(we.reps || "").split(",").map((s: string) => s.trim());
            const loadArr = String(we.load || "").split(",").map((s: string) => s.trim());
            const restArr = String(we.rest || "").split(",").map((s: string) => s.trim());

            const isMultiValued = repsArr.length > 1 || loadArr.length > 1 || restArr.length > 1;

            const individualSets = Array.from({ length: we.sets || 4 }, (_, si) => ({
              reps: repsArr[si] || repsArr[0] || "10",
              load: loadArr[si] || loadArr[0] || "",
              rest: restArr[si] || restArr[0] || "01:00",
            }));

            return {
              exerciseId: we.exerciseId,
              name: we.exercise?.name || "Exercício",
              videoUrl: we.exercise?.videoUrl || null,
              muscleGroup: we.exercise?.muscleGroup?.name || "Geral",
              sets: we.sets || 4,
              reps: we.reps || "10",
              load: we.load || "",
              rest: we.rest || "01:00",
              description: we.description || "",
              groupId: we.groupId || null,
              methodType: we.methodType || "NONE",
              methodConfig: we.methodConfig || null,
              isIndividual: isMultiValued,
              individualSets,
              allowRepsModification: we.allowRepsModification,
            };
          });
          setSelectedExercises(loadedExercises);
        }
      } catch (err) {
        console.error(err);
        toast.error("Falha ao carregar treino para edição.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [id]);

  const getGroupLabel = (groupId: string) => {
    const group = workoutGroups.find((g) => g.id === groupId);
    if (!group) return "";
    const groupIndex = workoutGroups.findIndex((g) => g.id === groupId);
    const letter = String.fromCharCode(65 + groupIndex);
    const typeLabel = group.type === "BISET" ? "Biset" : group.type === "TRISET" ? "Triset" : "Circuito";
    return `${typeLabel} ${letter}`;
  };

  const handleOpenMethodDialog = (index: number) => {
    const ex = selectedExercises[index];
    setActiveExerciseIndex(index);
    setActiveMethodType(ex.methodType || "NONE");
    if (ex.methodType === "DROPSET") {
      setDropsCount(ex.methodConfig?.drops || 2);
      setDropsReduction(ex.methodConfig?.reduction || 20);
    } else if (ex.methodType === "REST_PAUSE") {
      setRestPauseTime(ex.methodConfig?.pause || 15);
      setRestPauseRounds(ex.methodConfig?.rounds || 2);
    } else {
      setDropsCount(2);
      setDropsReduction(20);
      setRestPauseTime(15);
      setRestPauseRounds(2);
    }
    setMethodDialogOpen(true);
  };

  const handleSaveMethod = () => {
    if (activeExerciseIndex === null) return;

    setSelectedExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== activeExerciseIndex) return ex;

        let config = null;
        if (activeMethodType === "DROPSET") {
          config = { drops: Number(dropsCount), reduction: Number(dropsReduction) };
        } else if (activeMethodType === "REST_PAUSE") {
          config = { pause: Number(restPauseTime), rounds: Number(restPauseRounds) };
        }

        return {
          ...ex,
          methodType: activeMethodType,
          methodConfig: config,
        };
      })
    );

    setMethodDialogOpen(false);
    setActiveExerciseIndex(null);
    toast.success("Método configurado com sucesso!");
  };

  const handleOpenGroupDialog = () => {
    if (selectedIndexes.length < 2) {
      toast.error("Selecione pelo menos 2 exercícios para agrupar.");
      return;
    }

    if (selectedIndexes.length >= 3) {
      setGroupType("TRISET");
    } else {
      setGroupType("BISET");
    }

    setGroupDialogOpen(true);
  };

  const handleConfirmGrouping = () => {
    const minRequired = groupType === "TRISET" ? 3 : 2;
    if (selectedIndexes.length < minRequired) {
      toast.error(`O método ${groupType} exige pelo menos ${minRequired} exercícios.`);
      return;
    }

    const tempGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: tempGroupId,
      type: groupType,
      config: groupType === "CIRCUIT" ? { rounds: Number(circuitRounds), restBetweenRounds: Number(circuitRest) } : null,
    };

    setWorkoutGroups((prev) => [...prev, newGroup]);
    setSelectedExercises((prev) =>
      prev.map((ex, idx) => {
        if (selectedIndexes.includes(idx)) {
          return { ...ex, groupId: tempGroupId };
        }
        return ex;
      })
    );

    setSelectedIndexes([]);
    setSelectMode(false);
    setGroupDialogOpen(false);
    toast.success("Exercícios agrupados com sucesso!");
  };

  const handleUngroup = (groupId: string) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.groupId === groupId) {
          const { groupId: _, ...rest } = ex;
          return rest;
        }
        return ex;
      })
    );
    setWorkoutGroups((prev) => prev.filter((g) => g.id !== groupId));
    toast.success("Exercícios desagrupados!");
  };

  const handleOpenDialog = async () => {
    setDialogOpen(true);
    if (muscleGroups.length > 0) return;
    try {
      const res = await fetch("/api/gym/workouts/muscle-groups");
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

  useEffect(() => {
    if (!selectedMuscleGroupId) return;

    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        setSearchQuery("");
        const res = await fetch(`/api/gym/workouts/exercises?muscleGroupId=${selectedMuscleGroupId}`);
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

  const handleToggleTempSelected = (exercise: any) => {
    if (tempSelected.some((ex) => ex.id === exercise.id)) {
      setTempSelected((prev) => prev.filter((ex) => ex.id !== exercise.id));
    } else {
      setTempSelected((prev) => [...prev, exercise]);
    }
  };

  const handleConfirmAddExercises = () => {
    const newExercises = tempSelected.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      videoUrl: exercise.videoUrl,
      muscleGroup: muscleGroups.find((g) => g.id === selectedMuscleGroupId)?.name || "Geral",
      sets: 4,
      reps: "10",
      rest: "01:00",
      load: "",
      isIndividual: false,
      individualSets: Array.from({ length: 4 }, () => ({
        reps: "10",
        load: "",
        rest: "01:00",
      })),
      allowRepsModification: null,
    }));

    const filtered = newExercises.filter(
      (ne) => !selectedExercises.some((se) => se.exerciseId === ne.exerciseId)
    );

    setSelectedExercises((prev) => [...prev, ...filtered]);
    setTempSelected([]);
    setDialogOpen(false);
    toast.success(`${filtered.length} exercício(s) adicionado(s) com sucesso!`);
  };

  const handleRemoveExercise = (index: number) => {
    const removedEx = selectedExercises[index];
    const newList = selectedExercises.filter((_, i) => i !== index);

    if (removedEx.groupId) {
      const remainingInGroup = newList.filter((ex) => ex.groupId === removedEx.groupId);
      const group = workoutGroups.find((g) => g.id === removedEx.groupId);
      const minRequired = group?.type === "TRISET" ? 3 : 2;
      if (remainingInGroup.length < minRequired) {
        setWorkoutGroups((prev) => prev.filter((g) => g.id !== removedEx.groupId));
        newList.forEach((ex) => {
          if (ex.groupId === removedEx.groupId) {
            delete ex.groupId;
          }
        });
      }
    }
    setSelectedExercises(newList);
  };

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
        const isBodyweight = String(ex.load || "").toLowerCase().includes("p.c");

        if (field === "sets") {
          if (value === "") {
            updated.sets = "";
          } else {
            const parsed = parseInt(value, 10);
            const setsCount = isNaN(parsed) ? 1 : Math.max(1, parsed);
            updated.sets = setsCount;
            const currentSets = ex.individualSets || [];

            const repsArr = String(ex.reps).split(",").map((s) => s.trim());
            const loadArr = String(ex.load).split(",").map((s) => s.trim());
            const restArr = String(ex.rest).split(",").map((s) => s.trim());
            const fallbackReps = repsArr[0] || "10";
            const fallbackLoad = isBodyweight ? "p.c." : loadArr[0] || "";
            const fallbackRest = restArr[0] || "01:00";

            updated.individualSets = Array.from({ length: setsCount }, (_, si) => {
              if (currentSets[si]) {
                return {
                  reps: currentSets[si].reps,
                  load: currentSets[si].load,
                  rest: currentSets[si].rest,
                };
              }
              const lastSet = currentSets[currentSets.length - 1];
              return {
                reps: lastSet?.reps || fallbackReps,
                load: lastSet?.load || fallbackLoad,
                rest: lastSet?.rest || fallbackRest,
              };
            });

            if (updated.isIndividual) {
              updated.reps = updated.individualSets.map((s: any) => s.reps).join(", ");
              updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
              updated.rest = updated.individualSets.map((s: any) => s.rest).join(", ");
            }
          }
        }

        if (!updated.isIndividual && updated.sets !== "") {
          updated.individualSets = Array.from({ length: Number(updated.sets) || 1 }, () => ({
            reps: updated.reps || "10",
            load: isBodyweight ? "p.c." : updated.load || "",
            rest: updated.rest || "01:00",
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
        const isBodyweight = String(ex.load || "").toLowerCase().includes("p.c");

        if (checked) {
          const repsArr = String(ex.reps).split(",").map((s) => s.trim());
          const restArr = String(ex.rest).split(",").map((s) => s.trim());
          const loadArr = String(ex.load).split(",").map((s) => s.trim());

          updated.individualSets = Array.from({ length: ex.sets }, (_, si) => ({
            reps: repsArr[si] || repsArr[0] || "10",
            rest: restArr[si] || restArr[0] || "60s",
            load: isBodyweight ? "p.c." : loadArr[si] || loadArr[0] || "",
          }));

          updated.reps = updated.individualSets.map((s: any) => s.reps).join(", ");
          updated.rest = updated.individualSets.map((s: any) => s.rest).join(", ");
          updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
        } else {
          const firstSet = ex.individualSets?.[0] || { reps: "10", rest: "60s", load: isBodyweight ? "p.c." : "" };
          const finalLoad = isBodyweight ? "p.c." : firstSet.load;
          updated.reps = firstSet.reps;
          updated.rest = firstSet.rest;
          updated.load = finalLoad;
          updated.individualSets = Array.from({ length: ex.sets }, () => ({
            reps: firstSet.reps,
            rest: firstSet.rest,
            load: finalLoad,
          }));
        }

        return updated;
      })
    );
  };

  const handleToggleBodyweight = (index: number, checked: boolean) => {
    setSelectedExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;

        const loadVal = checked ? "p.c." : "";
        const updated = { ...ex };

        if (ex.isIndividual) {
          updated.individualSets = (ex.individualSets || []).map((s: any) => ({
            ...s,
            load: loadVal,
          }));
          updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
        } else {
          updated.load = loadVal;
          updated.individualSets = Array.from({ length: Number(ex.sets) || 1 }, () => ({
            reps: ex.reps || "10",
            rest: ex.rest || "60s",
            load: loadVal,
          }));
        }

        return updated;
      })
    );
  };

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
      const res = await fetch(`/api/gym/workouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          difficulty,
          duration,
          restBetweenExercises,
          muscleGroupLabel,
          allowRepsModification,
          allowCompleteView,
          allowSkipExercises,
          exercises: selectedExercises.map((ex) => ({
            ...ex,
            sets: Math.max(1, Number(ex.sets) || 1),
            methodType: ex.methodType || "NONE",
            methodConfig: ex.methodConfig || null,
            groupId: ex.groupId || null,
            allowRepsModification: ex.allowRepsModification,
          })),
          groups: workoutGroups.map((g) => ({
            id: g.id,
            type: g.type,
            config: g.config,
          })),
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao atualizar treino.");
      }

      toast.success("Modelo de treino atualizado com sucesso!");
      router.push("/gym/workouts");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Falha ao atualizar o treino.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-400 mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-400 mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
          <Link href={`/gym/workouts/${id}`}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Modelo de Treino</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Atualize as informações e exercícios deste modelo da academia.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-lg">Informações Gerais</CardTitle>
            <CardDescription>Defina os dados fundamentais para identificar e organizar este treino.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Nome do Treino</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Treino A — Peitorais & Tríceps"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/80 border-border h-11 text-sm"
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
                  className="bg-background/80 border-border h-11 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="goal" className="text-xs font-medium text-foreground">Objetivo</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="w-full h-10 bg-background border-border text-sm">
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="Força">Força</SelectItem>
                    <SelectItem value="Resistência">Resistência</SelectItem>
                    <SelectItem value="Condicionamento">Condicionamento</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="difficulty" className="text-xs font-medium text-foreground">Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-full h-10 bg-background border-border text-sm">
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iniciante">Iniciante</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="duration" className="text-xs font-medium text-foreground">Tempo Estimado</Label>
                <WorkoutDurationSelect
                  id="duration"
                  value={duration}
                  onValueChange={setDuration}
                  className="bg-background/80 border-border h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="restBetweenExercises" className="text-xs font-medium text-foreground">Descanso Exercícios</Label>
                <RestTimeInput
                  value={restBetweenExercises}
                  onChange={setRestBetweenExercises}
                  className="h-10"
                />
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-4">
              <h4 className="text-sm font-bold text-foreground">Regras e Configurações Gerais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background/40">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="allowRepsModification">Permitir Aluno Modificar Repetições</Label>
                    <p className="text-[10px] text-muted-foreground leading-normal">Permite que o aluno altere o número de repetições prescrito durante a execução do treino.</p>
                  </div>
                  <Checkbox
                    id="allowRepsModification"
                    checked={allowRepsModification}
                    onCheckedChange={(checked) => setAllowRepsModification(!!checked)}
                    className="size-5 rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background/40">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="allowCompleteView">Permitir Visão Completa do Treino</Label>
                    <p className="text-[10px] text-muted-foreground leading-normal">Exibe a lista vertical de todos os exercícios para o aluno em vez de apenas o fluxo passo a passo.</p>
                  </div>
                  <Checkbox
                    id="allowCompleteView"
                    checked={allowCompleteView}
                    onCheckedChange={(checked) => setAllowCompleteView(!!checked)}
                    className="size-5 rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background/40">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="allowSkipExercises">Permitir Aluno Pular Exercícios</Label>
                    <p className="text-[10px] text-muted-foreground leading-normal">Permite que o aluno pule exercícios mediante justificativa.</p>
                  </div>
                  <Checkbox
                    id="allowSkipExercises"
                    checked={allowSkipExercises}
                    onCheckedChange={(checked) => setAllowSkipExercises(!!checked)}
                    className="size-5 rounded-md"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4 gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">Exercícios Prescritos</CardTitle>
              <CardDescription>Adicione e configure a lista de exercícios deste modelo.</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {selectedExercises.length >= 2 && (
                <Button
                  type="button"
                  variant={selectMode ? "default" : "outline"}
                  onClick={() => {
                    setSelectMode(!selectMode);
                    setSelectedIndexes([]);
                  }}
                  size="sm"
                  className="h-9 text-xs flex-1 sm:flex-initial"
                >
                  {selectMode ? "Cancelar Seleção" : "Selecionar Exercícios"}
                </Button>
              )}

              {selectMode && selectedIndexes.length >= 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenGroupDialog}
                  size="sm"
                  className="h-9 text-xs border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 gap-1 flex-1 sm:flex-initial"
                >
                  Agrupar ({selectedIndexes.length})
                </Button>
              )}

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" onClick={handleOpenDialog} size="sm" className="gap-1.5 h-9 flex-1 sm:flex-initial">
                    <Plus className="size-4" /> Adicionar Exercício
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[95%] overflow-y-auto max-h-[85vh] rounded-xl">
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
                        <div className="flex gap-1.5 flex-wrap pb-2">
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
                                  "h-8 px-3 rounded-full flex-1 text-xs font-medium transition-all shrink-0",
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                          Exercícios Disponíveis
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] font-semibold gap-1 rounded-lg border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                          onClick={() => setIsCreateCustomOpen(true)}
                        >
                          <Plus className="h-3 w-3" /> Criar Personalizado
                        </Button>
                      </div>
                      <Input
                        type="text"
                        placeholder="Buscar por nome do exercício..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="border border-border/50 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-border/30">
                      {loadingExercises ? (
                        <div className="p-4 space-y-2">
                          {[1, 2, 3].map((n) => (
                            <Skeleton key={n} className="h-10 w-full rounded-lg" />
                          ))}
                        </div>
                      ) : availableExercises.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          Nenhum exercício encontrado.
                        </div>
                      ) : (
                        availableExercises
                          .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((exercise) => {
                            const isSelected = tempSelected.some(ex => ex.id === exercise.id);
                            const alreadyAdded = selectedExercises.some(se => se.exerciseId === exercise.id);

                            return (
                              <div
                                key={exercise.id}
                                onClick={() => handleToggleTempSelected(exercise)}
                                className={cn(
                                  "p-3 flex items-center justify-between gap-2 cursor-pointer transition-colors text-sm",
                                  isSelected ? "bg-primary/10" : "hover:bg-muted/40",
                                  alreadyAdded && "opacity-60"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={cn(
                                    "size-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    isSelected ? "bg-primary border-primary text-black" : "border-border"
                                  )}>
                                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs truncate text-foreground">{exercise.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{exercise.muscleGroup?.name || "Geral"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {alreadyAdded && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border/60">
                                      Já adicionado
                                    </Badge>
                                  )}
                                  {exercise.videoUrl && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewExercise(exercise);
                                        setIsPreviewModalOpen(true);
                                      }}
                                    >
                                      <Play className="size-3.5 text-primary" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">
                        {tempSelected.length} selecionado(s)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTempSelected([]);
                            setDialogOpen(false);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={tempSelected.length === 0}
                          onClick={handleConfirmAddExercises}
                        >
                          Adicionar ({tempSelected.length})
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {selectedExercises.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-secondary/5">
                <Dumbbell className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-foreground">Nenhum exercício adicionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedExercises.map((exercise, index) => {
                  const groupLabel = exercise.groupId ? getGroupLabel(exercise.groupId) : null;
                  const isCheckedInSelectMode = selectedIndexes.includes(index);

                  return (
                    <div
                      key={`${exercise.exerciseId}-${index}`}
                      className={cn(
                        "p-4 rounded-xl border border-border/70 bg-background/50 hover:border-border transition-all flex flex-col gap-3",
                        isCheckedInSelectMode && "ring-2 ring-primary border-primary/40 bg-primary/5",
                        exercise.groupId && "border-l-4 border-l-primary"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {selectMode && (
                            <Checkbox
                              checked={isCheckedInSelectMode}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedIndexes((prev) => [...prev, index]);
                                } else {
                                  setSelectedIndexes((prev) => prev.filter((i) => i !== index));
                                }
                              }}
                              className="size-4 rounded"
                            />
                          )}

                          <div className="size-6 rounded-full bg-secondary text-foreground text-xs font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate text-foreground flex items-center gap-2">
                              {exercise.name}
                              {exercise.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewExercise(exercise);
                                    setIsPreviewModalOpen(true);
                                  }}
                                  className="text-primary hover:text-primary/80 transition-colors inline-flex"
                                  title="Ver vídeo"
                                >
                                  <Play className="size-3.5 fill-current" />
                                </button>
                              )}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {exercise.muscleGroup}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {groupLabel && (
                            <div className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              <span>{groupLabel}</span>
                              <button
                                type="button"
                                onClick={() => handleUngroup(exercise.groupId)}
                                className="hover:text-destructive transition-colors ml-1"
                                title="Desagrupar"
                              >
                                &times;
                              </button>
                            </div>
                          )}

                          <Button
                            type="button"
                            variant={exercise.methodType && exercise.methodType !== "NONE" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => handleOpenMethodDialog(index)}
                          >
                            {exercise.methodType === "DROPSET" ? "Dropset" : exercise.methodType === "REST_PAUSE" ? "Rest-Pause" : "Método"}
                          </Button>

                          <div className="flex items-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              disabled={index === 0}
                              onClick={() => moveExercise(index, "up")}
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              disabled={index === selectedExercises.length - 1}
                              onClick={() => moveExercise(index, "down")}
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveExercise(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Configuração de Séries, Reps, Carga e Descanso */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Séries</Label>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={exercise.sets}
                            onChange={(e) => handleUpdateExerciseField(index, "sets", e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Repetições</Label>
                          <Input
                            type="text"
                            placeholder="Ex: 10 a 12"
                            value={exercise.reps}
                            onChange={(e) => handleUpdateExerciseField(index, "reps", e.target.value)}
                            disabled={exercise.isIndividual}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Carga (kg)</Label>
                          <Input
                            type="text"
                            placeholder="Ex: 20"
                            value={exercise.load}
                            onChange={(e) => handleUpdateExerciseField(index, "load", e.target.value)}
                            disabled={exercise.isIndividual || String(exercise.load).toLowerCase().includes("p.c")}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Descanso</Label>
                          <RestTimeInput
                            value={exercise.rest}
                            onChange={(val) => handleUpdateExerciseField(index, "rest", val)}
                            disabled={exercise.isIndividual}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/30 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                          <Checkbox
                            checked={exercise.isIndividual}
                            onCheckedChange={(checked) => handleToggleIndividual(index, !!checked)}
                            className="size-3.5"
                          />
                          <span className="text-[11px]">Séries Individuais</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                          <Checkbox
                            checked={String(exercise.load || "").toLowerCase().includes("p.c")}
                            onCheckedChange={(checked) => handleToggleBodyweight(index, !!checked)}
                            className="size-3.5"
                          />
                          <span className="text-[11px]">Peso do Corpo (p.c.)</span>
                        </label>
                      </div>

                      {exercise.isIndividual && exercise.individualSets && (
                        <div className="space-y-1.5 pt-2 border-t border-border/30 bg-muted/20 p-2.5 rounded-lg">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Configuração Série a Série
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {exercise.individualSets.map((s: any, sIdx: number) => (
                              <div key={sIdx} className="flex items-center gap-2 text-xs">
                                <span className="w-12 text-[10px] font-bold text-muted-foreground shrink-0">
                                  Série {sIdx + 1}
                                </span>
                                <Input
                                  placeholder="Reps"
                                  value={s.reps}
                                  onChange={(e) => handleUpdateIndividualSetField(index, sIdx, "reps", e.target.value)}
                                  className="h-7 text-xs bg-background flex-1"
                                />
                                <Input
                                  placeholder="Carga"
                                  value={s.load}
                                  onChange={(e) => handleUpdateIndividualSetField(index, sIdx, "load", e.target.value)}
                                  disabled={String(exercise.load || "").toLowerCase().includes("p.c")}
                                  className="h-7 text-xs bg-background flex-1"
                                />
                                <RestTimeInput
                                  value={s.rest}
                                  onChange={(val) => handleUpdateIndividualSetField(index, sIdx, "rest", val)}
                                  className="h-7 flex-1"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" asChild disabled={submitting}>
            <Link href={`/gym/workouts/${id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </form>

      {/* Dialog Método Avançado */}
      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl">
          <DialogHeader>
            <DialogTitle>Configurar Método Avançado</DialogTitle>
            <DialogDescription>Selecione e configure a técnica de intensidade para este exercício.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Técnica</Label>
              <Select value={activeMethodType} onValueChange={(val: any) => setActiveMethodType(val)}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhum (Convencional)</SelectItem>
                  <SelectItem value="DROPSET">Dropset</SelectItem>
                  <SelectItem value="REST_PAUSE">Rest-Pause</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeMethodType === "DROPSET" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs">Número de Reduções (Drops)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={dropsCount}
                    onChange={(e) => setDropsCount(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Redução da Carga (%)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="50"
                    step="5"
                    value={dropsReduction}
                    onChange={(e) => setDropsReduction(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}

            {activeMethodType === "REST_PAUSE" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs">Tempo de Pausa (segundos)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={restPauseTime}
                    onChange={(e) => setRestPauseTime(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número de Intervalos (Mini-rounds)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={restPauseRounds}
                    onChange={(e) => setRestPauseRounds(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" size="sm" onClick={() => setMethodDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSaveMethod}>
                Salvar Configuração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Agrupamento */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl">
          <DialogHeader>
            <DialogTitle>Agrupar Exercícios Selecionados</DialogTitle>
            <DialogDescription>
              {selectedIndexes.length} exercícios selecionados para execução conjugada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Agrupamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "BISET", label: "Biset", min: 2 },
                  { id: "TRISET", label: "Triset", min: 3 },
                  { id: "CIRCUIT", label: "Circuito", min: 2 },
                ].map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={groupType === item.id ? "default" : "outline"}
                    disabled={selectedIndexes.length < item.min}
                    onClick={() => setGroupType(item.id as any)}
                    className="h-10 text-xs flex flex-col gap-0.5"
                  >
                    <span>{item.label}</span>
                    <span className="text-[9px] opacity-70">mín. {item.min}</span>
                  </Button>
                ))}
              </div>
            </div>

            {groupType === "CIRCUIT" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs">Número de Voltas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={circuitRounds}
                    onChange={(e) => setCircuitRounds(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descanso entre voltas (segundos)</Label>
                  <Input
                    type="number"
                    min="15"
                    max="300"
                    step="15"
                    value={circuitRest}
                    onChange={(e) => setCircuitRest(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" size="sm" onClick={() => setGroupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleConfirmGrouping}>
                Confirmar Agrupamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />

      <CreateCustomExerciseDialog
        open={isCreateCustomOpen}
        onOpenChange={setIsCreateCustomOpen}
        muscleGroups={muscleGroups}
        defaultMuscleGroupId={selectedMuscleGroupId}
        onExerciseCreated={(newEx) => {
          setAvailableExercises((prev) => [newEx, ...prev]);
          setTempSelected((prev) => [...prev, newEx]);
        }}
      />
    </div>
  );
}
