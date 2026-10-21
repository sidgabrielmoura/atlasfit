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
  Loader2,
  Copy,
  Trash2,
  Play,
  Target,
  FileText,
  Printer,
  Users,
  Timer
} from "lucide-react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseThumbnail, ExercisePreviewModal } from "@/components/application/exercise-preview-modal";

interface GymWorkoutDetailsPageProps {
  params: Promise<{ id: string }>;
}

const daysOfWeek = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" }
];

export default function GymWorkoutDetailsPage({ params }: GymWorkoutDetailsPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Assign to student modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState("FREE");
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/gym/workouts/${id}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar detalhes do treino.");
      }
      const data = await res.json();
      setWorkout(data);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar treino.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutDetails();
  }, [id]);

  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    if (students.length > 0) return;
    try {
      setLoadingStudents(true);
      const res = await fetch(`/api/gym/workouts/students?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const payload = await res.json();
        setStudents(payload.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar lista de alunos.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error("Selecione um aluno.");
      return;
    }

    try {
      setSubmittingAssignment(true);
      const res = await fetch("/api/gym/workouts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          studentMemberId: selectedStudentId,
          templateWorkoutId: workout.id,
          idempotencyKey: crypto.randomUUID(),
          dayOfWeek: selectedDayOfWeek !== "FREE" ? Number(selectedDayOfWeek) : null,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao prescrever treino.");
      }

      toast.success("Treino prescrito com sucesso para o aluno!");
      setIsAssignModalOpen(false);
      setSelectedStudentId("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao prescrever treino.");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      setIsDuplicating(true);
      const res = await fetch(`/api/gym/workouts/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      });
      if (!res.ok) {
        throw new Error("Erro ao duplicar treino.");
      }
      toast.success("Modelo de treino duplicado com sucesso!");
      router.push("/gym/workouts");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao duplicar treino.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/gym/workouts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Erro ao excluir treino.");
      }
      toast.success("Treino excluído com sucesso!");
      router.push("/gym/workouts");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao excluir o treino.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintWorkout = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-7 w-28" />
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex-1 p-8 text-center max-w-md mx-auto space-y-4">
        <Dumbbell className="size-12 mx-auto text-muted-foreground/40" />
        <h3 className="text-xl font-bold">Treino não encontrado</h3>
        <p className="text-sm text-muted-foreground">O treino que você está procurando não existe ou foi removido.</p>
        <Button asChild>
          <Link href="/gym/workouts">Voltar para Treinos</Link>
        </Button>
      </div>
    );
  }

  const groupLetters: Record<string, string> = {};
  let currentLetterCode = 65;
  (workout.exercises || []).forEach((we: any) => {
    if (we.groupId && !groupLetters[we.groupId]) {
      groupLetters[we.groupId] = String.fromCharCode(currentLetterCode++);
    }
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
            <Link href="/gym/workouts">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{workout.name}</h2>
              <Badge variant="secondary" className="text-xs">
                {workout.difficulty}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {workout.muscleGroupLabel || "Geral"} • {workout.goal}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handlePrintWorkout}>
            <Printer className="size-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleOpenAssignModal}>
            <Users className="size-4 text-primary" />
            <span>Prescrever</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            <span className="hidden sm:inline">Duplicar</span>
          </Button>
          <Button size="sm" className="gap-1.5 h-9" asChild>
            <Link href={`/gym/workouts/${workout.id}/edit`}>
              <Edit2 className="size-4" />
              <span>Editar</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 border-border/80">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Clock className="size-4 text-primary" /> Duração Estimada
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{workout.duration}</div>
        </Card>
        <Card className="p-4 bg-card/60 border-border/80">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Dumbbell className="size-4 text-primary" /> Exercícios
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{workout.exercises?.length || 0}</div>
        </Card>
        <Card className="p-4 bg-card/60 border-border/80">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Timer className="size-4 text-primary" /> Descanso Geral
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{workout.restBetweenExercises || "02:00"}</div>
        </Card>
        <Card className="p-4 bg-card/60 border-border/80">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Target className="size-4 text-primary" /> Objetivo
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground truncate">{workout.goal}</div>
        </Card>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Exercícios Prescritos</h3>
          <span className="text-xs text-muted-foreground">{workout.exercises?.length || 0} exercícios na ficha</span>
        </div>

        <div className="space-y-3">
          {(workout.exercises || []).map((we: any, idx: number) => {
            const isBodyweight = String(we.load || "").toLowerCase().includes("p.c");
            const group = we.groupId && we.group ? we.group : null;
            const groupLetter = we.groupId ? groupLetters[we.groupId] : null;

            return (
              <Card
                key={we.id || idx}
                className="p-4 bg-card/60 border-border/70 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-full bg-secondary text-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>

                  <div className="relative size-14 rounded-xl overflow-hidden bg-muted/40 shrink-0 border border-border/50">
                    <ExerciseThumbnail videoUrl={we.exercise?.videoUrl} className="size-full object-cover" />
                    {we.exercise?.videoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewExercise(we.exercise);
                          setIsPreviewModalOpen(true);
                        }}
                        className="absolute inset-0 bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-center text-white"
                        title="Ver execução em vídeo"
                      >
                        <Play className="size-4 fill-current" />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground truncate">{we.exercise?.name}</h4>
                      {group && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                          🔗 {group.type === "BISET" ? "Biset" : group.type === "TRISET" ? "Triset" : "Circuito"} {groupLetter}
                        </Badge>
                      )}
                      {we.methodType === "DROPSET" && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border-amber-500/20">
                          ⚡ Dropset
                        </Badge>
                      )}
                      {we.methodType === "REST_PAUSE" && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-500 border-purple-500/20">
                          ⚡ Rest-Pause
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{we.exercise?.muscleGroup?.name || "Geral"}</p>
                    {we.description && (
                      <p className="text-[11px] text-muted-foreground/90 italic">Obs: {we.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium self-end sm:self-auto shrink-0 border-t border-border/40 sm:border-none pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block">Séries</span>
                    <span className="font-bold text-sm text-foreground">{we.sets}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block">Repetições</span>
                    <span className="font-bold text-sm text-foreground">{we.reps}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block">Carga</span>
                    <span className="font-bold text-sm text-foreground">{isBodyweight ? "p.c." : (we.load ? `${we.load} kg` : "—")}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block">Descanso</span>
                    <span className="font-bold text-sm text-foreground">{we.rest}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal Prescrever para Aluno */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl">
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Prescrever para Aluno
              </DialogTitle>
              <DialogDescription>
                Selecione o aluno e o dia da semana para atribuir este modelo de treino.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Aluno</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="w-full text-xs h-10">
                    <SelectValue placeholder={loadingStudents ? "Carregando alunos..." : "Selecione o aluno..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.memberId || student.id} value={student.memberId || student.id}>
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
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submittingAssignment || !selectedStudentId}>
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
