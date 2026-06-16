"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Plus,
  Dumbbell,
  Clock,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  MessageSquarePlus,
  Activity,
  PlaySquare,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Send,
  Check,
  CheckCircle2,
  Timer
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExerciseThumbnail, ExercisePreviewModal } from "@/components/application/exercise-preview-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function WorkoutsPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  // Excluir workout alert dialog state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);

  const [workoutSearch, setWorkoutSearch] = useState("");
  const [workoutFilter, setWorkoutFilter] = useState<string>("all");

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState<string>("all");

  // Exercise Request State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestMuscleGroupId, setRequestMuscleGroupId] = useState("");
  const [requestVideoUrl, setRequestVideoUrl] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [requestedExercises, setRequestedExercises] = useState<any[]>([]);
  const [loadingRequested, setLoadingRequested] = useState(true);

  // Exercise Adjustment Requests State
  const [adjustmentRequests, setAdjustmentRequests] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedExerciseForAdjustment, setSelectedExerciseForAdjustment] = useState<any>(null);
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);

  // Adjustment Chat States
  const [isAdjustmentDetailModalOpen, setIsAdjustmentDetailModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null);
  const [newAdjustmentMessage, setNewAdjustmentMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState(false);

  const [dbExercises, setDbExercises] = useState<any[]>([]);
  const [loadingDbExercises, setLoadingDbExercises] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Exercise Preview State
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Fetch approved/official exercises
  const fetchDbExercises = async () => {
    try {
      setLoadingDbExercises(true);
      const res = await fetch("/api/personal/workouts/exercises");
      if (res.ok) {
        const data = await res.json();
        setDbExercises(data);
      }
    } catch (error) {
      console.error("Error loading exercises from DB:", error);
    } finally {
      setLoadingDbExercises(false);
    }
  };

  // Fetch requested exercises
  const fetchRequestedExercises = async () => {
    try {
      setLoadingRequested(true);
      const res = await fetch("/api/personal/workouts/exercises?requested=true");
      if (res.ok) {
        const data = await res.json();
        setRequestedExercises(data);
      }
    } catch (error) {
      console.error("Error loading requested exercises:", error);
    } finally {
      setLoadingRequested(false);
    }
  };

  // Fetch adjustment requests
  const fetchAdjustmentRequests = async () => {
    try {
      setLoadingAdjustments(true);
      const res = await fetch("/api/personal/workouts/exercises/adjustments");
      if (res.ok) {
        const data = await res.json();
        setAdjustmentRequests(data);
        // Sync active modal if it is open
        if (selectedAdjustment) {
          const updated = data.find((a: any) => a.id === selectedAdjustment.id);
          if (updated) {
            setSelectedAdjustment(updated);
          }
        }
      }
    } catch (error) {
      console.error("Error loading adjustments:", error);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  // Fetch muscle groups & requests to populate dropdown and list
  useEffect(() => {
    // Reset states to avoid stale data flash on workspace change
    setDbExercises([]);
    setRequestedExercises([]);
    setAdjustmentRequests([]);

    const fetchMuscleGroups = async () => {
      try {
        const res = await fetch("/api/personal/workouts/muscle-groups");
        if (res.ok) {
          const data = await res.json();
          setMuscleGroups(data);
          if (data.length > 0) {
            setRequestMuscleGroupId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading muscle groups:", error);
      }
    };
    fetchMuscleGroups();
    fetchRequestedExercises();
    fetchAdjustmentRequests();
    fetchDbExercises();
  }, [activeWorkspaceId]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim()) {
      toast.error("Por favor, informe o nome do exercício.");
      return;
    }
    if (!requestMuscleGroupId) {
      toast.error("Por favor, selecione um grupamento muscular.");
      return;
    }

    try {
      setRequestSubmitting(true);
      const res = await fetch("/api/personal/workouts/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: requestName,
          muscleGroupId: requestMuscleGroupId,
          videoUrl: requestVideoUrl,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Erro ao solicitar exercício.");
      }

      toast.success("Solicitação enviada com sucesso! Aguarde a aprovação do SuperAdmin.");
      setRequestName("");
      setRequestVideoUrl("");
      setIsRequestModalOpen(false);
      fetchRequestedExercises();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao solicitar exercício.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentDescription.trim()) {
      toast.error("Por favor, descreva o problema.");
      return;
    }
    if (!selectedExerciseForAdjustment) return;

    // Prevent duplicate pending adjustment requests
    const hasPending = adjustmentRequests.some(
      (req) => req.exerciseId === selectedExerciseForAdjustment.id && req.status === "PENDING"
    );
    if (hasPending) {
      toast.warning("Você já possui uma solicitação de reajuste em andamento para este exercício.");
      return;
    }

    try {
      setAdjustmentSubmitting(true);
      const res = await fetch("/api/personal/workouts/exercises/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: selectedExerciseForAdjustment.id,
          description: adjustmentDescription,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Erro ao solicitar reajuste.");
      }

      toast.success("Solicitação de reajuste enviada!");
      setAdjustmentDescription("");
      setIsAdjustmentModalOpen(false);
      fetchAdjustmentRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao solicitar reajuste.");
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdjustmentMessage.trim() || !selectedAdjustment) return;

    try {
      setSendingMessage(true);
      const res = await fetch(`/api/personal/workouts/exercises/adjustments/${selectedAdjustment.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newAdjustmentMessage }),
      });

      if (!res.ok) {
        throw new Error("Erro ao enviar mensagem.");
      }

      setNewAdjustmentMessage("");
      await fetchAdjustmentRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao enviar mensagem.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResolveRequest = async () => {
    if (!selectedAdjustment) return;

    try {
      setResolvingRequest(true);
      const res = await fetch(`/api/personal/workouts/exercises/adjustments/${selectedAdjustment.id}/resolve`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Erro ao resolver solicitação.");
      }

      toast.success("Solicitação finalizada com sucesso!");
      setIsAdjustmentDetailModalOpen(false);
      setSelectedAdjustment(null);
      await fetchAdjustmentRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao finalizar solicitação.");
    } finally {
      setResolvingRequest(false);
    }
  };


  // Load workouts from the API
  const fetchWorkouts = async () => {
    if (!activeWorkspaceId) {
      setLoadingWorkouts(false);
      return;
    }
    try {
      setLoadingWorkouts(true);
      const res = await fetch(`/api/personal/workouts?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar treinos.");
      }
      const data = await res.json();
      setWorkouts(data);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar modelos de treinos.");
    } finally {
      setLoadingWorkouts(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [activeWorkspaceId]);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/personal/workouts/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Erro ao duplicar treino.");
      }
      toast.success("Treino duplicado com sucesso!");
      fetchWorkouts();
    } catch (error) {
      console.error(error);
      toast.error("Falha ao duplicar treino.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;
    try {
      const res = await fetch(`/api/personal/workouts/${workoutToDelete}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Erro ao excluir treino.");
      }
      toast.success("Modelo de treino excluído!");
      setWorkouts((prev) => prev.filter((w) => w.id !== workoutToDelete));
      setIsDeleteAlertOpen(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao excluir treino.");
    }
  };

  const filteredWorkouts = workouts.filter((workout) => {
    const matchesSearch = workout.name.toLowerCase().includes(workoutSearch.toLowerCase());
    const matchesFilter = workoutFilter === "all" ? true : workout.goal === workoutFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredExercises = dbExercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    let matchesFilter = true;
    if (exerciseFilter !== "all") {
      const exerciseMuscleName = exercise.muscleGroup?.name?.toLowerCase() || "";
      const filterLower = exerciseFilter.toLowerCase();
      if (filterLower === "peito") {
        matchesFilter = exerciseMuscleName.includes("peito") || exerciseMuscleName.includes("peitoral");
      } else {
        matchesFilter = exerciseMuscleName.includes(filterLower);
      }
    }
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Treinos e Exercícios</h2>
          <p className="text-muted-foreground mt-1">Gerencie seus treinos personalizados e a biblioteca de exercícios.</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
          <TabsTrigger value="templates">Treinos Prontos</TabsTrigger>
          <TabsTrigger value="exercises">Biblioteca de Exercícios</TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: TREINOS PRONTOS 
            ========================================================================= */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg w-full lg:flex-1 lg:min-w-0 overflow-x-auto no-scrollbar">
              {["all", "Hipertrofia", "Emagrecimento", "Força", "Resistência"].map((focus) => (
                <Button
                  key={focus}
                  variant={workoutFilter === focus ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-8 rounded-md px-3 whitespace-nowrap", workoutFilter === focus && "bg-background shadow-sm")}
                  onClick={() => setWorkoutFilter(focus)}
                >
                  {focus === "all" ? "Todos" : focus}
                </Button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 lg:ml-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar treino..."
                  className="pl-9 bg-card border-border h-10"
                  value={workoutSearch}
                  onChange={(e) => setWorkoutSearch(e.target.value)}
                />
              </div>
              <Button className="shrink-0 gap-2 h-10 w-full sm:w-auto" asChild>
                <Link href="/personal/workouts/new">
                  <Plus className="size-4" />
                  <span className="inline">Novo Treino</span>
                </Link>
              </Button>
            </div>
          </div>

          {loadingWorkouts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-0 border border-neutral-800 bg-neutral-950/40 rounded-2xl">
                  <CardContent className="p-5 flex flex-col justify-between gap-4 h-full min-h-[160px]">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-2/3 rounded-lg bg-neutral-900 animate-pulse" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded bg-neutral-900 animate-pulse" />
                        <Skeleton className="h-5 w-24 rounded-full bg-neutral-900 animate-pulse" />
                      </div>
                    </div>
                    <div className="border-t border-neutral-900/50 pt-4 flex justify-between items-center mt-2">
                      <div className="flex gap-3">
                        <Skeleton className="h-4 w-12 rounded bg-neutral-900 animate-pulse" />
                        <Skeleton className="h-4 w-12 rounded bg-neutral-900 animate-pulse" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded bg-neutral-900 animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {filteredWorkouts.length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl bg-secondary/10">
                  <p className="text-muted-foreground font-medium">Nenhum treino encontrado.</p>
                </div>
              ) : (
                filteredWorkouts.map((workout) => (
                  <motion.div key={workout.id} variants={item as any}>
                    <Card className="hover:border-primary/50 transition-all duration-300 p-0 shadow-sm hover:shadow-md">
                      <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1.5 pr-4">
                            <h3 className="font-semibold text-lg leading-tight">{workout.name}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                                {workout.goal}
                              </Badge>
                              {workout.muscleGroupLabel && (
                                <Badge variant="outline" className="text-xs bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                                  {workout.muscleGroupLabel}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                                {workout.difficulty}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground shrink-0">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem asChild>
                                <Link href={`/personal/workouts/${workout.id}/edit`}>
                                  <Edit2 className="mr-2 size-4" /> Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(workout.id)}>
                                <Copy className="mr-2 size-4" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive cursor-pointer"
                                onClick={() => {
                                  setWorkoutToDelete(workout.id);
                                  setIsDeleteAlertOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 size-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>


                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3.5" />
                              <span>{workout.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Dumbbell className="size-3.5" />
                              <span>{workout.exercises?.length || 0} exs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Timer className="size-3.5" />
                              <span>{workout.restBetweenExercises || "2 min"}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-md shrink-0" asChild>
                            <Link href={`/personal/workouts/${workout.id}`}>
                              <span>Visualizar</span>
                              <Eye className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="exercises" className="space-y-6">
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full max-w-250 min-w-0">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg max-w-250! w-full min-w-0 overflow-x-auto no-scrollbar">
              {["all", "Trapézio", "Ombro", "Costas", "Peito", "Tríceps", "Bíceps", "Abdomen", "Antebraço", "Glúteo", "Posterior de perna", "Quadríceps", "Panturrilha"].map((muscle) => (
                <Button
                  key={muscle}
                  variant={exerciseFilter === muscle ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-8 rounded-md px-3 whitespace-nowrap", exerciseFilter === muscle && "bg-background shadow-sm")}
                  onClick={() => setExerciseFilter(muscle)}
                >
                  {muscle === "all" ? "Todos" : muscle}
                </Button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 lg:ml-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar exercício..."
                  className="pl-9 bg-card border-border h-10"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="shrink-0 gap-2 h-10 flex-1 sm:flex-initial text-muted-foreground border-border/50 hover:bg-secondary/15"
                  disabled={refreshing}
                  onClick={async () => {
                    try {
                      setRefreshing(true);
                      await Promise.all([
                        fetchRequestedExercises(),
                        fetchAdjustmentRequests()
                      ]);
                      toast.success("Solicitações e mensagens atualizadas!");
                    } catch (error) {
                      console.error("Erro ao atualizar:", error);
                      toast.error("Erro ao atualizar solicitações.");
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                >
                  <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                  <span>{refreshing ? "Atualizando..." : "Atualizar"}</span>
                </Button>
                <Button
                  variant="outline"
                  className="shrink-0 gap-2 h-10 flex-1 sm:flex-initial text-primary border-primary/20 hover:bg-primary/10"
                  onClick={() => setIsRequestModalOpen(true)}
                >
                  <MessageSquarePlus className="size-4" />
                  <span className="inline">Solicitar Exercício</span>
                </Button>
              </div>
            </div>
          </div>

          {adjustmentRequests.length > 0 && (
            <div className="space-y-4 p-5 rounded-xl border border-border/80 bg-card/25 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
                  <RefreshCw className="size-4.5 text-primary" />
                  Solicitações de Reajuste de Exercícios
                </h3>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-2.5">
                  {adjustmentRequests.length} {adjustmentRequests.length === 1 ? "solicitação" : "solicitações"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {adjustmentRequests.map((request) => {
                  const unreadMessagesCount = request.messages.filter(
                    (m: any) => m.senderId !== request.requesterId && !m.isReadByTrainer
                  ).length;

                  return (
                    <div
                      key={request.id}
                      className="p-4 rounded-xl border border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-all flex items-center justify-between gap-4 min-w-0 cursor-pointer relative"
                      onClick={() => {
                        setSelectedAdjustment(request);
                        setIsAdjustmentDetailModalOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0 border border-border/20 relative">
                          <AlertTriangle className="size-4 text-muted-foreground/60" />
                          {unreadMessagesCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                              {unreadMessagesCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate text-foreground leading-snug">
                            {request.exercise?.name || "Exercício"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {request.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full shrink-0 border font-medium bg-transparent shadow-none",
                          request.status === "PENDING" && "text-amber-500 border-amber-500/20 bg-amber-500/5",
                          request.status === "RESOLVED" && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                        )}
                      >
                        {request.status === "PENDING" ? "Em Aberto" : "Resolvido"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {requestedExercises.length > 0 && (
            <div className="space-y-4 p-5 rounded-xl border border-border/80 bg-card/25 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
                  <MessageSquarePlus className="size-4.5 text-primary" />
                  Exercícios Solicitados
                </h3>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-2.5">
                  {requestedExercises.length} {requestedExercises.length === 1 ? "solicitação" : "solicitações"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {requestedExercises.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-xl border border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-all flex items-center justify-between gap-4 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0 border border-border/20">
                        <PlaySquare className="size-4 text-muted-foreground/60" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate text-foreground leading-snug">{request.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Activity className="size-3 shrink-0" />
                          <span className="truncate">{request.muscleGroup?.name || "Sem grupo"}</span>
                          {request.videoUrl && (
                            <span className="flex items-center gap-1 text-primary/80 border-l border-border/60 pl-1.5 shrink-0">
                              Vídeo
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full shrink-0 border font-medium bg-transparent shadow-none",
                        request.status === "PENDING" && "text-amber-500 border-amber-500/20 bg-amber-500/5",
                        request.status === "APPROVED" && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
                        request.status === "REJECTED" && "text-rose-500 border-rose-500/20 bg-rose-500/5"
                      )}
                    >
                      {request.status === "PENDING" && "Pendente"}
                      {request.status === "APPROVED" && "Aprovado"}
                      {request.status === "REJECTED" && "Recusado"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {filteredExercises.length === 0 ? (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl bg-secondary/10">
                <p className="text-muted-foreground font-medium">Nenhum exercício encontrado.</p>
              </div>
            ) : (
              filteredExercises.map((exercise) => (
                <motion.div key={exercise.id} variants={item as any}>
                  <Card className="hover:bg-card/60 transition-colors duration-200 p-0">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div
                        className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          setPreviewExercise(exercise);
                          setIsPreviewModalOpen(true);
                        }}
                      >
                        <ExerciseThumbnail videoUrl={exercise.videoUrl} className="size-12 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">{exercise.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Activity className="size-3" />
                              {exercise.muscleGroup?.name || "Geral"}
                            </span>
                            <span className="flex items-center gap-1">
                              <PlaySquare className="size-3" />
                              {exercise.videoUrl ? "Demonstração em Vídeo" : "Sem Vídeo"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary hover:text-primary-foreground hover:bg-primary gap-1 shrink-0 h-8 px-2.5 rounded-md cursor-pointer"
                        onClick={() => {
                          const hasPending = adjustmentRequests.some(
                            (req) => req.exerciseId === exercise.id && req.status === "PENDING"
                          );
                          if (hasPending) {
                            toast.warning("Você já possui uma solicitação de reajuste em andamento para este exercício. Ela precisa ser concluída antes de iniciar uma nova.");
                            return;
                          }
                          setSelectedExerciseForAdjustment(exercise);
                          setIsAdjustmentModalOpen(true);
                        }}
                      >
                        <RefreshCw className="size-3" />
                        <span>Reajustar</span>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Modal: Solicitar Novo Exercício */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl">
          <DialogHeader>
            <DialogTitle>Solicitar Novo Exercício</DialogTitle>
            <DialogDescription>
              Solicite um novo exercício para a biblioteca geral. Ele ficará pendente de aprovação pelo SuperAdmin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="request-name">Nome do Exercício</Label>
              <Input
                id="request-name"
                placeholder="Ex: Supino Inclinado com Halteres"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                className="bg-background border-border h-11"
                required
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="request-muscle">Grupamento Muscular</Label>
              <Select value={requestMuscleGroupId} onValueChange={setRequestMuscleGroupId}>
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-video">Link do Vídeo de Demonstração (Opcional)</Label>
              <Input
                id="request-video"
                type="url"
                placeholder="Ex: https://youtube.com/..."
                value={requestVideoUrl}
                onChange={(e) => setRequestVideoUrl(e.target.value)}
                className="bg-background border-border h-11"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRequestModalOpen(false)}
                disabled={requestSubmitting}
                className="h-11"
              >
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 h-11" disabled={requestSubmitting}>
                {requestSubmitting && <Loader2 className="animate-spin size-4" />}
                {requestSubmitting ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Solicitar Reajuste de Exercício */}
      <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="size-5 text-primary animate-spin-slow" />
              Solicitar Reajuste de Exercício
            </DialogTitle>
            <DialogDescription>
              Descreva o problema ou a melhoria necessária para o exercício{" "}
              <span className="font-semibold text-foreground">
                {selectedExerciseForAdjustment?.name}
              </span>
              . Sua mensagem será enviada para o SuperAdmin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="adjustment-description">Descrição do Problema / Sugestão</Label>
              <textarea
                id="adjustment-description"
                placeholder="Descreva detalhadamente o problema ou o que deve ser alterado (ex: o link do vídeo está quebrado, a descrição muscular está incorreta...)"
                value={adjustmentDescription}
                onChange={(e) => setAdjustmentDescription(e.target.value)}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-background border-border"
                required
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdjustmentModalOpen(false);
                  setSelectedExerciseForAdjustment(null);
                  setAdjustmentDescription("");
                }}
                disabled={adjustmentSubmitting}
                className="h-11"
              >
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 h-11" disabled={adjustmentSubmitting}>
                {adjustmentSubmitting && <Loader2 className="animate-spin size-4" />}
                {adjustmentSubmitting ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sheet: Detalhes e Chat de Reajuste */}
      <Sheet
        open={isAdjustmentDetailModalOpen}
        onOpenChange={(open) => {
          setIsAdjustmentDetailModalOpen(open);
          if (!open) {
            setSelectedAdjustment(null);
            fetchAdjustmentRequests(); // Refetch to clear read flags
          }
        }}
      >
        <SheetContent side="right" className="max-w-2xl! w-full border-l border-white/8 bg-zinc-950/95 backdrop-blur-md flex flex-col h-full p-0 overflow-hidden text-foreground">
          {selectedAdjustment && (
            <>
              <SheetHeader className="p-6 border-b border-white/4 bg-zinc-900/10">
                <SheetTitle className="flex items-center gap-3.5 justify-between">
                  <span className="truncate text-white font-extrabold tracking-tight">Reajuste: {selectedAdjustment.exercise?.name}</span>
                  <Badge
                    className={cn(
                      "text-[10px] px-2.5 py-0.5 rounded-full shrink-0 border font-bold bg-transparent shadow-none tracking-wider",
                      selectedAdjustment.status === "PENDING" && "text-amber-400 border-amber-500/25 bg-amber-500/5",
                      selectedAdjustment.status === "RESOLVED" && "text-emerald-400 border-emerald-500/25 bg-emerald-500/5"
                    )}
                  >
                    {selectedAdjustment.status === "PENDING" ? "Em Aberto" : "Resolvido"}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-400 mt-1 font-medium">
                  Criada em {new Date(selectedAdjustment.createdAt).toLocaleDateString("pt-BR")} às {new Date(selectedAdjustment.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                </SheetDescription>
              </SheetHeader>

              {/* Chat Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-zinc-950/20">
                {/* Motivo Original */}
                <div className="flex flex-col gap-2 p-4 rounded-xl border border-white/[0.05] bg-zinc-900/40 backdrop-blur-sm shadow-inner">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Motivo da Solicitação</span>
                  <p className="text-sm text-zinc-200 leading-relaxed font-medium">{selectedAdjustment.description}</p>
                </div>

                <div className="relative flex items-center justify-center my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/[0.04]" />
                  </div>
                  <span className="relative bg-zinc-950 px-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    Conversa com o Administrador
                  </span>
                </div>

                {/* Messages Thread */}
                {selectedAdjustment.messages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500 font-medium italic">
                    Nenhuma mensagem enviada ainda. Aguarde a resposta do SuperAdmin.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedAdjustment.messages.map((message: any) => {
                      const isMe = message.senderId !== null && message.sender?.role !== "SUPERADMIN";
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col max-w-[85%] rounded-2xl px-4 py-3 shadow-md text-sm leading-relaxed transition-all",
                            isMe
                              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto rounded-tr-none shadow-blue-500/10"
                              : "bg-zinc-900/90 border border-white/[0.04] text-zinc-100 mr-auto rounded-tl-none"
                          )}
                        >
                          <span className="text-[9px] opacity-75 mb-1.5 font-bold uppercase tracking-wider">
                            {isMe ? "Você" : "SuperAdmin"}
                          </span>
                          <p className="font-medium whitespace-pre-wrap">{message.message}</p>
                          <span className="text-[8px] opacity-60 mt-1.5 self-end font-semibold">
                            {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer / Input Bar */}
              <div className="p-5 border-t border-white/[0.04] bg-zinc-900/10 flex flex-col gap-3">
                {selectedAdjustment.status === "PENDING" ? (
                  <>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Digite sua resposta..."
                        value={newAdjustmentMessage}
                        onChange={(e) => setNewAdjustmentMessage(e.target.value)}
                        className="bg-zinc-900/50 border-white/[0.06] focus:border-blue-500/50 h-10 flex-1 rounded-xl"
                        disabled={sendingMessage}
                      />
                      <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-500 rounded-xl" disabled={sendingMessage}>
                        {sendingMessage ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </Button>
                    </form>
                    <Button
                      variant="outline"
                      onClick={handleResolveRequest}
                      disabled={resolvingRequest}
                      className="w-full h-10 gap-2 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 font-semibold rounded-xl transition-all"
                    >
                      {resolvingRequest ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Satisfeito com a Resposta
                    </Button>
                  </>
                ) : (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="size-4" />
                    Esta solicitação foi marcada como resolvida.
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Modelo de Treino?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Tem certeza que deseja excluir este modelo de treino? Essa ação não poderá ser desfeita e removerá permanentemente o modelo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />
    </div>
  );
}
