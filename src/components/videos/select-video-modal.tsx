"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Check, Loader2, Play } from "lucide-react";
import { ExerciseThumbnail } from "@/components/application/exercise-preview-modal";
import { UploadVideoModal } from "./upload-video-modal";
import { cn } from "@/lib/utils";

interface SelectVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
  exerciseId?: string;
  onSelectVideo: (video: { id: string; title: string; videoUrl: string; sourceType: string }) => void;
}

export function SelectVideoModal({
  open,
  onOpenChange,
  workspaceId,
  exerciseId,
  onSelectVideo,
}: SelectVideoModalProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (workspaceId) params.append("workspaceId", workspaceId);
      if (search) params.append("search", search);

      const res = await fetch(`/api/personal/videos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchVideos();
    }
  }, [open, workspaceId, search]);

  const handleCreated = (newVideo: any) => {
    setVideos((prev) => [newVideo, ...prev]);
    onSelectVideo({
      id: newVideo.id,
      title: newVideo.title,
      videoUrl: newVideo.videoUrl,
      sourceType: newVideo.sourceType,
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg w-full max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border bg-card">
          <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Selecionar da Biblioteca de Vídeos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Escolha um dos seus vídeos para vincular a este exercício.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="h-8 text-xs font-semibold gap-1.5 shrink-0"
              >
                <Plus className="size-3.5" />
                Novo Vídeo
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-6 space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vídeo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <ScrollArea className="flex-1 rounded-xl border border-border/70 p-2 bg-secondary/10">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando vídeos...
                </div>
              ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Nenhum vídeo encontrado.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsUploadOpen(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    Adicionar Vídeo Agora
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => {
                        onSelectVideo({
                          id: video.id,
                          title: video.title,
                          videoUrl: video.videoUrl,
                          sourceType: video.sourceType,
                        });
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 hover:border-primary/40 bg-card hover:bg-secondary/20 cursor-pointer transition-all group"
                    >
                      <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black/40 shrink-0">
                        <ExerciseThumbnail
                          videoUrl={video.videoUrl}
                          className="size-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center">
                          <Play className="size-3 text-white fill-current" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                          {video.title}
                        </h5>
                        {video.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                            {video.sourceType}
                          </Badge>
                          {video.exerciseLinks?.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {video.exerciseLinks.length} exercício(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs font-semibold px-2.5 group-hover:bg-primary group-hover:text-primary-foreground shrink-0"
                      >
                        Selecionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <UploadVideoModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        workspaceId={workspaceId}
        onVideoCreated={handleCreated}
        initialExerciseId={exerciseId}
      />
    </>
  );
}
