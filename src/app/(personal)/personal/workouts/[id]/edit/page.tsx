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
import { cn } from "@/lib/utils";

interface EditWorkoutPageProps {
  params: Promise<{ id: string }>;
}

export default function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [muscleGroupLabel, setMuscleGroupLabel] = useState("");
  const [goal, setGoal] = useState("Hipertrofia");
  const [difficulty, setDifficulty] = useState("Intermediário");
  const [duration, setDuration] = useState("60 min");
  const [restBetweenExercises, setRestBetweenExercises] = useState("2 min");

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

    setSelectedExercises(prev => prev.map((ex, idx) => {
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
        methodConfig: config
      };
    }));

    setMethodDialogOpen(false);
    setActiveExerciseIndex(null);
    toast.success("Método configurado com sucesso!");
  };

  const handleOpenGroupDialog = () => {
    if (selectedIndexes.length < 2) {
      toast.error("Selecione pelo menos 2 exercícios para agrupar.");
      return;
    }

    // Default groupType selection based on selected exercises count
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
      config: groupType === "CIRCUIT" ? { rounds: Number(circuitRounds), restBetweenRounds: Number(circuitRest) } : null
    };

    setWorkoutGroups(prev => [...prev, newGroup]);
    setSelectedExercises(prev => prev.map((ex, idx) => {
      if (selectedIndexes.includes(idx)) {
        return { ...ex, groupId: tempGroupId };
      }
      return ex;
    }));

    setSelectedIndexes([]);
    setSelectMode(false);
    setGroupDialogOpen(false);
    toast.success("Exercícios agrupados com sucesso!");
  };

  const handleUngroup = (groupId: string) => {
    setSelectedExercises(prev => prev.map(ex => {
      if (ex.groupId === groupId) {
        const { groupId: _, ...rest } = ex;
        return rest;
      }
      return ex;
    }));
    setWorkoutGroups(prev => prev.filter(g => g.id !== groupId));
    toast.success("Exercícios desagrupados!");
  };

  // Dialog & exercises loader states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState("");
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [tempSelected, setTempSelected] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load existing workout details
  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/personal/workouts/${id}`);
        if (!res.ok) {
          throw new Error("Erro ao carregar detalhes do treino.");
        }
        const data = await res.json();
        setName(data.name);
        setGoal(data.goal);
        setDifficulty(data.difficulty);
        setDuration(data.duration);
        setRestBetweenExercises(data.restBetweenExercises || "2 min");
        setMuscleGroupLabel(data.muscleGroupLabel || "");

        // Load groups
        const loadedGroups = data.exerciseGroups || [];
        setWorkoutGroups(
          loadedGroups.map((g: any) => ({
            id: g.id,
            type: g.type,
            config: g.config,
          }))
        );

        setSelectedExercises(
          (data.exercises || []).map((ex: any) => {
            const repsStr = ex.reps || "10";
            const restStr = ex.rest || "60s";
            const loadStr = ex.load || "";

            const repsArr = String(repsStr).split(",").map(s => s.trim());
            const restArr = String(restStr).split(",").map(s => s.trim());
            const loadArr = String(loadStr).split(",").map(s => s.trim());

            const isIndividual = repsArr.length > 1 || restArr.length > 1 || loadArr.length > 1;

            const individualSets = Array.from({ length: ex.sets }, (_, si) => ({
              reps: repsArr[si] || repsArr[0] || "10",
              rest: restArr[si] || restArr[0] || "60s",
              load: loadArr[si] || loadArr[0] || "",
            }));

            return {
              exerciseId: ex.exercise.id,
              name: ex.exercise.name,
              videoUrl: ex.exercise.videoUrl,
              muscleGroup: ex.exercise.muscleGroups && ex.exercise.muscleGroups.length > 0
                ? ex.exercise.muscleGroups.map((g: any) => g.name).join(", ")
                : (ex.exercise.muscleGroup?.name || "Geral"),
              sets: ex.sets,
              reps: repsStr,
              rest: restStr,
              load: loadStr,
              isIndividual,
              individualSets,
              methodType: ex.methodType || "NONE",
              methodConfig: ex.methodConfig || null,
              groupId: ex.groupId || null,
            };
          })
        );
      } catch (error) {
        console.error(error);
        toast.error("Falha ao carregar modelo de treino.");
        router.push("/personal/workouts");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutDetails();
  }, [id, router]);

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

  // Toggle temporary selection in dialog
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
      videoUrl: exercise.videoUrl,
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
    const removedEx = selectedExercises[index];
    const newList = selectedExercises.filter((_, i) => i !== index);

    if (removedEx.groupId) {
      const remainingInGroup = newList.filter(ex => ex.groupId === removedEx.groupId);
      const group = workoutGroups.find(g => g.id === removedEx.groupId);
      const minRequired = group?.type === "TRISET" ? 3 : 2;
      if (remainingInGroup.length < minRequired) {
        setWorkoutGroups(prev => prev.filter(g => g.id !== removedEx.groupId));
        newList.forEach(ex => {
          if (ex.groupId === removedEx.groupId) {
            delete ex.groupId;
          }
        });
        toast.info("Um grupo foi desfeito por não possuir o número mínimo de exercícios.");
      }
    }
    setSelectedExercises(newList);
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
        const isBodyweight = String(ex.load || "").toLowerCase().includes("p.c");

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
            const fallbackLoad = isBodyweight ? "p.c." : (loadArr[0] || "");
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
            load: isBodyweight ? "p.c." : (updated.load || ""),
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
        const isBodyweight = String(ex.load || "").toLowerCase().includes("p.c");

        if (checked) {
          const repsArr = String(ex.reps).split(",").map((s) => s.trim());
          const restArr = String(ex.rest).split(",").map((s) => s.trim());
          const loadArr = String(ex.load).split(",").map((s) => s.trim());

          updated.individualSets = Array.from({ length: ex.sets }, (_, si) => ({
            reps: repsArr[si] || repsArr[0] || "10",
            rest: restArr[si] || restArr[0] || "60s",
            load: isBodyweight ? "p.c." : (loadArr[si] || loadArr[0] || ""),
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

  // Update Workout submit
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
      const res = await fetch(`/api/personal/workouts/${id}`, {
        method: "PUT",
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
            methodType: ex.methodType || "NONE",
            methodConfig: ex.methodConfig || null,
            groupId: ex.groupId || null,
          })),
          groups: workoutGroups.map((g) => ({
            id: g.id,
            type: g.type,
            config: g.config,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar alterações.");
      }

      toast.success("Alterações salvas com sucesso!");
      router.push("/personal/workouts");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Falha ao salvar o treino. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 bg-neutral-900 rounded-lg animate-pulse" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48 bg-neutral-900 rounded-lg animate-pulse" />
            <Skeleton className="h-4 w-64 bg-neutral-900 rounded animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="border border-neutral-800 bg-neutral-950/40">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-neutral-900 rounded animate-pulse" />
                  <Skeleton className="h-10 w-full bg-neutral-900 rounded-xl animate-pulse" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-neutral-900 rounded animate-pulse" />
                  <Skeleton className="h-10 w-full bg-neutral-900 rounded-xl animate-pulse" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-neutral-900 rounded animate-pulse" />
                  <Skeleton className="h-10 w-full bg-neutral-900 rounded-xl animate-pulse" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-neutral-900 rounded animate-pulse" />
                  <Skeleton className="h-10 w-full bg-neutral-900 rounded-xl animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="border border-neutral-800 bg-neutral-950/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-36 bg-neutral-900 rounded-lg animate-pulse" />
                  <Skeleton className="h-3.5 w-48 bg-neutral-900 rounded animate-pulse" />
                </div>
                <Skeleton className="h-9 w-32 bg-neutral-900 rounded-lg animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="p-4 rounded-xl border border-neutral-900 bg-neutral-900/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 bg-neutral-900 rounded animate-pulse" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32 bg-neutral-900 rounded animate-pulse" />
                        <Skeleton className="h-3.5 w-20 bg-neutral-900 rounded animate-pulse" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 bg-neutral-900 rounded animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
          <Link href="/personal/workouts">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Treino</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Modifique os dados e estrutura do treino.</p>
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
                <Input
                  id="duration"
                  type="text"
                  placeholder="Ex: 60 min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="bg-background/80 border-border h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="restBetweenExercises" className="text-xs font-medium text-foreground">Descanso Exercícios</Label>
                <Input
                  id="restBetweenExercises"
                  type="text"
                  placeholder="Ex: 2 min"
                  value={restBetweenExercises}
                  onChange={(e) => setRestBetweenExercises(e.target.value)}
                  className="bg-background/80 border-border h-10 text-sm"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercícios */}
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
                <DialogContent className="max-w-md w-[95%] overflow-y-auto! rounded-xl!">
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
                        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar scroll-smooth whitespace-nowrap">
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
                                  "h-8 px-3 rounded-full text-xs font-medium transition-all shrink-0",
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
                      <div className="border border-border rounded-lg bg-background max-h-[45dvh] sm:max-h-60 overflow-y-auto p-2 space-y-1">
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
                                <div
                                  key={exercise.id}
                                  className={cn(
                                    "w-full p-2.5 rounded-md flex items-center justify-between transition text-sm border gap-2",
                                    isAdded
                                      ? "bg-muted/20 border-transparent opacity-60"
                                      : isChecked
                                        ? "bg-primary/10 border-primary/50 text-primary"
                                        : "bg-transparent border-transparent hover:bg-secondary/40 text-foreground"
                                  )}
                                >
                                  <button
                                    type="button"
                                    disabled={isAdded}
                                    onClick={() => handleToggleTempSelected(exercise)}
                                    className="flex-1 text-left font-medium min-w-0 truncate disabled:cursor-not-allowed"
                                  >
                                    {exercise.name}
                                  </button>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {exercise.videoUrl && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewExercise(exercise);
                                          setIsPreviewModalOpen(true);
                                        }}
                                      >
                                        <Play className="size-3.5 fill-muted-foreground" />
                                      </Button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={isAdded}
                                      onClick={() => handleToggleTempSelected(exercise)}
                                      className="shrink-0 flex items-center justify-center size-5 rounded-md border border-neutral-700 bg-neutral-950 disabled:cursor-not-allowed"
                                    >
                                      {(isAdded || isChecked) && (
                                        <Check className={cn("size-3.5", isAdded ? "text-muted-foreground" : "text-primary")} />
                                      )}
                                    </button>
                                  </div>
                                </div>
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
                              className="gap-1 px-2.5 flex-1 min-w-fit py-1 text-xs font-medium bg-secondary text-foreground rounded-full border border-border"
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

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-border mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setTempSelected([]);
                          setDialogOpen(false);
                        }}
                        className="w-full sm:w-auto text-xs h-10"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmAddExercises}
                        disabled={tempSelected.length === 0}
                        className="gap-1.5 w-full sm:w-auto text-xs h-10"
                      >
                        Confirmar Adição ({tempSelected.length})
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
            {selectedExercises.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border rounded-xl bg-secondary/15 flex flex-col items-center justify-center gap-2">
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
                    className="p-3 sm:p-4 border border-border rounded-xl bg-background/40 hover:bg-background/60 transition flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center relative"
                  >
                    {selectMode && (
                      <div className="flex items-center shrink-0">
                        <Checkbox
                          checked={selectedIndexes.includes(index)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIndexes(prev => [...prev, index]);
                            } else {
                              setSelectedIndexes(prev => prev.filter(i => i !== index));
                            }
                          }}
                          className="mr-2 sm:mr-0"
                        />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-3">
                      {/* Top Row: Info & Badges + Positioning & Delete Actions */}
                      <div className="flex flex-row items-start justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            disabled={!ex.videoUrl}
                            onClick={() => {
                              setPreviewExercise({
                                id: ex.exerciseId,
                                name: ex.name,
                                videoUrl: ex.videoUrl,
                                muscleGroup: { name: ex.muscleGroup }
                              });
                              setIsPreviewModalOpen(true);
                            }}
                            className={cn(
                              "size-8 sm:size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border transition-all relative group/thumb",
                              ex.videoUrl ? "hover:border-primary/50 cursor-pointer" : "cursor-default"
                            )}
                          >
                            <Activity className="size-4 text-primary group-hover/thumb:scale-110 transition-transform" />
                            {ex.videoUrl && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg">
                                <Play className="size-3 fill-white text-white" />
                              </div>
                            )}
                          </button>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">{ex.name}</h4>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <Badge variant="secondary" className="text-[9px] bg-secondary/80 text-muted-foreground px-1.5 py-0">
                                {ex.muscleGroup}
                              </Badge>

                              {ex.groupId && (
                                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold gap-1 pr-1 px-1.5 py-0">
                                  {getGroupLabel(ex.groupId)}
                                  <button
                                    type="button"
                                    onClick={() => handleUngroup(ex.groupId)}
                                    className="hover:text-destructive text-neutral-500 font-bold text-[10px] leading-none"
                                  >
                                    &times;
                                  </button>
                                </Badge>
                              )}

                              {ex.methodType === "DROPSET" && (
                                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0">
                                  Dropset
                                </Badge>
                              )}

                              {ex.methodType === "REST_PAUSE" && (
                                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-1.5 py-0">
                                  Rest-Pause
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {ex.videoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setPreviewExercise({
                                  id: ex.exerciseId,
                                  name: ex.name,
                                  videoUrl: ex.videoUrl,
                                  muscleGroup: { name: ex.muscleGroup }
                                });
                                setIsPreviewModalOpen(true);
                              }}
                              className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                              title="Visualizar execução"
                            >
                              <Play className="size-4 fill-primary" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveExercise(index, "up")}
                            disabled={index === 0}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveExercise(index, "down")}
                            disabled={index === selectedExercises.length - 1}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
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

                      {/* Middle Row: Inputs + Method configuration */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/10 sm:border-0">
                        {!ex.isIndividual && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-72 shrink-0">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                              <Input
                                type="number"
                                value={ex.sets}
                                onChange={(e) => handleUpdateExerciseField(index, "sets", e.target.value)}
                                className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                min={1}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Reps</span>
                              <Input
                                type="text"
                                value={ex.reps}
                                onChange={(e) => handleUpdateExerciseField(index, "reps", e.target.value)}
                                className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                placeholder="Ex: 10"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground pl-0.5 flex items-center gap-0.5 select-none">
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
                                value={String(ex.load || "").toLowerCase().includes("p.c") ? "p.c." : (ex.load || "")}
                                onChange={(e) => handleUpdateExerciseField(index, "load", e.target.value)}
                                disabled={String(ex.load || "").toLowerCase().includes("p.c")}
                                className="h-8 bg-card border-border w-full text-center text-xs px-1 disabled:opacity-80 font-semibold"
                                placeholder={String(ex.load || "").toLowerCase().includes("p.c") ? "p.c." : "Auto"}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Desc.</span>
                              <Input
                                type="text"
                                value={ex.rest || "60s"}
                                onChange={(e) => handleUpdateExerciseField(index, "rest", e.target.value)}
                                className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                placeholder="Ex: 60s"
                              />
                            </div>
                          </div>
                        )}

                        {ex.isIndividual && (
                          <div className="space-y-1 w-full sm:w-24 shrink-0">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                            <Input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => handleUpdateExerciseField(index, "sets", e.target.value)}
                              className="h-8 bg-card border-border w-full text-center text-xs px-1"
                              min={1}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenMethodDialog(index)}
                            className="h-8 w-full sm:w-auto gap-1 text-xs border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0"
                          >
                            ⚡ Método
                          </Button>
                        </div>
                      </div>

                      {/* Bottom Row: Checkboxes */}
                      <div className="flex flex-wrap items-center gap-4 px-1 pt-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`individual-${index}`}
                            checked={ex.isIndividual || false}
                            onCheckedChange={(checked) => handleToggleIndividual(index, !!checked)}
                            className="rounded size-4"
                          />
                          <label
                            htmlFor={`individual-${index}`}
                            className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none"
                          >
                            Configurar séries individualmente
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`bodyweight-${index}`}
                            checked={String(ex.load || "").toLowerCase().includes("p.c")}
                            onCheckedChange={(checked) => handleToggleBodyweight(index, !!checked)}
                            className="rounded size-4"
                          />
                          <label
                            htmlFor={`bodyweight-${index}`}
                            className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none"
                          >
                            Peso do corpo
                          </label>
                        </div>
                      </div>

                      {/* Individual Sets details expansion */}
                      {ex.isIndividual && (
                        <div className="mt-1 border-t border-border/30 pt-3 space-y-2">
                          <div className="grid grid-cols-[30px_1fr_1fr_1fr] gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                            <div>Série</div>
                            <div>Reps</div>
                            <div className="flex items-center gap-0.5 select-none">
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

                          <div className="space-y-1.5">
                            {Array.from({ length: ex.sets }).map((_, si) => {
                              const setItem = ex.individualSets?.[si] || { reps: "10", load: "", rest: "60s" };
                              return (
                                <div key={si} className="grid grid-cols-[30px_1fr_1fr_1fr] gap-2 items-center">
                                  <span className="text-xs font-semibold text-neutral-400 pl-1">#{si + 1}</span>
                                  <Input
                                    type="text"
                                    value={setItem.reps}
                                    onChange={(e) => handleUpdateIndividualSetField(index, si, "reps", e.target.value)}
                                    className="h-8 bg-card border-border text-center text-xs px-1"
                                    placeholder="Ex: 10"
                                  />
                                  <Input
                                    type="text"
                                    value={String(setItem.load || "").toLowerCase().includes("p.c") ? "p.c." : setItem.load}
                                    onChange={(e) => handleUpdateIndividualSetField(index, si, "load", e.target.value)}
                                    disabled={String(setItem.load || "").toLowerCase().includes("p.c")}
                                    className="h-8 bg-card border-border text-center text-xs px-1 disabled:opacity-80 font-semibold"
                                    placeholder={String(setItem.load || "").toLowerCase().includes("p.c") ? "p.c." : "Auto"}
                                  />
                                  <Input
                                    type="text"
                                    value={setItem.rest}
                                    onChange={(e) => handleUpdateIndividualSetField(index, si, "rest", e.target.value)}
                                    className="h-8 bg-card border-border text-center text-xs px-1"
                                    placeholder="Ex: 60s"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botoes de Acao */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-2">
          <Button variant="outline" type="button" className="h-11 w-full sm:w-auto px-6 text-sm" asChild>
            <Link href="/personal/workouts">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="h-11 w-full sm:w-auto px-8 min-w-36 gap-2 text-sm">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Check className="size-4.5" /> Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Advanced Method Dialog */}
      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl">
          <DialogHeader>
            <DialogTitle>Configurar Método Avançado</DialogTitle>
            <DialogDescription>
              Escolha uma técnica avançada para este exercício.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Método
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "NONE", label: "Nenhum" },
                  { id: "DROPSET", label: "Dropset" },
                  { id: "REST_PAUSE", label: "Rest-Pause" }
                ].map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    variant={activeMethodType === m.id ? "default" : "outline"}
                    onClick={() => setActiveMethodType(m.id as any)}
                    className="h-10 text-xs"
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            {activeMethodType === "DROPSET" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Quedas (Drops)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={dropsCount === d ? "default" : "outline"}
                        onClick={() => setDropsCount(d)}
                        className="h-9 text-xs"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Redução da Carga
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 40].map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={dropsReduction === r ? "default" : "outline"}
                        onClick={() => setDropsReduction(r)}
                        className="h-9 text-xs"
                      >
                        {r}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeMethodType === "REST_PAUSE" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Tempo de Pausa
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 20].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={restPauseTime === p ? "default" : "outline"}
                        onClick={() => setRestPauseTime(p)}
                        className="h-9 text-xs"
                      >
                        {p}s
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Repetições de Pausa (Rounds)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={restPauseRounds === r ? "default" : "outline"}
                        onClick={() => setRestPauseRounds(r)}
                        className="h-9 text-xs"
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMethodDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveMethod}
              >
                Salvar Método
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Configuration Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl">
          <DialogHeader>
            <DialogTitle>Agrupar Exercícios</DialogTitle>
            <DialogDescription>
              Crie um método agrupado para os exercícios selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Tipo do Grupo
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "BISET", label: "Biset" },
                  { id: "TRISET", label: "Triset" },
                  { id: "CIRCUIT", label: "Circuito" }
                ].map((t) => {
                  const minEx = t.id === "TRISET" ? 3 : 2;
                  const isBlocked = selectedIndexes.length < minEx;
                  return (
                    <Button
                      key={t.id}
                      type="button"
                      disabled={isBlocked}
                      variant={groupType === t.id ? "default" : "outline"}
                      onClick={() => setGroupType(t.id as any)}
                      className={cn("h-10 text-xs flex flex-col items-center justify-center gap-0.5", isBlocked && "opacity-45")}
                    >
                      <span>{t.label}</span>
                      <span className="text-[8px] opacity-70">mín. {minEx} ex.</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {groupType === "CIRCUIT" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Número de Voltas
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={circuitRounds === v ? "default" : "outline"}
                        onClick={() => setCircuitRounds(v)}
                        className="h-9 text-xs"
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Descanso entre voltas
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 30, label: "30s" },
                      { val: 60, label: "60s" },
                      { val: 90, label: "90s" },
                      { val: 120, label: "120s" }
                    ].map((d) => (
                      <Button
                        key={d.val}
                        type="button"
                        variant={circuitRest === d.val ? "default" : "outline"}
                        onClick={() => setCircuitRest(d.val)}
                        className="h-9 text-xs"
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGroupDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmGrouping}
              >
                Criar Grupo
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
    </div>
  );
}

