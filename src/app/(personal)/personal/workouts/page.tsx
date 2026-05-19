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
  CheckCircle2
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
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

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
  }, []);

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
    try {
      setLoadingWorkouts(true);
      const res = await fetch("/api/personal/workouts");
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
  }, []);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo de treino?")) {
      return;
    }
    try {
      const res = await fetch(`/api/personal/workouts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Erro ao excluir treino.");
      }
      toast.success("Modelo de treino excluído!");
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
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
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
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
            <div className="relative w-full sm:w-64 ml-auto">
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

          {loadingWorkouts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando modelos de treinos...</p>
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
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(workout.id)}>
                                <Trash2 className="mr-2 size-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-4" />
                              <span>{workout.duration}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Dumbbell className="size-4" />
                              <span>{workout.exercises?.length || 0} exercícios</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-md" asChild>
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

        {/* =========================================================================
            TAB 2: BIBLIOTECA DE EXERCÍCIOS
            ========================================================================= */}
        <TabsContent value="exercises" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
              {["all", "Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", "Core"].map((muscle) => (
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
            <div className="relative w-full sm:w-64 ml-auto">
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
                onClick={async () => {
                  await Promise.all([
                    fetchRequestedExercises(),
                    fetchAdjustmentRequests()
                  ]);
                  toast.success("Solicitações e mensagens atualizadas!");
                }}
              >
                <RefreshCw className="size-4" />
                <span>Atualizar</span>
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

          {/* Seção de Solicitações de Reajuste */}
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

          {/* Seção de Exercícios Solicitados */}
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
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="size-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border/50">
                          <PlaySquare className="size-5 text-muted-foreground/50" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{exercise.name}</h4>
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
                        className="text-xs text-primary hover:text-primary-foreground hover:bg-primary gap-1 shrink-0 h-8 px-2.5 rounded-md"
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
                Enviar Solicitação
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
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes e Chat de Reajuste */}
      <Dialog 
        open={isAdjustmentDetailModalOpen} 
        onOpenChange={(open) => {
          setIsAdjustmentDetailModalOpen(open);
          if (!open) {
            setSelectedAdjustment(null);
            fetchAdjustmentRequests(); // Refetch to clear read flags
          }
        }}
      >
        <DialogContent className="max-w-md w-[95%] rounded-xl flex flex-col h-[550px] p-0 overflow-hidden">
          {selectedAdjustment && (
            <>
              <DialogHeader className="p-5 border-b border-border/60">
                <DialogTitle className="flex items-center gap-2 justify-between">
                  <span className="truncate">Reajuste: {selectedAdjustment.exercise?.name}</span>
                  <Badge 
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full shrink-0 border font-medium bg-transparent shadow-none",
                      selectedAdjustment.status === "PENDING" && "text-amber-500 border-amber-500/20 bg-amber-500/5",
                      selectedAdjustment.status === "RESOLVED" && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    )}
                  >
                    {selectedAdjustment.status === "PENDING" ? "Em Aberto" : "Resolvido"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Criada em {new Date(selectedAdjustment.createdAt).toLocaleDateString("pt-BR")} às {new Date(selectedAdjustment.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                </DialogDescription>
              </DialogHeader>

              {/* Chat Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/5">
                {/* Motivo Original */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Motivo da Solicitação:</span>
                  <p className="text-sm text-foreground leading-relaxed">{selectedAdjustment.description}</p>
                </div>

                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-widest">
                    Conversa com o Administrador
                  </span>
                </div>

                {/* Messages Thread */}
                {selectedAdjustment.messages.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Nenhuma mensagem enviada ainda. Aguarde a resposta do SuperAdmin.
                  </div>
                ) : (
                  selectedAdjustment.messages.map((message: any) => {
                    const isMe = message.senderId !== null && message.sender?.role !== "SUPERADMIN";
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex flex-col max-w-[80%] rounded-2xl p-3 shadow-sm text-sm leading-relaxed",
                          isMe 
                            ? "bg-primary text-primary-foreground ml-auto rounded-tr-none" 
                            : "bg-card border border-border text-foreground mr-auto rounded-tl-none"
                        )}
                      >
                        <span className="text-[10px] opacity-80 mb-1 font-semibold">
                          {isMe ? "Você" : "SuperAdmin"}
                        </span>
                        <p>{message.message}</p>
                        <span className="text-[9px] opacity-60 mt-1 self-end">
                          {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer / Input Bar */}
              <div className="p-4 border-t border-border/60 bg-background flex flex-col gap-3">
                {selectedAdjustment.status === "PENDING" ? (
                  <>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Digite sua resposta..."
                        value={newAdjustmentMessage}
                        onChange={(e) => setNewAdjustmentMessage(e.target.value)}
                        className="bg-card border-border h-10 flex-1"
                        disabled={sendingMessage}
                      />
                      <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={sendingMessage}>
                        {sendingMessage ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </Button>
                    </form>
                    <Button 
                      variant="outline" 
                      onClick={handleResolveRequest}
                      disabled={resolvingRequest}
                      className="w-full h-10 gap-2 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 font-medium"
                    >
                      {resolvingRequest ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Satisfeito com a Resposta
                    </Button>
                  </>
                ) : (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 className="size-4" />
                    Esta solicitação foi marcada como resolvida.
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
