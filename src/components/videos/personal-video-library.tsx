"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Play,
  MoreVertical,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
  Film,
} from "lucide-react";
import { UploadVideoModal } from "./upload-video-modal";
import { EditVideoModal } from "./edit-video-modal";
import { getYouTubeId, getGoogleDriveEmbedUrl, ExerciseThumbnail } from "@/components/application/exercise-preview-modal";

function VideoPlayer({ videoUrl, title }: { videoUrl?: string | null; title?: string }) {
  if (!videoUrl) return null;

  const youtubeId = getYouTubeId(videoUrl);
  const driveEmbedUrl = getGoogleDriveEmbedUrl(videoUrl);
  const lowerUrl = videoUrl.toLowerCase();

  if (youtubeId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
        title={title || "Vídeo no YouTube"}
        className="size-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (driveEmbedUrl) {
    return (
      <iframe
        src={driveEmbedUrl}
        title={title || "Vídeo no Google Drive"}
        className="size-full border-0"
        allow="autoplay"
        allowFullScreen
      />
    );
  }

  if (lowerUrl.includes("loom.com")) {
    const loomEmbed = videoUrl.replace("/share/", "/embed/");
    return (
      <iframe
        src={loomEmbed}
        title={title || "Vídeo no Loom"}
        className="size-full border-0"
        allowFullScreen
      />
    );
  }

  if (lowerUrl.includes("vimeo.com")) {
    const vimeoId = videoUrl.split("/").pop();
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
        title={title || "Vídeo no Vimeo"}
        className="size-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      src={videoUrl}
      controls
      autoPlay
      playsInline
      className="size-full object-contain"
    >
      Seu navegador não suporta a reprodução deste vídeo.
    </video>
  );
}
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PersonalVideoLibraryProps {
  workspaceId?: string | null;
}

export function PersonalVideoLibrary({ workspaceId }: PersonalVideoLibraryProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVideoToEdit, setSelectedVideoToEdit] = useState<any | null>(null);

  const [previewVideo, setPreviewVideo] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (workspaceId) params.append("workspaceId", workspaceId);
      if (search) params.append("search", search);
      if (selectedMuscleGroup && selectedMuscleGroup !== "all") {
        params.append("muscleGroupId", selectedMuscleGroup);
      }

      const res = await fetch(`/api/personal/videos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar vídeos.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMuscleGroups = async () => {
    try {
      const res = await fetch("/api/personal/workouts/muscle-groups");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMuscleGroups(data);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMuscleGroups();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVideos();
    }, 250);
    return () => clearTimeout(timer);
  }, [workspaceId, search, selectedMuscleGroup]);

  const handleVideoCreated = (newVideo: any) => {
    setVideos((prev) => [newVideo, ...prev]);
  };

  const handleVideoUpdated = (updatedVideo: any) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === updatedVideo.id ? updatedVideo : v))
    );
  };

  const handleVideoDeleted = (deletedId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== deletedId));
  };

  const openPreview = (video: any) => {
    setPreviewVideo(video);
    setIsPreviewOpen(true);
  };

  const openEdit = (video: any) => {
    setSelectedVideoToEdit(video);
    setIsEditModalOpen(true);
  };

  const getSourceBadgeLabel = (sourceType: string) => {
    switch (sourceType) {
      case "UPLOAD":
        return "Upload Direto";
      case "YOUTUBE":
        return "YouTube";
      case "GOOGLE_DRIVE":
        return "Google Drive";
      case "VIMEO":
        return "Vimeo";
      case "LOOM":
        return "Loom";
      case "INSTAGRAM":
        return "Instagram";
      default:
        return "Link";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
        <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
          <SelectTrigger className="w-full sm:w-[220px] h-10 bg-card border-border">
            <SelectValue placeholder="Filtrar por grupamento..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Grupamentos ({videos.length})</SelectItem>
            {muscleGroups.map((mg) => (
              <SelectItem key={mg.id} value={mg.id}>
                {mg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 lg:ml-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por título ou exercício..."
              className="pl-9 bg-card border-border h-10 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="shrink-0 gap-2 h-10 w-full sm:w-auto text-xs font-semibold"
          >
            <Plus className="size-4" />
            Novo Vídeo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-0 border border-border bg-card/45 rounded-2xl overflow-hidden">
              <Skeleton className="aspect-video w-full bg-muted" />
              <CardContent className="p-4 space-y-2.5">
                <Skeleton className="h-4 w-3/4 rounded bg-muted" />
                <Skeleton className="h-3 w-1/2 rounded bg-muted" />
                <div className="flex gap-1.5 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full bg-muted" />
                  <Skeleton className="h-5 w-20 rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-2 border-dashed border-border/80 rounded-2xl bg-card/20 space-y-4">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Film className="size-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold tracking-tight">Sua biblioteca de vídeos está vazia</h3>
            <p className="text-xs text-muted-foreground">
              Suba seus próprios vídeos de execução de exercícios ou adicione links do YouTube/Drive para que seus alunos vejam você nos treinos.
            </p>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-10 text-xs font-semibold gap-2"
          >
            <Plus className="size-4" />
            Adicionar Primeiro Vídeo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {videos.map((video) => {
            const linkedCount = video.exerciseLinks?.length || 0;
            return (
              <Card
                key={video.id}
                className="group p-0 border border-border bg-card/60 hover:border-primary/40 transition-all rounded-2xl! overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div
                    onClick={() => openPreview(video)}
                    className="relative aspect-video w-full bg-black/40 overflow-hidden cursor-pointer flex items-center justify-center"
                  >
                    <ExerciseThumbnail
                      videoUrl={video.videoUrl}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="size-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                        <Play className="size-4 ml-0.5 fill-current" />
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className="absolute top-2.5 left-2.5 text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md border-0"
                    >
                      {getSourceBadgeLabel(video.sourceType)}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-2 rounded-2xl!">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        onClick={() => openPreview(video)}
                        className="text-sm font-bold tracking-tight line-clamp-1 cursor-pointer hover:text-primary transition-colors flex-1"
                      >
                        {video.title}
                      </h4>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => openPreview(video)}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <Play className="size-3.5" />
                            Assistir Prévia
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEdit(video)}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <Edit2 className="size-3.5" />
                            Editar e Vincular
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openEdit(video)}
                            className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Excluir Vídeo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Exercícios Vinculados:
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold h-5">
                          {linkedCount}
                        </Badge>
                      </div>

                      {linkedCount > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {video.exerciseLinks.slice(0, 3).map((link: any) => (
                            <Badge
                              key={link.id}
                              variant="secondary"
                              className="text-[10px] truncate max-w-[140px] px-2 py-0.5"
                            >
                              {link.exercise?.name}
                            </Badge>
                          ))}
                          {linkedCount > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              +{linkedCount - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-500/90 font-medium mt-1">
                          Nenhum exercício vinculado ainda.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <UploadVideoModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        workspaceId={workspaceId}
        onVideoCreated={handleVideoCreated}
      />

      <EditVideoModal
        video={selectedVideoToEdit}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onVideoUpdated={handleVideoUpdated}
        onVideoDeleted={handleVideoDeleted}
      />

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl! w-full gap-0 overflow-hidden rounded-3xl! p-0! border-border bg-card shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/50 flex flex-row items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold tracking-tight truncate">
                {previewVideo?.title}
              </DialogTitle>
              {previewVideo?.sourceType && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getSourceBadgeLabel(previewVideo.sourceType)}
                </p>
              )}
            </div>
          </DialogHeader>

          <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden">
            {previewVideo?.videoUrl ? (
              <VideoPlayer videoUrl={previewVideo.videoUrl} title={previewVideo.title} />
            ) : (
              <p className="text-xs text-muted-foreground">Vídeo indisponível.</p>
            )}
          </div>

          {previewVideo?.description && (
            <div className="p-4 sm:p-5 bg-secondary/15 border-t border-border/50 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instruções / Dicas</span>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{previewVideo.description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
