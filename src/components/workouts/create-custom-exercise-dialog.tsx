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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Video, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface MuscleGroup {
  id: string;
  name: string;
}

interface CreateCustomExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  muscleGroups?: MuscleGroup[];
  defaultMuscleGroupId?: string;
  onExerciseCreated: (exercise: any) => void;
}

export function CreateCustomExerciseDialog({
  open,
  onOpenChange,
  muscleGroups = [],
  defaultMuscleGroupId,
  onExerciseCreated,
}: CreateCustomExerciseDialogProps) {
  const [name, setName] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState(defaultMuscleGroupId || "");
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalMuscleGroups, setInternalMuscleGroups] = useState<MuscleGroup[]>(muscleGroups);

  useEffect(() => {
    if (defaultMuscleGroupId) {
      setMuscleGroupId(defaultMuscleGroupId);
    }
  }, [defaultMuscleGroupId]);

  useEffect(() => {
    if (muscleGroups.length > 0) {
      setInternalMuscleGroups(muscleGroups);
    } else if (open) {
      fetch("/api/personal/workouts/muscle-groups")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setInternalMuscleGroups(data);
            if (!muscleGroupId && data.length > 0) {
              setMuscleGroupId(data[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [muscleGroups, open, muscleGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do exercício.");
      return;
    }

    if (!muscleGroupId) {
      toast.error("Selecione o grupamento muscular.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/personal/workouts/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          muscleGroupId,
          videoUrl: videoUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao criar exercício personalizado.");
      }

      const newExercise = await res.json();
      toast.success("Exercício personalizado criado!", {
        description: "Enviado automaticamente para aprovação no catálogo oficial do Superadmin.",
      });

      onExerciseCreated(newExercise);
      setName("");
      setVideoUrl("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar exercício.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-md rounded-2xl p-5 sm:p-6 bg-card border border-border/80">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold text-foreground">
                Criar Exercício Personalizado
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded-md shrink-0">
                Solicitação ao Superadmin
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um exercício personalizado. Ele será vinculado ao treino e enviado para inclusão no catálogo oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Exercício *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Supino Inclinado na Halter com Giro"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Grupamento Muscular *</Label>
              <Select
                value={muscleGroupId}
                onValueChange={setMuscleGroupId}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Selecione o grupamento..." />
                </SelectTrigger>
                <SelectContent>
                  {internalMuscleGroups.map((mg) => (
                    <SelectItem key={mg.id} value={mg.id} className="text-xs">
                      {mg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  Link do Vídeo / Demonstração
                </Label>
                <span className="text-[10px] text-muted-foreground">Opcional</span>
              </div>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Ex: https://youtube.com/watch?v=... ou deixe em branco"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-muted-foreground/80 pt-0.5">
                Se deixar em branco, o aluno poderá pesquisar a execução no treino com 1 clique no botão de busca.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 text-xs rounded-xl w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Criar e Vincular
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
