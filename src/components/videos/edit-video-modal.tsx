"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditVideoModalProps {
  video: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoUpdated: (updatedVideo: any) => void;
  onVideoDeleted: (videoId: string) => void;
}

export function EditVideoModal({
  video,
  open,
  onOpenChange,
  onVideoUpdated,
  onVideoDeleted,
}: EditVideoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    if (!video || !open) return;

    setTitle(video.title || "");
    setDescription(video.description || "");
    const initialIds = (video.exerciseLinks || []).map((link: any) => link.exerciseId);
    setSelectedExerciseIds(initialIds);

    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const res = await fetch("/api/personal/videos/exercises");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data?.data || [];
          setExercises(list);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, [video, open]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/personal/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          exerciseIds: selectedExerciseIds,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erro ao atualizar vídeo.");
      }

      const updated = await res.json();
      toast.success("Vídeo atualizado com sucesso!");
      onVideoUpdated(updated);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar vídeo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!video) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/personal/videos/${video.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erro ao excluir vídeo.");
      }

      toast.success("Vídeo removido da biblioteca!");
      onVideoDeleted(video.id);
      setShowDeleteAlert(false);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao excluir vídeo.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredExercises = Array.isArray(exercises)
    ? exercises.filter((ex) => {
      if (!exerciseSearch.trim()) return true;
      const searchLower = exerciseSearch.toLowerCase();
      const nameMatch = ex?.name?.toLowerCase().includes(searchLower);
      const groupMatch = ex?.muscleGroup?.name?.toLowerCase().includes(searchLower);
      const multiGroupMatch = ex?.muscleGroups?.some((mg: any) =>
        mg?.name?.toLowerCase().includes(searchLower)
      );
      return nameMatch || groupMatch || multiGroupMatch;
    })
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !isSubmitting && !isDeleting && onOpenChange(val)}>
        <DialogContent className="max-w-xl! w-full max-h-[92vh]! flex flex-col p-0 gap-0 overflow-hidden rounded-2xl! border-border bg-card">
          <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-border/50 shrink-0">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Editar Vídeo da Biblioteca
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Edite o título, orientações e os exercícios vinculados a este vídeo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Título do Vídeo *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                  className="h-10 text-xs rounded-xl"
                  maxLength={150}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Dicas e Instruções</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                  rows={2}
                  className="text-xs rounded-xl resize-none"
                  maxLength={500}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Exercícios Vinculados</Label>
                  <Badge variant="secondary" className="text-[10px] font-medium h-5">
                    {selectedExerciseIds.length} selecionado{selectedExerciseIds.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                <Input
                  placeholder="Filtrar exercícios..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                  className="h-8 text-xs rounded-lg"
                />

                <section className="rounded-xl border border-border/70 p-2 bg-secondary/10">
                  {loadingExercises ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Carregando exercícios...
                    </div>
                  ) : filteredExercises.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                      Nenhum exercício encontrado.
                    </div>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-44">
                      {filteredExercises.map((ex) => {
                        const isSelected = selectedExerciseIds.includes(ex.id);
                        return (
                          <div
                            key={ex.id}
                            onClick={() => !isSubmitting && !isDeleting && toggleExercise(ex.id)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors",
                              isSelected
                                ? "bg-primary/10 text-foreground font-medium"
                                : "hover:bg-secondary/40 text-muted-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleExercise(ex.id)}
                                  disabled={isSubmitting || isDeleting}
                                  className="size-4 rounded"
                                />
                              </div>
                              <span className="truncate">{ex.name}</span>
                            </div>
                            {ex.muscleGroup?.name && (
                              <Badge variant="outline" className="text-[9px] shrink-0 h-4 px-1.5">
                                {ex.muscleGroup.name}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border/50 bg-secondary/10 flex-col sm:flex-row justify-between gap-2 shrink-0">
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting || isDeleting}
                onClick={() => setShowDeleteAlert(true)}
                className="w-full sm:w-auto h-10 text-xs rounded-xl gap-1.5"
              >
                <Trash2 className="size-4" />
                Excluir Vídeo
              </Button>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || isDeleting}
                  className="w-full sm:w-auto h-10 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="w-full sm:w-auto h-10 text-xs rounded-xl gap-2 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este vídeo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o vídeo permanentemente da sua biblioteca e desvinculará dos exercícios associados. Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
