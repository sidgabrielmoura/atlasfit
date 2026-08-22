"use client";

import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, Link2, Play, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
  onVideoCreated: (video: any) => void;
  initialExerciseId?: string;
}

export function UploadVideoModal({
  open,
  onOpenChange,
  workspaceId,
  onVideoCreated,
  initialExerciseId,
}: UploadVideoModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "link">("upload");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [exercises, setExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(
    initialExerciseId ? [initialExerciseId] : []
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialExerciseId) {
      setSelectedExerciseIds((prev) =>
        prev.includes(initialExerciseId) ? prev : [...prev, initialExerciseId]
      );
    }
  }, [initialExerciseId]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setExternalUrl("");
      setSelectedFile(null);
      if (previewFileUrl) {
        URL.revokeObjectURL(previewFileUrl);
        setPreviewFileUrl(null);
      }
      setUploadProgress(0);
      setIsUploading(false);
      setIsSubmitting(false);
      setExerciseSearch("");
      setSelectedExerciseIds(initialExerciseId ? [initialExerciseId] : []);
      return;
    }

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
  }, [open, initialExerciseId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Por favor, selecione um arquivo de vídeo válido.");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 500MB.");
      return;
    }

    setSelectedFile(file);
    if (previewFileUrl) {
      URL.revokeObjectURL(previewFileUrl);
    }
    setPreviewFileUrl(URL.createObjectURL(file));

    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const detectSourceType = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YOUTUBE";
    if (lower.includes("drive.google.com")) return "GOOGLE_DRIVE";
    if (lower.includes("vimeo.com")) return "VIMEO";
    if (lower.includes("loom.com")) return "LOOM";
    if (lower.includes("instagram.com")) return "INSTAGRAM";
    if (lower.includes("tiktok.com")) return "TIKTOK";
    return "URL";
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Informe o título do vídeo.");
      return;
    }

    if (activeTab === "upload") {
      if (!selectedFile) {
        toast.error("Selecione um arquivo de vídeo para enviar.");
        return;
      }

      try {
        setIsUploading(true);
        setIsSubmitting(true);
        setUploadProgress(5);

        const presignRes = await fetch("/api/personal/videos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type || "video/mp4",
            fileSize: selectedFile.size,
          }),
        });

        if (!presignRes.ok) {
          const errText = await presignRes.text();
          throw new Error(errText || "Falha ao preparar upload.");
        }

        const { uploadUrl, storageKey, publicUrl } = await presignRes.json();

        setUploadProgress(20);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);
          xhr.setRequestHeader("Content-Type", selectedFile.type || "video/mp4");

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const percent = 20 + Math.round((evt.loaded / evt.total) * 70);
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(95);
              resolve();
            } else {
              reject(new Error(`Erro no upload: status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Erro de rede durante o upload do vídeo."));
          xhr.send(selectedFile);
        });

        const saveRes = await fetch("/api/personal/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            videoUrl: publicUrl,
            storageKey,
            fileSize: selectedFile.size,
            sourceType: "UPLOAD",
            workspaceId: workspaceId || undefined,
            exerciseIds: selectedExerciseIds,
          }),
        });

        if (!saveRes.ok) {
          const errText = await saveRes.text();
          throw new Error(errText || "Falha ao salvar informações do vídeo.");
        }

        const savedVideo = await saveRes.json();
        setUploadProgress(100);
        toast.success("Vídeo enviado com sucesso!");
        onVideoCreated(savedVideo);
        onOpenChange(false);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Erro ao processar vídeo.");
      } finally {
        setIsUploading(false);
        setIsSubmitting(false);
      }
    } else {
      if (!externalUrl.trim()) {
        toast.error("Insira o link do vídeo.");
        return;
      }

      try {
        setIsSubmitting(true);
        const sourceType = detectSourceType(externalUrl.trim());

        const saveRes = await fetch("/api/personal/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            videoUrl: externalUrl.trim(),
            sourceType,
            workspaceId: workspaceId || undefined,
            exerciseIds: selectedExerciseIds,
          }),
        });

        if (!saveRes.ok) {
          const errText = await saveRes.text();
          throw new Error(errText || "Falha ao salvar link do vídeo.");
        }

        const savedVideo = await saveRes.json();
        toast.success("Vídeo vinculado com sucesso!");
        onVideoCreated(savedVideo);
        onOpenChange(false);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Erro ao salvar link.");
      } finally {
        setIsSubmitting(false);
      }
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
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-xl! w-full max-h-[92vh]! flex flex-col p-0 overflow-hidden rounded-2xl! border-border bg-card">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-border/50 shrink-0">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Adicionar Vídeo à Biblioteca
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Suba seus próprios vídeos de execução para personalizar os treinos dos seus alunos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl bg-secondary/50 p-1">
                <TabsTrigger
                  value="upload"
                  disabled={isSubmitting}
                  className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Upload className="size-3.5" />
                  Arquivo de Vídeo
                </TabsTrigger>
                <TabsTrigger
                  value="link"
                  disabled={isSubmitting}
                  className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Link2 className="size-3.5" />
                  Link Externo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-3 mt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  disabled={isSubmitting}
                />

                {!selectedFile ? (
                  <div
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer gap-2"
                  >
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Selecione ou arraste o vídeo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        MP4, MOV ou WebM (máx. 500MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 border border-border/70 rounded-xl p-3 bg-secondary/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs px-2"
                      >
                        Trocar
                      </Button>
                    </div>

                    {previewFileUrl && (
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/40 relative">
                        <video
                          src={previewFileUrl}
                          controls
                          className="size-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-1.5 bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Enviando vídeo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 rounded-full" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="link" className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">URL do Vídeo</Label>
                  <Input
                    placeholder="Cole o link do YouTube, Google Drive, Loom, Vimeo..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    disabled={isSubmitting}
                    className="h-10 text-xs rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Suporta YouTube (vídeos e Shorts), Google Drive, Loom, Vimeo e links diretos.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Vídeo *</Label>
              <Input
                placeholder="Ex: Execução Perfeita - Supino Reto com Halteres"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="h-10 text-xs! rounded-xl"
                maxLength={150}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dicas e Instruções (Opcional)</Label>
              <Textarea
                placeholder="Ex: Mantenha as escápulas retraídas, cotovelos em 45º..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={2}
                className="text-xs! rounded-xl resize-none"
                maxLength={500}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Vincular a Exercícios</Label>
                <Badge variant="secondary" className="text-[10px] font-medium h-5">
                  {selectedExerciseIds.length} selecionado{selectedExerciseIds.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <Input
                placeholder="Filtrar exercícios..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs! rounded-lg"
              />

              <section className="rounded-xl border border-border/70 p-2 bg-secondary/10 overflow-hidden">
                {loadingExercises ? (
                  <div className="flex items-center justify-center h-28 text-xs text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Carregando exercícios...
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">
                    Nenhum exercício encontrado.
                  </div>
                ) : (
                  <div className="space-y-1 overflow-y-auto max-h-36">
                    {filteredExercises.map((ex) => {
                      const isSelected = selectedExerciseIds.includes(ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => !isSubmitting && toggleExercise(ex.id)}
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
                                disabled={isSubmitting}
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

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border/50 bg-secondary/10 flex-col sm:flex-row gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 text-xs rounded-xl gap-2 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isUploading ? "Enviando Vídeo..." : "Salvando..."}
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Salvar na Biblioteca
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
