"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Dumbbell,
  FileText,
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";


// ----------------------------------------------------
// 1. SHARE WORKOUT MODAL
// ----------------------------------------------------
interface ShareWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  workspaceId: string;
  onShare: (workoutData: {
    type: "WORKOUT_SHARE";
    workoutId: string;
    workoutName: string;
    goal: string;
    difficulty: string;
    duration: number;
    exerciseCount: number;
  }) => void;
}

export function ShareWorkoutModal({
  isOpen,
  onClose,
  studentId,
  workspaceId,
  onShare,
}: ShareWorkoutModalProps) {
  const [activeTab, setActiveTab] = useState<"client" | "templates">("client");
  const [clientWorkouts, setClientWorkouts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === "client") {
          const res = await fetch(
            `/api/personal/clients/${studentId}/workouts?workspaceId=${workspaceId}`
          );
          if (res.ok) {
            const data = await res.json();
            setClientWorkouts(data);
          }
        } else {
          const res = await fetch(`/api/personal/workouts?workspaceId=${workspaceId}`);
          if (res.ok) {
            const data = await res.json();
            setTemplates(data);
          }
        }
      } catch (err) {
        console.error("Error loading workouts:", err);
        toast.error("Erro ao carregar treinos.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, activeTab, studentId, workspaceId]);

  const handleSelect = (workout: any) => {
    onShare({
      type: "WORKOUT_SHARE",
      workoutId: workout.id,
      workoutName: workout.name,
      goal: workout.goal,
      difficulty: workout.difficulty,
      duration: workout.duration || 60,
      exerciseCount: workout.exercises?.length || 0,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-popover border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" /> Enviar Treino para o Aluno
          </DialogTitle>
          <DialogDescription>
            Escolha entre treinos já vinculados ao aluno ou modelos de treino.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full mt-2"
        >
          <TabsList className="grid w-full grid-cols-2 bg-secondary/30">
            <TabsTrigger value="client" className="text-xs font-semibold">
              Treinos do Aluno
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs font-semibold">
              Modelos de Treino
            </TabsTrigger>
          </TabsList>

          <div className="min-h-[220px] max-h-[350px] overflow-y-auto mt-4 pr-1 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : activeTab === "client" ? (
              clientWorkouts.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  Nenhum treino atribuído a este aluno.
                </div>
              ) : (
                clientWorkouts.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => handleSelect(w)}
                    className="p-3 bg-secondary/10 hover:bg-secondary/20 border border-border/40 rounded-xl cursor-pointer transition text-left"
                  >
                    <div className="font-bold text-sm text-foreground">{w.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {w.goal} • {w.difficulty} • {w.exercises?.length || 0} exercícios
                    </div>
                  </div>
                ))
              )
            ) : templates.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                Nenhum modelo de treino cadastrado.
              </div>
            ) : (
              templates.map((w) => (
                <div
                  key={w.id}
                  onClick={() => handleSelect(w)}
                  className="p-3 bg-secondary/10 hover:bg-secondary/20 border border-border/40 rounded-xl cursor-pointer transition text-left"
                >
                  <div className="font-bold text-sm text-foreground">{w.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {w.goal} • {w.difficulty} • {w.exercises?.length || 0} exercícios
                  </div>
                </div>
              ))
            )}
          </div>
        </Tabs>
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 2. SHARE EXERCISE MODAL
// ----------------------------------------------------
interface ShareExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (exerciseData: {
    type: "EXERCISE_SHARE";
    exerciseId: string;
    exerciseName: string;
    muscleGroupName: string;
    videoUrl?: string | null;
  }) => void;
}

export function ShareExerciseModal({ isOpen, onClose, onShare }: ShareExerciseModalProps) {
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchExercises = async () => {
      setIsLoading(true);
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/personal/workouts/exercises${query}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out duplicates and limit to 40 items
          const list = Array.isArray(data) ? data : data.data || [];
          setExercises(list.slice(0, 40));
        }
      } catch (err) {
        console.error("Error loading exercises:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchExercises();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [isOpen, search]);

  const handleSelect = (ex: any) => {
    onShare({
      type: "EXERCISE_SHARE",
      exerciseId: ex.id,
      exerciseName: ex.name,
      muscleGroupName: ex.muscleGroup?.name || "Geral",
      videoUrl: ex.videoUrl,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-popover border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" /> Enviar Exercício Demonstrativo
          </DialogTitle>
          <DialogDescription>
            Pesquise um exercício da biblioteca para compartilhar com o aluno.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>

        <div className="min-h-[220px] max-h-[350px] overflow-y-auto mt-2 pr-1 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              Nenhum exercício encontrado.
            </div>
          ) : (
            exercises.map((ex) => (
              <div
                key={ex.id}
                onClick={() => handleSelect(ex)}
                className="p-3 bg-secondary/10 hover:bg-secondary/20 border border-border/40 rounded-xl cursor-pointer transition flex justify-between items-center text-left"
              >
                <div>
                  <div className="font-bold text-sm text-foreground">{ex.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {ex.muscleGroup?.name || "Geral"}
                  </div>
                </div>
                {ex.videoUrl && (
                  <span className="text-[8px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full uppercase">
                    Vídeo
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 3. SHARE PHYSICAL ASSESSMENT MODAL
// ----------------------------------------------------
interface ShareAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  workspaceId: string;
  onShare: (assessmentData: {
    type: "ASSESSMENT_SHARE";
    evaluationId: string;
    weight: number;
    fatPercent?: number | null;
    date: string;
  }) => void;
}

export function ShareAssessmentModal({
  isOpen,
  onClose,
  studentId,
  workspaceId,
  onShare,
}: ShareAssessmentModalProps) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchEvaluations = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/personal/clients/${studentId}/evaluations?workspaceId=${workspaceId}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvaluations(data);
        }
      } catch (err) {
        console.error("Error loading evaluations:", err);
        toast.error("Erro ao carregar avaliações.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluations();
  }, [isOpen, studentId, workspaceId]);

  const handleSelect = (ev: any) => {
    onShare({
      type: "ASSESSMENT_SHARE",
      evaluationId: ev.id,
      weight: ev.weight,
      fatPercent: ev.bodyFat,
      date: new Date(ev.date).toLocaleDateString("pt-BR"),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-popover border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="size-5 text-primary" /> Enviar Avaliação Física
          </DialogTitle>
          <DialogDescription>
            Selecione uma avaliação física cadastrada deste aluno para enviar um card resumo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[220px] max-h-[350px] overflow-y-auto mt-2 pr-1 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              Nenhuma avaliação física cadastrada para este aluno.
            </div>
          ) : (
            evaluations.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleSelect(ev)}
                className="p-3 bg-secondary/10 hover:bg-secondary/20 border border-border/40 rounded-xl cursor-pointer transition text-left"
              >
                <div className="font-bold text-sm text-foreground">
                  Avaliação {ev.type || "Física"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex justify-between">
                  <span>Data: {new Date(ev.date).toLocaleDateString("pt-BR")}</span>
                  <span>
                    {ev.weight} kg • BF: {ev.bodyFat ? `${ev.bodyFat}%` : "N/D"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 4. REQUEST PROGRESS PHOTOS MODAL (TRAINER)
// ----------------------------------------------------
interface RequestProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (requestData: {
    type: "PROGRESS_REQUEST";
    comment?: string;
  }) => void;
}

export function RequestProgressModal({ isOpen, onClose, onShare }: RequestProgressModalProps) {
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onShare({
      type: "PROGRESS_REQUEST",
      comment: comment.trim() || undefined,
    });
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-popover border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Camera className="size-5 text-primary" /> Solicitar Fotos de Progresso
          </DialogTitle>
          <DialogDescription>
            O aluno receberá uma mensagem interativa no chat solicitando fotos corporais (Frente, Costas, Lateral).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="req-instructions">Instruções / Observações (Opcional)</Label>
            <Textarea
              id="req-instructions"
              placeholder="Ex: Favor tirar as fotos de jejum, com roupas leves e em local bem iluminado."
              className="bg-background border-border resize-none h-24 text-xs"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="font-semibold">
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 5. STUDENT PROGRESS UPLOAD MODAL (STUDENT RESPONSE)
// ----------------------------------------------------
interface StudentProgressUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  workspaceId: string;
  onUploadSuccess: () => void;
}

interface PhotoUploadState {
  file: File | null;
  previewUrl: string;
  progress: number;
  uploadedUrl: string | null;
}

export function StudentProgressUploadModal({
  isOpen,
  onClose,
  studentId,
  workspaceId,
  onUploadSuccess,
}: StudentProgressUploadModalProps) {
  const [frente, setFrente] = useState<PhotoUploadState>({
    file: null,
    previewUrl: "",
    progress: 0,
    uploadedUrl: null,
  });
  const [costas, setCostas] = useState<PhotoUploadState>({
    file: null,
    previewUrl: "",
    progress: 0,
    uploadedUrl: null,
  });
  const [lateral, setLateral] = useState<PhotoUploadState>({
    file: null,
    previewUrl: "",
    progress: 0,
    uploadedUrl: null,
  });
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Clean up previews
      [frente, costas, lateral].forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      // Reset state
      const resetState = { file: null, previewUrl: "", progress: 0, uploadedUrl: null };
      setFrente(resetState);
      setCostas(resetState);
      setLateral(resetState);
      setComment("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    position: "frente" | "costas" | "lateral"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const stateSetter =
      position === "frente"
        ? setFrente
        : position === "costas"
        ? setCostas
        : setLateral;

    stateSetter({
      file,
      previewUrl,
      progress: 0,
      uploadedUrl: null,
    });
  };

  const uploadSinglePhoto = async (
    photoState: PhotoUploadState,
    positionName: string
  ): Promise<string> => {
    let { file } = photoState;
    if (!file) throw new Error(`Foto de ${positionName} não selecionada.`);

    // Compress image client-side to save bandwidth
    try {
      file = await compressImage(file);
    } catch (err) {
      console.warn("Failing compression, uploading original:", err);
    }

    // 1. Get presigned url
    const presignedRes = await fetch("/api/storage/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        fileName: `progress_${positionName}_${Date.now()}_${file.name}`,
        fileSize: file.size,
        contentType: file.type || "image/jpeg",
        targetType: "chat_attachment",
      }),
    });

    if (!presignedRes.ok) {
      throw new Error(`Erro ao gerar link de upload para ${positionName}.`);
    }

    const { uploadUrl, fileUrl } = await presignedRes.json();

    // 2. Perform PUT upload with progress callback
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progressPercent = Math.round((event.loaded / event.total) * 100);
          if (positionName === "Frente") {
            setFrente((prev) => ({ ...prev, progress: progressPercent }));
          } else if (positionName === "Costas") {
            setCostas((prev) => ({ ...prev, progress: progressPercent }));
          } else {
            setLateral((prev) => ({ ...prev, progress: progressPercent }));
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(fileUrl);
        } else {
          reject(new Error(`Falha no upload de ${positionName}: status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Erro de conexão ao enviar ${positionName}.`));
      };

      xhr.send(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frente.file && !costas.file && !lateral.file) {
      toast.error("Por favor, selecione ao menos uma foto de evolução.");
      return;
    }

    setIsSubmitting(true);
    try {
      const urls: string[] = [];

      // Upload positions sequentially
      if (frente.file) {
        const url = await uploadSinglePhoto(frente, "Frente");
        urls.push(url);
      }
      if (costas.file) {
        const url = await uploadSinglePhoto(costas, "Costas");
        urls.push(url);
      }
      if (lateral.file) {
        const url = await uploadSinglePhoto(lateral, "Lateral");
        urls.push(url);
      }

      // Save each uploaded photo url to the student timeline
      for (const photoUrl of urls) {
        const saveRes = await fetch(`/api/personal/clients/${studentId}/progress/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            photoUrl,
            comment: comment.trim() || undefined,
            date: new Date().toISOString(),
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Erro ao salvar foto de evolução na linha do tempo.");
        }
      }

      toast.success("Fotos enviadas com sucesso!");
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro no envio de fotos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUploadBox = (
    position: "frente" | "costas" | "lateral",
    label: string,
    state: PhotoUploadState
  ) => {
    return (
      <div className="flex flex-col items-center gap-1.5 p-3 border border-dashed border-border/80 rounded-xl relative hover:bg-secondary/10 transition group">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
          {label}
        </span>
        {state.previewUrl ? (
          <div className="relative size-20 rounded-lg overflow-hidden border border-border">
            <img src={state.previewUrl} alt={label} className="w-full h-full object-cover" />
            {isSubmitting && state.progress < 100 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                {state.progress}%
              </div>
            )}
            {!isSubmitting && (
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(state.previewUrl);
                  const reset = { file: null, previewUrl: "", progress: 0, uploadedUrl: null };
                  if (position === "frente") setFrente(reset);
                  else if (position === "costas") setCostas(reset);
                  else setLateral(reset);
                }}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/95 transition shadow-sm"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ) : (
          <label className="size-20 rounded-lg bg-secondary/20 flex flex-col items-center justify-center cursor-pointer border border-border/30 hover:border-primary/50 transition">
            <Upload className="size-4 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground mt-1">Upload</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, position)}
              disabled={isSubmitting}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md bg-popover border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Camera className="size-5 text-primary" /> Enviar Fotos de Evolução
          </DialogTitle>
          <DialogDescription>
            Selecione fotos de Frente, Costas e Lateral. O envio registrará sua evolução física.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            {renderUploadBox("frente", "Frente", frente)}
            {renderUploadBox("costas", "Costas", costas)}
            {renderUploadBox("lateral", "Lateral", lateral)}
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="evolution-comment">Comentário / Sensação de Treino (Opcional)</Label>
            <Textarea
              id="evolution-comment"
              placeholder="Como se sente fisicamente? Alguma observação para o seu personal?"
              className="bg-background border-border resize-none h-20 text-xs"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="font-semibold" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Salvar Evolução
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
