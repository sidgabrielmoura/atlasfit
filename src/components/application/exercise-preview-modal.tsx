"use client";

import { useState, useEffect } from "react";
import { Dumbbell, Play, X, HelpCircle, ArrowRight, Search, Sparkles, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

// Media Query Hook to determine mobile vs desktop layout
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

// Helper to extract YouTube video ID
export function getYouTubeId(url: string | null | undefined) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function getGoogleDriveEmbedUrl(url: string | null | undefined) {
  if (!url) return null;
  const fileDRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const openIdRegex = /id=([a-zA-Z0-9_-]+)/;
  const docsDRegex = /docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;

  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    const matchD = url.match(fileDRegex);
    if (matchD && matchD[1]) {
      return `https://drive.google.com/file/d/${matchD[1]}/preview`;
    }
    const matchDocs = url.match(docsDRegex);
    if (matchDocs && matchDocs[1]) {
      return `https://drive.google.com/file/d/${matchDocs[1]}/preview`;
    }
    const matchOpen = url.match(openIdRegex);
    if (matchOpen && matchOpen[1]) {
      return `https://drive.google.com/file/d/${matchOpen[1]}/preview`;
    }
  }
  return null;
}

export function getGoogleDriveDirectUrl(url: string | null | undefined) {
  if (!url) return null;
  const fileDRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const openIdRegex = /id=([a-zA-Z0-9_-]+)/;
  const docsDRegex = /docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;

  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    const matchD = url.match(fileDRegex);
    if (matchD && matchD[1]) {
      return `https://lh3.googleusercontent.com/d/${matchD[1]}`;
    }
    const matchDocs = url.match(docsDRegex);
    if (matchDocs && matchDocs[1]) {
      return `https://lh3.googleusercontent.com/d/${matchDocs[1]}`;
    }
    const matchOpen = url.match(openIdRegex);
    if (matchOpen && matchOpen[1]) {
      return `https://lh3.googleusercontent.com/d/${matchOpen[1]}`;
    }
  }
  return null;
}

interface ExerciseThumbnailProps {
  videoUrl?: string | null;
  className?: string;
}

export function ExerciseThumbnail({ videoUrl, className }: ExerciseThumbnailProps) {
  const youtubeId = getYouTubeId(videoUrl);
  const driveDirectUrl = getGoogleDriveDirectUrl(videoUrl);
  const isGif = videoUrl?.toLowerCase().endsWith(".gif") || videoUrl?.toLowerCase().includes(".gif") || videoUrl?.toLowerCase().includes("giphy");
  const isMp4 = videoUrl?.toLowerCase().endsWith(".mp4") || videoUrl?.toLowerCase().includes(".mp4");
  const isDrive = videoUrl?.includes("drive.google.com") || videoUrl?.includes("docs.google.com");

  return (
    <div className={cn("size-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/[0.06] flex items-center justify-center shrink-0 shadow-inner relative group/thumb", className)}>
      {youtubeId ? (
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt="thumbnail"
          className="size-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
        />
      ) : driveDirectUrl ? (
        <img
          src={driveDirectUrl}
          alt="drive thumbnail"
          className="size-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
        />
      ) : isGif && videoUrl ? (
        <img
          src={videoUrl}
          alt="gif thumbnail"
          className="size-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
        />
      ) : isMp4 && videoUrl ? (
        <video
          src={videoUrl}
          className="size-full object-cover"
          muted
          preload="metadata"
        />
      ) : isDrive ? (
        <div className="size-full bg-blue-950/40 flex items-center justify-center">
          <Play className="size-4 text-blue-400 fill-blue-400/20 group-hover/thumb:scale-110 transition-transform" />
        </div>
      ) : (
        <Dumbbell className="size-4.5 text-zinc-500 group-hover/thumb:text-primary transition-colors" />
      )}
      {videoUrl && !isDrive && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
          <Play className="size-3.5 fill-white text-white" />
        </div>
      )}
    </div>
  );
}

interface ExercisePreviewModalProps {
  exercise: {
    id: string;
    name: string;
    videoUrl?: string | null;
    isOfficial?: boolean;
    usage?: number;
    muscleGroup?: { name: string } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExercisePreviewModal({ exercise, open, onOpenChange }: ExercisePreviewModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!exercise) return null;

  const youtubeId = getYouTubeId(exercise.videoUrl);
  const driveDirectUrl = getGoogleDriveDirectUrl(exercise.videoUrl);
  const isGif = exercise.videoUrl?.toLowerCase().endsWith(".gif") || exercise.videoUrl?.toLowerCase().includes(".gif") || exercise.videoUrl?.toLowerCase().includes("giphy");
  const isMp4 = exercise.videoUrl?.toLowerCase().endsWith(".mp4") || exercise.videoUrl?.toLowerCase().includes(".mp4");
  const driveEmbedUrl = getGoogleDriveEmbedUrl(exercise.videoUrl);

  const embedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}` : null;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + " execução correta")}`;

  const renderContent = () => (
    <div className="space-y-5 p-4 md:p-6 bg-zinc-950 text-foreground">
      {/* Aspect-Ratio video preview block */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08] shadow-2xl flex items-center justify-center">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Execução de ${exercise.name}`}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : driveDirectUrl ? (
          <img
            src={driveDirectUrl}
            alt={`Demonstração de ${exercise.name}`}
            className="w-full h-full object-contain"
          />
        ) : driveEmbedUrl ? (
          <iframe
            src={driveEmbedUrl}
            title={`Execução de ${exercise.name}`}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isGif && exercise.videoUrl ? (
          <img
            src={exercise.videoUrl}
            alt={`Demonstração de ${exercise.name}`}
            className="w-full h-full object-contain"
          />
        ) : isMp4 && exercise.videoUrl ? (
          <video
            src={exercise.videoUrl}
            className="w-full h-full object-cover"
            controls
            loop
            muted
            autoPlay
            playsInline
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-6 bg-zinc-900/30">
            <HelpCircle className="size-12 text-zinc-500 animate-bounce" />
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-bold text-white">Nenhum vídeo cadastrado</p>
              <p className="text-xs text-zinc-400">Este exercício não possui uma URL direta de execução registrada no sistema.</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2 text-xs gap-1.5 rounded-xl" asChild>
              <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer">
                <Search className="size-3.5 text-zinc-400" /> Buscar Ajuda no YouTube <ArrowRight className="size-3.5 ml-0.5" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Structured Exercise details cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Grupo Muscular</span>
          <span className="font-extrabold text-sm text-white truncate">{exercise.muscleGroup?.name || "Geral"}</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Categoria</span>
          <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
            {exercise.isOfficial ? (
              <>
                <Award className="size-4 text-primary shrink-0" /> Oficial
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-amber-400 shrink-0" /> Personalizado
              </>
            )}
          </span>
        </div>

        {exercise.usage !== undefined && (
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] flex flex-col gap-1 shadow-sm col-span-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Uso no Workspace</span>
            <span className="font-extrabold text-sm text-white">
              Este exercício é utilizado em <strong className="text-primary font-black">{exercise.usage}</strong> {exercise.usage === 1 ? "treino" : "treinos"} do sistema.
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-zinc-950 border-t border-white/[0.08] text-foreground rounded-t-3xl overflow-hidden p-0 max-h-[92vh]">
          <div className="mx-auto mt-4 h-1.5 w-[60px] rounded-full bg-zinc-800 shrink-0" />
          <DrawerHeader className="p-4 border-b border-white/[0.04] text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                Biblioteca de Exercícios
              </Badge>
              {exercise.muscleGroup?.name && (
                <Badge variant="outline" className="border-white/[0.06] text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-md">
                  {exercise.muscleGroup.name}
                </Badge>
              )}
            </div>
            <DrawerTitle className="text-xl font-black text-white">{exercise.name}</DrawerTitle>
            <DrawerDescription className="text-zinc-500 text-xs mt-0.5">
              Visualize a demonstração técnica para correta execução do movimento.
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto">
            {renderContent()}
          </div>

          <DrawerFooter className="p-4 border-t border-white/[0.04] flex flex-row items-center gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 rounded-xl h-11 border-white/[0.06]">
                Fechar
              </Button>
            </DrawerClose>
            {exercise.videoUrl && (
              <Button className="flex-1 rounded-xl h-11 font-bold text-xs" asChild>
                <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer">
                  Ver no YouTube <ArrowRight className="size-3.5 ml-1.5" />
                </a>
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl bg-zinc-950 border border-white/[0.08] text-foreground rounded-2xl shadow-2xl overflow-hidden p-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <DialogHeader className="p-4 md:p-5 flex flex-row items-center justify-between border-b border-white/[0.04] space-y-0 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                Biblioteca de Exercícios
              </Badge>
              {exercise.muscleGroup?.name && (
                <Badge variant="outline" className="border-white/[0.06] text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-md">
                  {exercise.muscleGroup.name}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
              <Dumbbell className="size-4.5 text-primary shrink-0" /> {exercise.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-[10px] md:text-xs">
              Demonstração técnica e execução correta do exercício.
            </DialogDescription>
          </div>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
