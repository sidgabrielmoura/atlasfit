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
  PlaySquare,
  Eye,
  Loader2,
  Activity,
  Timer,
  Users
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
import { PersonalVideoLibrary } from "@/components/videos/personal-video-library";
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
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import type { GymWorkoutCard } from "@/modules/workspaces/domain/gym-workout-client";

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
}

export interface StudentOption {
  memberId: string;
  userId: string;
  name: string;
  registrationNumber: string | null;
}

interface GymWorkoutsClientProps {
  workspaceId: string;
  initialTemplates: GymWorkoutCard[];
  students: StudentOption[];
  availableExercises: ExerciseItem[];
  canManageWorkouts: boolean;
  meta: { total: number; page: number; limit: number; totalPages: number };
  initialSearch: string;
  initialGoal: string;
  initialDifficulty: string;
  actorUserId: string;
  canEditOthers: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const daysOfWeek = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" }
];

export function GymWorkoutsClient({
  workspaceId,
  initialTemplates,
  students: initialStudents,
  availableExercises: initialExercises,
  canManageWorkouts,
  meta,
  initialSearch,
  initialGoal,
  initialDifficulty,
  actorUserId,
  canEditOthers,
}: GymWorkoutsClientProps) {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspace = workspaceSnap.activeWorkspace;
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId || workspaceId;

  const [workouts, setWorkouts] = useState<any[]>(initialTemplates);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  // Filters
  const [workoutSearch, setWorkoutSearch] = useState(initialSearch);
  const [workoutFilter, setWorkoutFilter] = useState<string>(initialGoal === "ALL" ? "all" : initialGoal);

  // Delete Alert
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign to Student Modal
  const [assigningWorkout, setAssigningWorkout] = useState<any>(null);
  const [students, setStudents] = useState<StudentOption[]>(initialStudents);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentMemberId, setSelectedStudentMemberId] = useState("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState("FREE");
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Exercise Tab States
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState<string>("all");
  const [dbExercises, setDbExercises] = useState<any[]>([]);
  const [loadingDbExercises, setLoadingDbExercises] = useState(true);
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const fetchWorkouts = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingWorkouts(true);
      const res = await fetch(`/api/gym/workouts?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar treinos da academia.");
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

  // Load exercises for library tab
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoadingDbExercises(true);
        const params = new URLSearchParams({ workspaceId: activeWorkspaceId });
        if (exerciseSearch) params.set("search", exerciseSearch);
        const res = await fetch(`/api/gym/workouts/exercises?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDbExercises(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar biblioteca de exercícios:", err);
      } finally {
        setLoadingDbExercises(false);
      }
    };

    fetchExercises();
  }, [activeWorkspaceId, exerciseSearch]);

  const handleDuplicate = async (workoutId: string) => {
    try {
      const res = await fetch(`/api/gym/workouts/${workoutId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      });
      if (!res.ok) {
        throw new Error("Erro ao duplicar treino.");
      }
      toast.success("Modelo de treino duplicado com sucesso!");
      fetchWorkouts();
    } catch (error) {
      console.error(error);
      toast.error("Falha ao duplicar modelo.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/gym/workouts/${workoutToDelete}`, {
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
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAssignModal = async (workout: any) => {
    setAssigningWorkout(workout);
    setSelectedStudentMemberId("");
    setSelectedDayOfWeek("FREE");

    if (students.length === 0) {
      try {
        setLoadingStudents(true);
        const res = await fetch(`/api/gym/workouts/students?workspaceId=${activeWorkspaceId}`);
        if (res.ok) {
          const payload = await res.json();
          setStudents(payload.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    }
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningWorkout || !selectedStudentMemberId) {
      toast.error("Por favor, selecione um aluno.");
      return;
    }

    try {
      setSubmittingAssignment(true);
      const res = await fetch("/api/gym/workouts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          studentMemberId: selectedStudentMemberId,
          templateWorkoutId: assigningWorkout.id,
          idempotencyKey: crypto.randomUUID(),
          dayOfWeek: selectedDayOfWeek !== "FREE" ? Number(selectedDayOfWeek) : null,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao prescrever treino.");
      }

      toast.success("Ficha prescrita com sucesso para o aluno!");
      setAssigningWorkout(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao prescrever treino.");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const filteredWorkouts = workouts.filter((workout) => {
    const matchesSearch = workout.name.toLowerCase().includes(workoutSearch.toLowerCase());
    const matchesFilter = workoutFilter === "all" ? true : workout.goal === workoutFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredExercises = dbExercises.filter((exercise) => {
    if (exerciseFilter === "all") return true;
    const muscle = exercise.muscleGroup?.name || "";
    return muscle.toLowerCase() === exerciseFilter.toLowerCase();
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-400 mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Treinos e Exercícios</h2>
          <p className="text-muted-foreground mt-1">Gerencie os modelos de treinos e a biblioteca de exercícios da academia.</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="bg-muted p-1 border border-border rounded-xl flex overflow-x-auto no-scrollbar whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none scroll-smooth">
          <TabsTrigger value="templates" className="px-5">Treinos Prontos</TabsTrigger>
          <TabsTrigger value="exercises" className="px-5">Biblioteca de Exercícios</TabsTrigger>
          <TabsTrigger value="videos" className="px-5">Vídeos da Academia</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
            <Select value={workoutFilter} onValueChange={setWorkoutFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-10 bg-card border-border">
                <SelectValue placeholder="Filtrar por objetivo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Objetivos</SelectItem>
                <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                <SelectItem value="Força">Força</SelectItem>
                <SelectItem value="Resistência">Resistência</SelectItem>
                <SelectItem value="Condicionamento">Condicionamento</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 lg:ml-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar treino..."
                  className="pl-9 bg-card border-border h-10 text-xs"
                  value={workoutSearch}
                  onChange={(e) => setWorkoutSearch(e.target.value)}
                />
              </div>
              {canManageWorkouts && (
                <Button className="shrink-0 gap-2 h-10 w-full sm:w-auto" asChild>
                  <Link href="/gym/workouts/new">
                    <Plus className="size-4" />
                    <span className="inline">Novo Treino</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {loadingWorkouts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-0 border border-border bg-card/45 rounded-2xl overflow-hidden">
                  <Skeleton className="h-32 w-full bg-muted/60" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-2/3 rounded-lg bg-muted" />
                    <div className="border-t border-border/40 pt-3 flex justify-between items-center">
                      <div className="flex gap-3">
                        <Skeleton className="h-4 w-12 rounded bg-muted" />
                        <Skeleton className="h-4 w-12 rounded bg-muted" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded bg-muted" />
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
                    <Card className="hover:border-primary/50 gap-0 transition-all duration-300 p-0 shadow-sm hover:shadow-md overflow-hidden rounded-2xl group flex flex-col h-full bg-card">
                      {/* Workout Top Banner Cover */}
                      <div className="h-32 w-full overflow-hidden relative bg-muted/30 shrink-0">
                        {activeWorkspace?.workoutCoverUrl ? (
                          <img
                            src={activeWorkspace.workoutCoverUrl}
                            alt={workout.name}
                            className="size-full object-cover group-hover:scale-[1] scale-[1.05] transition-transform duration-500"
                          />
                        ) : (
                          <div className="size-full bg-gradient-to-br from-primary/15 via-secondary/40 to-card flex items-center justify-center relative overflow-hidden">
                            <Dumbbell className="size-16 text-primary/10 -rotate-12 absolute -bottom-2 -right-2" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />

                        {/* Dropdown Menu floating on top right */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-background/80 hover:bg-background backdrop-blur-md text-foreground shadow-sm shrink-0 border border-border/40"
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 border-border bg-card">
                              {canManageWorkouts && (canEditOthers || workout.creatorId === actorUserId) && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/gym/workouts/${workout.id}/edit`}>
                                    <Edit2 className="mr-2 size-4 text-muted-foreground" /> Editar modelo
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                                onClick={() => handleOpenAssignModal(workout)}
                              >
                                <Users className="mr-2 size-4 text-blue-500" /> Prescrever para Aluno
                              </DropdownMenuItem>
                              {canManageWorkouts && (
                                <DropdownMenuItem
                                  className="cursor-pointer text-amber-600 dark:text-amber-400 font-medium"
                                  onClick={() => handleDuplicate(workout.id)}
                                >
                                  <Copy className="mr-2 size-4 text-amber-500" /> Duplicar Modelo
                                </DropdownMenuItem>
                              )}
                              {canManageWorkouts && (canEditOthers || workout.creatorId === actorUserId) && (
                                <>
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
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Badges on bottom-left of banner */}
                        <div className="absolute bottom-2 left-3 z-10 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] font-bold bg-background/90 text-foreground backdrop-blur-md border border-border/50 shadow-xs">
                            {workout.goal}
                          </Badge>
                          {workout.muscleGroupLabel && (
                            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/30 backdrop-blur-md shadow-xs">
                              {workout.muscleGroupLabel}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-4 pt-3 flex flex-col flex-1 justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-base leading-tight text-foreground truncate">{workout.name}</h3>
                            <span className="text-[10px] text-muted-foreground border border-border/70 rounded-full px-2 py-0.5 shrink-0">
                              {workout.difficulty}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3.5" />
                              <span>{workout.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Dumbbell className="size-3.5" />
                              <span>{workout.exercises?.length || workout._count?.exercises || 0} exs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Timer className="size-3.5" />
                              <span>{workout.restBetweenExercises || "02:00"}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-md shrink-0" asChild>
                            <Link href={`/gym/workouts/${workout.id}`}>
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
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
            <Select value={exerciseFilter} onValueChange={setExerciseFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-10 bg-card border-border">
                <SelectValue placeholder="Filtrar por grupamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Grupamentos</SelectItem>
                <SelectItem value="Peito">Peito</SelectItem>
                <SelectItem value="Costas">Costas</SelectItem>
                <SelectItem value="Ombro">Ombro</SelectItem>
                <SelectItem value="Bíceps">Bíceps</SelectItem>
                <SelectItem value="Tríceps">Tríceps</SelectItem>
                <SelectItem value="Quadríceps">Quadríceps</SelectItem>
                <SelectItem value="Posterior de perna">Posterior de perna</SelectItem>
                <SelectItem value="Glúteo">Glúteo</SelectItem>
                <SelectItem value="Panturrilha">Panturrilha</SelectItem>
                <SelectItem value="Abdomen">Abdomen</SelectItem>
                <SelectItem value="Trapézio">Trapézio</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 lg:ml-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar exercício..."
                  className="pl-9 bg-card border-border h-10 text-xs"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loadingDbExercises ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-0 border border-border bg-card/45 rounded-xl">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="size-12 rounded-xl bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded bg-muted" />
                        <Skeleton className="h-3 w-20 rounded bg-muted" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredExercises.length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl bg-secondary/10">
                  <p className="text-muted-foreground font-medium">Nenhum exercício encontrado.</p>
                </div>
              ) : (
                filteredExercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:bg-card/60 transition-colors duration-200 p-0 border-border/70">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div
                        className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          setPreviewExercise(exercise);
                          setIsPreviewModalOpen(true);
                        }}
                      >
                        <ExerciseThumbnail videoUrl={exercise.videoUrl} className="size-12 rounded-xl shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-foreground truncate">{exercise.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Activity className="size-3" />
                              {exercise.muscleGroup?.name || "Geral"}
                            </span>
                            <span className="flex items-center gap-1">
                              <PlaySquare className="size-3" />
                              {exercise.videoUrl ? "Com Vídeo" : "Sem Vídeo"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary hover:text-primary-foreground hover:bg-primary gap-1 shrink-0 h-8 px-2.5 rounded-md"
                        onClick={() => {
                          setPreviewExercise(exercise);
                          setIsPreviewModalOpen(true);
                        }}
                      >
                        <Eye className="size-3.5" />
                        <span>Ver</span>
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <PersonalVideoLibrary />
        </TabsContent>
      </Tabs>

      {/* Modal Prescrever para Aluno */}
      <Dialog open={Boolean(assigningWorkout)} onOpenChange={(open) => { if (!open && !submittingAssignment) setAssigningWorkout(null); }}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl">
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Prescrever Treino para Aluno
              </DialogTitle>
              <DialogDescription>
                Atribua o modelo &quot;{assigningWorkout?.name}&quot; para um aluno da academia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Aluno</Label>
                <Select value={selectedStudentMemberId} onValueChange={setSelectedStudentMemberId}>
                  <SelectTrigger className="w-full text-xs h-10">
                    <SelectValue placeholder={loadingStudents ? "Carregando alunos..." : "Selecione o aluno..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.memberId || student.userId} value={student.memberId || student.userId}>
                        {student.name} {student.registrationNumber ? `(#${student.registrationNumber})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Dia da Semana (Opcional)</Label>
                <Select value={selectedDayOfWeek} onValueChange={setSelectedDayOfWeek}>
                  <SelectTrigger className="w-full text-xs h-10">
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Livre / Sem dia fixo</SelectItem>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssigningWorkout(null)} disabled={submittingAssignment}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submittingAssignment || !selectedStudentMemberId}>
                {submittingAssignment ? <Loader2 className="size-4 animate-spin" /> : "Confirmar Prescrição"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o modelo de treino da academia. Os alunos que já possuem fichas prescritas anteriormente não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Excluir Modelo"}
            </AlertDialogAction>
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
