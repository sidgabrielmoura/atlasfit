"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  User,
  BookmarkPlus,
  FileText,
  CheckCircle2,
  Calendar,
  Loader2,
  Search,
  Sliders,
  Dumbbell,
  Clock,
  MessageSquareOff,
  MessageSquareText,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CalendarOff,
  ChevronsUpDown,
  Weight,
  Repeat,
  Timer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, simplifyCommaSeparatedString } from "@/lib/utils";
import { toast } from "sonner";
import { RestTimeInput } from "@/components/application/RestTimeInput";
import { areWorkoutsIdentical } from "@/lib/workout-duplicate-checker";

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

const WORKOUT_GOALS = [
  "Hipertrofia",
  "Emagrecimento",
  "Força",
  "Resistência",
  "Condicionamento",
  "Reabilitação",
  "Geral",
];
const WORKOUT_DIFFICULTIES = ["Iniciante", "Intermediário", "Avançado"];
const WORKOUT_DURATIONS = ["30 min", "45 min", "60 min", "75 min", "90 min"];

export interface ExerciseCustomConfig {
  sets: number | string;
  reps: string;
  load: string;
  rest: string;
  description: string;
}

export interface DuplicateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  workspaceId: string;
  initialMode?: "DUPLICATE_TO_STUDENT" | "SAVE_AS_TEMPLATE";
  currentStudentId?: string;
  currentStudentName?: string;
  onSuccess?: () => void;
}

export function DuplicateWorkoutModal({
  isOpen,
  onClose,
  workout,
  workspaceId,
  initialMode = "DUPLICATE_TO_STUDENT",
  currentStudentId,
  currentStudentName,
  onSuccess,
}: DuplicateWorkoutModalProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"DUPLICATE_TO_STUDENT" | "SAVE_AS_TEMPLATE">(
    initialMode
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student selection state
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentStudentId || "");
  const [studentSearch, setStudentSearch] = useState("");

  // Student workouts for duplicate validation
  const [studentWorkouts, setStudentWorkouts] = useState<any[]>([]);
  const [loadingStudentWorkouts, setLoadingStudentWorkouts] = useState(false);

  // Shared Form Options
  const [includeObservations, setIncludeObservations] = useState<boolean>(true);
  const [customName, setCustomName] = useState("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(workout?.dayOfWeek ?? 1);
  const [customGoal, setCustomGoal] = useState("Hipertrofia");
  const [customDifficulty, setCustomDifficulty] = useState("Intermediário");
  const [customDuration, setCustomDuration] = useState("60 min");
  const [customRestBetweenExercises, setCustomRestBetweenExercises] = useState("02:00");
  const [customMuscleGroupLabel, setCustomMuscleGroupLabel] = useState("");

  // Permissions (for templates & flex)
  const [allowRepsModification, setAllowRepsModification] = useState(true);
  const [allowCompleteView, setAllowCompleteView] = useState(false);
  const [allowSkipExercises, setAllowSkipExercises] = useState(false);

  // Exercise Selection & Customization
  const [excludedExerciseIds, setExcludedExerciseIds] = useState<string[]>([]);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(true);
  const [exerciseConfigs, setExerciseConfigs] = useState<Record<string, ExerciseCustomConfig>>({});
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<string[]>([]);

  // Sync mode tab when initialMode prop changes
  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode, isOpen]);

  // Reset form defaults when workout changes or modal opens
  useEffect(() => {
    if (workout && isOpen) {
      setCustomName(
        activeTab === "SAVE_AS_TEMPLATE"
          ? `${workout.name || "Treino"} (Modelo)`
          : workout.name || "Treino"
      );
      setCustomGoal(workout.goal || "Hipertrofia");
      setCustomDifficulty(workout.difficulty || "Intermediário");
      setCustomDuration(workout.duration || "60 min");
      setCustomRestBetweenExercises(workout.restBetweenExercises || "02:00");
      setCustomMuscleGroupLabel(workout.muscleGroupLabel || "");
      setSelectedDayOfWeek(workout.dayOfWeek ?? 1);
      setAllowRepsModification(workout.allowRepsModification ?? true);
      setAllowCompleteView(workout.allowCompleteView ?? false);
      setAllowSkipExercises(workout.allowSkipExercises ?? false);
      setIncludeObservations(true);
      setExcludedExerciseIds([]);
      setShowAdvancedConfig(true);
      setExpandedExerciseIds([]);

      // Initialize individual exercise custom configs
      const initialConfigs: Record<string, ExerciseCustomConfig> = {};
      (workout.exercises || []).forEach((we: any) => {
        const repsVal = simplifyCommaSeparatedString(we.reps ? String(we.reps) : "10");
        const loadVal = simplifyCommaSeparatedString(we.load ? String(we.load) : "");
        const restVal = simplifyCommaSeparatedString(we.rest ? String(we.rest) : "01:00");

        initialConfigs[we.id] = {
          sets: we.sets ?? 4,
          reps: repsVal || "10",
          load: loadVal,
          rest: restVal || "01:00",
          description: we.description ? String(we.description) : "",
        };
      });
      setExerciseConfigs(initialConfigs);

      if (currentStudentId) {
        setSelectedStudentId(currentStudentId);
      }
    }
  }, [workout, isOpen, activeTab, currentStudentId]);

  // Update default name prefix when switching tabs
  const handleTabChange = (val: string) => {
    const nextTab = val as "DUPLICATE_TO_STUDENT" | "SAVE_AS_TEMPLATE";
    setActiveTab(nextTab);
    if (workout) {
      if (nextTab === "SAVE_AS_TEMPLATE") {
        setCustomName(workout.name ? `${workout.name} (Modelo)` : "Modelo de Treino");
      } else {
        setCustomName(workout.name || "Treino");
      }
    }
  };

  // Fetch workspace students when modal is open and on STUDENT tab
  useEffect(() => {
    if (isOpen && workspaceId && activeTab === "DUPLICATE_TO_STUDENT" && students.length === 0) {
      const fetchStudents = async () => {
        try {
          setLoadingStudents(true);
          const res = await fetch(`/api/personal/clients?workspaceId=${workspaceId}`);
          if (res.ok) {
            const data = await res.json();
            setStudents(data);
            if (data.length > 0 && !selectedStudentId) {
              setSelectedStudentId(data[0].id);
            }
          }
        } catch (err) {
          console.error("Erro ao carregar alunos:", err);
        } finally {
          setLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [isOpen, workspaceId, activeTab, students.length, selectedStudentId]);

  // Fetch student workouts whenever selectedStudentId changes to evaluate duplicates
  useEffect(() => {
    if (isOpen && activeTab === "DUPLICATE_TO_STUDENT" && selectedStudentId) {
      let isCancelled = false;
      const fetchStudentWorkouts = async () => {
        try {
          setLoadingStudentWorkouts(true);
          const wsId = workspaceId || workout?.workspaceId || "";
          const url = wsId
            ? `/api/personal/clients/${selectedStudentId}/workouts?workspaceId=${wsId}`
            : `/api/personal/clients/${selectedStudentId}/workouts`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (!isCancelled) {
              setStudentWorkouts(Array.isArray(data) ? data : []);
            }
          } else {
            if (!isCancelled) setStudentWorkouts([]);
          }
        } catch (err) {
          console.error("Erro ao carregar treinos do aluno:", err);
          if (!isCancelled) setStudentWorkouts([]);
        } finally {
          if (!isCancelled) setLoadingStudentWorkouts(false);
        }
      };
      fetchStudentWorkouts();
      return () => {
        isCancelled = true;
      };
    } else {
      setStudentWorkouts([]);
      setLoadingStudentWorkouts(false);
    }
  }, [isOpen, activeTab, selectedStudentId, workspaceId, workout?.workspaceId]);

  const effectiveWorkoutToDuplicate = useMemo(() => {
    const name = customName.trim() || workout?.name || "Treino";
    const exercises = (workout?.exercises || []).map((we: any) => {
      const cfg = exerciseConfigs[we.id];
      const defaultReps = simplifyCommaSeparatedString(we.reps ? String(we.reps) : "10");
      const defaultLoad = simplifyCommaSeparatedString(we.load ? String(we.load) : "");
      const defaultRest = simplifyCommaSeparatedString(we.rest ? String(we.rest) : "01:00");

      return {
        ...we,
        sets: cfg?.sets !== undefined && cfg.sets !== "" ? cfg.sets : we.sets,
        reps: cfg?.reps !== undefined && cfg.reps !== "" ? cfg.reps : defaultReps,
        load: cfg?.load !== undefined ? cfg.load : defaultLoad,
        rest: cfg?.rest !== undefined && cfg.rest !== "" ? cfg.rest : defaultRest,
        description: cfg?.description !== undefined ? cfg.description : we.description,
      };
    });

    return {
      name,
      exercises,
    };
  }, [customName, workout, exerciseConfigs]);

  // Evaluate duplicate existence for each day of week strictly by name and exercises
  const disabledDaysInfo = useMemo(() => {
    const map: Record<number, { isDuplicate: boolean; existingWorkoutName?: string }> = {};

    if (activeTab !== "DUPLICATE_TO_STUDENT" || !selectedStudentId || !workout) {
      return map;
    }

    for (const day of DAYS_OF_WEEK) {
      const workoutsOnDay = studentWorkouts.filter(
        (w) => Number(w.dayOfWeek) === Number(day.value)
      );

      const duplicateWorkout = workoutsOnDay.find((w) =>
        areWorkoutsIdentical(
          effectiveWorkoutToDuplicate,
          w,
          excludedExerciseIds
        )
      );

      if (duplicateWorkout) {
        map[day.value] = {
          isDuplicate: true,
          existingWorkoutName: duplicateWorkout.name,
        };
      }
    }

    return map;
  }, [
    activeTab,
    selectedStudentId,
    workout,
    studentWorkouts,
    effectiveWorkoutToDuplicate,
    excludedExerciseIds,
  ]);

  // Auto-switch to the first available non-duplicate day if the currently selected day becomes disabled
  useEffect(() => {
    if (activeTab === "DUPLICATE_TO_STUDENT" && !loadingStudentWorkouts) {
      const isCurrentDayDisabled = Boolean(disabledDaysInfo[selectedDayOfWeek]?.isDuplicate);
      if (isCurrentDayDisabled) {
        const availableDay = DAYS_OF_WEEK.find(
          (d) => !disabledDaysInfo[d.value]?.isDuplicate
        );
        if (availableDay) {
          setSelectedDayOfWeek(availableDay.value);
        }
      }
    }
  }, [disabledDaysInfo, selectedDayOfWeek, activeTab, loadingStudentWorkouts]);

  // Check if every day of the week already contains this identical workout
  const allDaysDisabled = useMemo(() => {
    if (
      activeTab !== "DUPLICATE_TO_STUDENT" ||
      loadingStudentWorkouts ||
      studentWorkouts.length === 0
    ) {
      return false;
    }
    return DAYS_OF_WEEK.every((d) => Boolean(disabledDaysInfo[d.value]?.isDuplicate));
  }, [activeTab, loadingStudentWorkouts, studentWorkouts, disabledDaysInfo]);

  const isCurrentSelectedDayDuplicate = Boolean(
    disabledDaysInfo[selectedDayOfWeek]?.isDuplicate
  );

  const filteredStudents = students.filter((st) => {
    const query = studentSearch.toLowerCase();
    return (
      st.name?.toLowerCase().includes(query) ||
      st.email?.toLowerCase().includes(query)
    );
  });

  const toggleExerciseInclusion = (exerciseId: string) => {
    setExcludedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const toggleExerciseExpanded = (exerciseId: string) => {
    setExpandedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const toggleAllExercisesExpanded = () => {
    const allIds = (workout?.exercises || []).map((we: any) => we.id);
    if (expandedExerciseIds.length === allIds.length) {
      setExpandedExerciseIds([]);
    } else {
      setExpandedExerciseIds(allIds);
    }
  };

  const handleToggleIncludeObservations = (include: boolean) => {
    setIncludeObservations(include);
    setExerciseConfigs((prev) => {
      const updated = { ...prev };
      (workout?.exercises || []).forEach((we: any) => {
        const defaultSets = we?.sets ?? 4;
        const defaultReps = simplifyCommaSeparatedString(we?.reps ? String(we.reps) : "10") || "10";
        const defaultLoad = simplifyCommaSeparatedString(we?.load ? String(we?.load) : "");
        const defaultRest = simplifyCommaSeparatedString(we?.rest ? String(we?.rest) : "01:00") || "01:00";
        const existing = updated[we.id] || {
          sets: defaultSets,
          reps: defaultReps,
          load: defaultLoad,
          rest: defaultRest,
          description: "",
        };

        updated[we.id] = {
          ...existing,
          description: include ? (we.description ? String(we.description) : "") : "",
        };
      });
      return updated;
    });
  };

  const handleUpdateExerciseField = (
    exerciseId: string,
    field: keyof ExerciseCustomConfig,
    value: any
  ) => {
    if (field === "description" && value && String(value).trim() !== "" && !includeObservations) {
      setIncludeObservations(true);
    }

    setExerciseConfigs((prev) => {
      const existing = prev[exerciseId];
      const we = (workout?.exercises || []).find((e: any) => e.id === exerciseId);
      const defaultSets = we?.sets ?? 4;
      const defaultReps = simplifyCommaSeparatedString(we?.reps ? String(we.reps) : "10") || "10";
      const defaultLoad = simplifyCommaSeparatedString(we?.load ? String(we?.load) : "");
      const defaultRest = simplifyCommaSeparatedString(we?.rest ? String(we?.rest) : "01:00") || "01:00";
      const defaultDesc = we?.description ? String(we.description) : "";

      return {
        ...prev,
        [exerciseId]: {
          ...(existing || {
            sets: defaultSets,
            reps: defaultReps,
            load: defaultLoad,
            rest: defaultRest,
            description: defaultDesc,
          }),
          [field]: value,
        },
      };
    });
  };

  const handleDuplicateSubmit = async () => {
    if (!workout?.id) return;

    if (activeTab === "DUPLICATE_TO_STUDENT" && !selectedStudentId) {
      toast.warning("Por favor, selecione um aluno para receber o treino.");
      return;
    }

    if (activeTab === "DUPLICATE_TO_STUDENT" && isCurrentSelectedDayDuplicate) {
      toast.error(
        "Este mesmo treino (mesmo nome e exercícios) já existe no dia selecionado para este aluno."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const targetStudentObj = students.find((s) => s.id === selectedStudentId);
      const targetStudentName = targetStudentObj?.name || currentStudentName || "o aluno";

      const sanitizedExerciseConfigs: Record<string, ExerciseCustomConfig> = {};
      Object.entries(exerciseConfigs).forEach(([id, cfg]) => {
        sanitizedExerciseConfigs[id] = {
          ...cfg,
          description: includeObservations ? (cfg.description || "") : "",
        };
      });

      const payload = {
        targetType: activeTab === "DUPLICATE_TO_STUDENT" ? "STUDENT" : "TEMPLATE",
        targetStudentId: activeTab === "DUPLICATE_TO_STUDENT" ? selectedStudentId : null,
        dayOfWeek: activeTab === "DUPLICATE_TO_STUDENT" ? selectedDayOfWeek : null,
        includeObservations: Boolean(includeObservations),
        name: customName.trim() || workout.name,
        goal: customGoal,
        difficulty: customDifficulty,
        duration: customDuration,
        restBetweenExercises: customRestBetweenExercises,
        muscleGroupLabel: customMuscleGroupLabel.trim() || null,
        allowRepsModification,
        allowCompleteView,
        allowSkipExercises,
        excludedExerciseIds,
        exerciseConfigs: sanitizedExerciseConfigs,
      };

      const res = await fetch(`/api/personal/workouts/${workout.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        throw new Error(errorMsg || "Erro ao duplicar treino.");
      }

      await res.json();
      onClose();

      if (onSuccess) {
        onSuccess();
      }

      if (activeTab === "DUPLICATE_TO_STUDENT") {
        toast.success(`Treino duplicado para ${targetStudentName} com sucesso!`, {
          action: {
            label: "Ver Aluno",
            onClick: () => {
              router.push(`/personal/clients/${selectedStudentId}?tab=treinos`);
            },
          },
          duration: 6000,
        });
      } else {
        toast.success("Modelo de treino salvo na biblioteca!", {
          action: {
            label: "Ver Tabela de Treinos",
            onClick: () => {
              router.push("/personal/workouts");
            },
          },
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao duplicar treino.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExerciseCount = workout?.exercises?.length || 0;
  const activeExerciseCount = totalExerciseCount - excludedExerciseIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-2xl w-[96vw] max-h-[90vh] overflow-y-auto! p-4 sm:p-6 rounded-2xl! bg-card border-border dark:border-zinc-900 shadow-2xl">
        <DialogHeader className="space-y-2 pb-3 border-b border-border/40 text-left">
          <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
            <Copy className="size-4 shrink-0" />
            <span>Duplicação de Treino</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {activeTab === "DUPLICATE_TO_STUDENT"
              ? "Duplicar Treino para Aluno"
              : "Salvar como Modelo Pronto"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {activeTab === "DUPLICATE_TO_STUDENT"
              ? "Copie este treino para qualquer aluno, ajustando dia, exercícios, séries, repetições e cargas."
              : "Guarde este treino na biblioteca de modelos para prescrever a outros alunos no futuro."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full mt-2 space-y-4"
        >
          <TabsList className="grid grid-cols-2 w-full bg-muted/60 dark:bg-zinc-900/60 p-1 rounded-xl border border-border/40">
            <TabsTrigger
              value="DUPLICATE_TO_STUDENT"
              disabled={isSubmitting}
              className="gap-2 text-xs font-bold py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
            >
              <User className="size-3.5 shrink-0" /> Duplicar para Aluno
            </TabsTrigger>
            <TabsTrigger
              value="SAVE_AS_TEMPLATE"
              disabled={isSubmitting}
              className="gap-2 text-xs font-bold py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
            >
              <BookmarkPlus className="size-3.5 shrink-0" /> Salvar Modelo
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DUPLICAR PARA ALUNO */}
          <TabsContent value="DUPLICATE_TO_STUDENT" className="space-y-4 focus-visible:outline-none">
            {/* Step 1: Student Selection & Workout Name */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>1. Selecionar Aluno de Destino</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {students.length} alunos cadastrados
                </span>
              </Label>

              {loadingStudents ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Student Search */}
                  {students.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar aluno por nome ou email..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl border-border bg-muted/20"
                      />
                    </div>
                  )}

                  {/* Student Select dropdown */}
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border w-full bg-muted/10 dark:bg-zinc-900/30 text-xs font-medium focus:ring-1 focus:ring-primary">
                      <SelectValue placeholder="Escolha o aluno de destino..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 bg-card border-border dark:border-zinc-800">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Nenhum aluno encontrado.
                        </div>
                      ) : (
                        filteredStudents.map((st) => (
                          <SelectItem
                            key={st.id}
                            value={st.id}
                            className="cursor-pointer py-2 text-xs font-medium"
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-6">
                                <AvatarImage src={st.image || undefined} />
                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                  {st.name?.slice(0, 2).toUpperCase() || "AL"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-foreground">{st.name}</span>
                              {st.id === currentStudentId && (
                                <Badge className="text-[9px] h-4 px-1.5 bg-blue-500/10 text-blue-500 border-blue-500/20 font-semibold">
                                  Aluno Atual
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {/* Custom Name for Student Workout */}
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="studentWorkoutName" className="text-[11px] font-semibold text-muted-foreground">
                      Nome do Treino Prescrito
                    </Label>
                    <Input
                      id="studentWorkoutName"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Nome do treino..."
                      disabled={isSubmitting}
                      className="h-9 text-xs rounded-xl border-border bg-muted/10 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Day of the Week Selection with Strict Duplicate Checking */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  2. Dia da Semana no Planejamento
                </Label>
                {loadingStudentWorkouts && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 animate-pulse font-medium">
                    <Loader2 className="size-3 animate-spin text-primary shrink-0" />
                    Checando treinos existentes...
                  </span>
                )}
              </div>

              <TooltipProvider delayDuration={150}>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const dayInfo = disabledDaysInfo[d.value];
                    const isDuplicate = Boolean(dayInfo?.isDuplicate);
                    const isSelected = selectedDayOfWeek === d.value;
                    const isDisabled = isSubmitting || loadingStudentWorkouts || isDuplicate;

                    const buttonNode = (
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDuplicate && setSelectedDayOfWeek(d.value)}
                        className={cn(
                          "w-full py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 min-h-[46px]",
                          isDuplicate
                            ? "bg-destructive/10 dark:bg-destructive/15 border-dashed border-destructive/40 text-muted-foreground/60 cursor-not-allowed opacity-75"
                            : isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/30 cursor-pointer"
                              : "bg-muted/10 border-border/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground cursor-pointer"
                        )}
                      >
                        <span className={cn("text-[10px] uppercase font-black", isDuplicate && "line-through opacity-70")}>
                          {d.short}
                        </span>
                        {isDuplicate ? (
                          <span className="text-[8px] font-extrabold text-destructive leading-none tracking-tighter">
                            Já existe
                          </span>
                        ) : isSelected ? (
                          <span className="size-1 rounded-full bg-primary-foreground mt-0.5" />
                        ) : null}
                      </button>
                    );

                    if (isDuplicate) {
                      return (
                        <Tooltip key={d.value}>
                          <TooltipTrigger asChild>
                            <div className="w-full">{buttonNode}</div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="text-[11px] max-w-[210px] text-center p-2.5 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                          >
                            <div className="font-bold text-destructive flex items-center justify-center gap-1 mb-0.5">
                              <AlertCircle className="size-3.5" />
                              <span>Treino já cadastrado</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              O mesmo treino (nome &quot;{dayInfo?.existingWorkoutName || customName}&quot; e mesmos exercícios) já existe na {d.label}.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={d.value}>{buttonNode}</div>;
                  })}
                </div>
              </TooltipProvider>

              {/* Feedback banners for duplicate status */}
              {allDaysDisabled ? (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 font-medium mt-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
                  <div className="space-y-0.5">
                    <div className="font-bold leading-tight">Treino já presente em todos os dias</div>
                    <div className="text-[11px] opacity-90 leading-tight">
                      Este aluno já possui este mesmo treino (mesmo nome e exercícios) cadastrado de Segunda a Domingo. Altere o nome do treino ou selecione/remova exercícios para poder duplicá-lo.
                    </div>
                  </div>
                </div>
              ) : Object.keys(disabledDaysInfo).length > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                  <Info className="size-3.5 text-amber-500 shrink-0" />
                  <span>
                    Dias com etiqueta <span className="font-bold text-destructive">Já existe</span> estão desabilitados pois já contêm este treino idêntico.
                  </span>
                </div>
              ) : null}
            </div>

            {/* Step 3: Observations Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                3. Observações dos Exercícios
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleToggleIncludeObservations(true)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    includeObservations
                      ? "bg-primary/10 border-primary ring-1 ring-primary/20 text-foreground"
                      : "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground"
                  )}
                >
                  <MessageSquareText
                    className={cn(
                      "size-5 shrink-0 mt-0.5",
                      includeObservations ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div className="text-xs font-bold leading-tight">Duplicar COM Observações</div>
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Mantém notas e orientações nos exercícios
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleToggleIncludeObservations(false)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    !includeObservations
                      ? "bg-primary/10 border-primary ring-1 ring-primary/20 text-foreground"
                      : "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground"
                  )}
                >
                  <MessageSquareOff
                    className={cn(
                      "size-5 shrink-0 mt-0.5",
                      !includeObservations ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div className="text-xs font-bold leading-tight">Duplicar SEM Observações</div>
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Limpa as anotações específicas dos exercícios
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SALVAR COMO MODELO PRONTO */}
          <TabsContent value="SAVE_AS_TEMPLATE" className="space-y-4 focus-visible:outline-none">
            {/* Step 1: Template Name */}
            <div className="space-y-2">
              <Label htmlFor="templateName" className="text-xs font-bold text-foreground">
                1. Nome do Modelo na Biblioteca
              </Label>
              <Input
                id="templateName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Treino A - Hipertrofia Peito"
                disabled={isSubmitting}
                className="h-10 text-xs rounded-xl border-border bg-muted/10 font-bold"
              />
            </div>

            {/* Observations Choice */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                2. Observações dos Exercícios
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleToggleIncludeObservations(true)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    includeObservations
                      ? "bg-primary/10 border-primary ring-1 ring-primary/20 text-foreground"
                      : "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground"
                  )}
                >
                  <MessageSquareText
                    className={cn(
                      "size-5 shrink-0 mt-0.5",
                      includeObservations ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div className="text-xs font-bold leading-tight">Manter Observações</div>
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Preserva instruções padrão no modelo
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleToggleIncludeObservations(false)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    !includeObservations
                      ? "bg-primary/10 border-primary ring-1 ring-primary/20 text-foreground"
                      : "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground"
                  )}
                >
                  <MessageSquareOff
                    className={cn(
                      "size-5 shrink-0 mt-0.5",
                      !includeObservations ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div className="text-xs font-bold leading-tight">Remover Observações</div>
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Cria modelo limpo para personalizar depois
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3: Workout Configuration Fields */}
            <div className="space-y-3 p-3.5 rounded-xl border border-border/50 bg-muted/10 dark:bg-zinc-900/20">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="size-3.5 text-primary" />
                <span>3. Configurações Globais do Treino</span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Objetivo</Label>
                  <Select value={customGoal} onValueChange={setCustomGoal} disabled={isSubmitting}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-border w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_GOALS.map((g) => (
                        <SelectItem key={g} value={g} className="text-xs cursor-pointer">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Nível / Dificuldade
                  </Label>
                  <Select
                    value={customDifficulty}
                    onValueChange={setCustomDifficulty}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-lg border-border w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_DIFFICULTIES.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs cursor-pointer">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Duração Prevista
                  </Label>
                  <Select
                    value={customDuration}
                    onValueChange={setCustomDuration}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-lg border-border w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_DURATIONS.map((dur) => (
                        <SelectItem key={dur} value={dur} className="text-xs cursor-pointer">
                          {dur}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Descanso Entre Exercícios
                  </Label>
                  <RestTimeInput
                    value={customRestBetweenExercises}
                    onChange={setCustomRestBetweenExercises}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Student Permissions */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <Label className="text-[11px] font-bold text-foreground">
                  Permissões de Execução do Aluno
                </Label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={allowRepsModification}
                      onCheckedChange={(c) => setAllowRepsModification(!!c)}
                      disabled={isSubmitting}
                    />
                    <span>Permitir que o aluno altere repetições e cargas durante o treino</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={allowSkipExercises}
                      onCheckedChange={(c) => setAllowSkipExercises(!!c)}
                      disabled={isSubmitting}
                    />
                    <span>Permitir que o aluno pule exercícios</span>
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SHARED SECTION: EXPANDABLE EXERCISE CUSTOMIZATION */}
          <div className="pt-2 border-t border-border/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <Dumbbell className="size-3.5 text-primary" />
                <span>
                  Exercícios do Treino ({activeExerciseCount}/{totalExerciseCount})
                </span>
                {showAdvancedConfig ? (
                  <ChevronUp className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                )}
              </button>

              {showAdvancedConfig && totalExerciseCount > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllExercisesExpanded}
                    className="h-6 text-[11px] font-semibold px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ChevronsUpDown className="size-3 mr-1" />
                    {expandedExerciseIds.length === totalExerciseCount
                      ? "Recolher todos"
                      : "Expandir todos"}
                  </Button>
                </div>
              )}
            </div>

            {showAdvancedConfig && (
              <div className="space-y-2 bg-muted/20 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-border/40 max-h-64 overflow-y-auto scrollbar-thin">
                {!workout?.exercises || workout.exercises.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum exercício cadastrado no treino original.
                  </p>
                ) : (
                  workout.exercises.map((we: any, idx: number) => {
                    const isIncluded = !excludedExerciseIds.includes(we.id);
                    const isExpanded = expandedExerciseIds.includes(we.id);
                    const defaultReps = simplifyCommaSeparatedString(we.reps ? String(we.reps) : "10") || "10";
                    const defaultLoad = simplifyCommaSeparatedString(we.load ? String(we.load) : "");
                    const defaultRest = simplifyCommaSeparatedString(we.rest ? String(we.rest) : "01:00") || "01:00";
                    const cfg = exerciseConfigs[we.id] || {
                      sets: we.sets ?? 4,
                      reps: defaultReps,
                      load: defaultLoad,
                      rest: defaultRest,
                      description: we.description ? String(we.description) : "",
                    };

                    return (
                      <div
                        key={we.id}
                        className={cn(
                          "rounded-xl border transition-all overflow-hidden",
                          isIncluded
                            ? isExpanded
                              ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                              : "bg-card border-border/70 hover:border-border"
                            : "bg-muted/30 border-transparent opacity-60"
                        )}
                      >
                        {/* Header Row */}
                        <div
                          className="flex items-center justify-between p-2.5 gap-2 cursor-pointer select-none"
                          onClick={() => toggleExerciseExpanded(we.id)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Checkbox
                                checked={isIncluded}
                                onCheckedChange={() => toggleExerciseInclusion(we.id)}
                                disabled={isSubmitting}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={cn(
                                    "font-bold text-xs truncate",
                                    !isIncluded && "line-through text-muted-foreground"
                                  )}
                                >
                                  {idx + 1}. {we.exercise?.name || we.name}
                                </span>
                                {we.exercise?.muscleGroup?.name && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 px-1 py-0 font-normal bg-muted/30"
                                  >
                                    {we.exercise.muscleGroup.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Summary + Expand indicator */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isIncluded && (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-bold h-5 px-1.5 bg-primary/10 text-primary border-primary/20"
                                >
                                  {cfg.sets}x {cfg.reps}
                                </Badge>
                                {cfg.load && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold h-5 px-1.5 hidden sm:inline-flex"
                                  >
                                    {cfg.load}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExerciseExpanded(we.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Configuration Panel */}
                        {isExpanded && isIncluded && (
                          <div
                            className="p-3 pt-2.5 border-t border-border/40 bg-muted/15 dark:bg-zinc-900/40 space-y-3 animate-in fade-in-50 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {/* Sets */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <Repeat className="size-3 text-primary" /> Séries
                                </Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={cfg.sets}
                                  onChange={(e) =>
                                    handleUpdateExerciseField(
                                      we.id,
                                      "sets",
                                      e.target.value === "" ? "" : Number(e.target.value)
                                    )
                                  }
                                  disabled={isSubmitting}
                                  className="h-8 text-xs! rounded-lg border-border font-bold bg-background"
                                />
                              </div>

                              {/* Reps */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <span>Repetições</span>
                                </Label>
                                <Input
                                  value={cfg.reps}
                                  placeholder="Ex: 10-12"
                                  onChange={(e) =>
                                    handleUpdateExerciseField(we.id, "reps", e.target.value)
                                  }
                                  disabled={isSubmitting}
                                  className="h-8 text-xs! rounded-lg border-border font-bold bg-background"
                                />
                              </div>

                              {/* Load */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <Weight className="size-3 text-primary" /> Carga
                                </Label>
                                <Input
                                  value={cfg.load}
                                  placeholder="Ex: 20 kg"
                                  onChange={(e) =>
                                    handleUpdateExerciseField(we.id, "load", e.target.value)
                                  }
                                  disabled={isSubmitting}
                                  className="h-8 text-xs! rounded-lg border-border font-medium bg-background"
                                />
                              </div>

                              {/* Rest */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <Timer className="size-3 text-primary" /> Descanso
                                </Label>
                                <RestTimeInput
                                  value={cfg.rest}
                                  onChange={(val) =>
                                    handleUpdateExerciseField(we.id, "rest", val)
                                  }
                                  disabled={isSubmitting}
                                  className="h-8 text-xs rounded-lg border-border bg-background"
                                />
                              </div>
                            </div>

                            {/* Exercise Note / Description */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground">
                                Observação / Instruções do Exercício
                              </Label>
                              <Input
                                value={cfg.description}
                                placeholder="Ex: Pico de contração 2s, drop-set na última série..."
                                onChange={(e) =>
                                  handleUpdateExerciseField(we.id, "description", e.target.value)
                                }
                                disabled={isSubmitting}
                                className="h-8 text-xs! rounded-lg border-border bg-background"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Tabs>

        {/* Footer Actions with Visual Loading Feedback */}
        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleDuplicateSubmit}
            disabled={
              isSubmitting ||
              (activeTab === "DUPLICATE_TO_STUDENT" &&
                (allDaysDisabled || isCurrentSelectedDayDuplicate || loadingStudentWorkouts))
            }
            className="w-full sm:w-auto h-10 text-xs font-bold rounded-xl px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin shrink-0" />
                <span>
                  {activeTab === "DUPLICATE_TO_STUDENT"
                    ? "Duplicando Treino..."
                    : "Salvando Modelo..."}
                </span>
              </>
            ) : (
              <>
                <Check className="size-4 shrink-0" />
                <span>
                  {activeTab === "DUPLICATE_TO_STUDENT"
                    ? "Confirmar e Duplicar Treino"
                    : "Salvar Modelo na Biblioteca"}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
