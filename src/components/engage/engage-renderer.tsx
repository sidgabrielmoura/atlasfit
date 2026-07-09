"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Ticket, 
  Trophy, 
  Video, 
  ExternalLink, 
  CheckCircle,
  Copy,
  ChevronRight,
  Play
} from "lucide-react";

export function convertToEmbedUrl(url: string): string {
  if (!url) return "";
  url = url.trim();

  // YouTube standard watch link, shorts, or share link
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([^"&?\/ ]{11})/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    return `https://www.youtube.com/embed/${ytShortsMatch[1]}`;
  }

  // Vimeo standard, channel or album video links
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";

interface EngageBlock {
  id: string;
  type: "TITLE" | "TEXT" | "IMAGE" | "VIDEO" | "BUTTON" | "COUPON" | "CHALLENGE" | "SEPARATOR" | "SPACER";
  content: any;
}

interface EngageExperience {
  id: string;
  title: string;
  category: string;
  format: "BANNER" | "CARD" | "DRAWER" | "MODAL" | "FULLSCREEN";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  priority: number;
  startDate: string;
  endDate: string;
  showOnlyOnce: boolean;
  blocks: EngageBlock[];
  segmentation: any;
  workspaceId?: string | null;
}

export function EngageRenderer() {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [modalExperiences, setModalExperiences] = useState<EngageExperience[]>([]);
  const [currentExp, setCurrentExp] = useState<EngageExperience | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchActiveExperiences = useCallback(async () => {
    try {
      const url = `/api/engage/active${activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data: EngageExperience[] = await res.json();
      
      // Filter for pop-up formats
      const popups = data.filter(e => 
        e.format === "MODAL" || e.format === "DRAWER" || e.format === "FULLSCREEN"
      );

      setModalExperiences(popups);
      if (popups.length > 0) {
        // Render highest priority one first
        setCurrentExp(popups[0]);
        setIsOpen(true);
        
        // Log view event
        await fetch(`/api/engage/${popups[0].id}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "VIEW" })
        });
      }
    } catch (error) {
      console.error("Failed to load active experiences", error);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    // Small delay to allow the dashboard to render first
    const timer = setTimeout(fetchActiveExperiences, 1800);
    return () => clearTimeout(timer);
  }, [fetchActiveExperiences, activeWorkspaceId]);

  const handleClose = async (isDismissed = true) => {
    if (!currentExp) return;

    setIsOpen(false);
    
    // Log dismiss event if user manually closes
    if (isDismissed) {
      await fetch(`/api/engage/${currentExp.id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "DISMISS" })
      });
    }

    // Shift queue to transition sequentially
    const remaining = modalExperiences.slice(1);
    setModalExperiences(remaining);
    if (remaining.length > 0) {
      setCurrentExp(remaining[0]);
      // Small timeout to allow state to propagate and backdrop to animate smoothly
      setTimeout(() => setIsOpen(true), 150);
      
      // Log view event for the new active experience in queue
      await fetch(`/api/engage/${remaining[0].id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "VIEW" })
      });
    } else {
      setCurrentExp(null);
    }
  };

  const handleAction = async (block: EngageBlock) => {
    if (!currentExp) return;

    const { action, link } = block.content;

    // Log click event
    await fetch(`/api/engage/${currentExp.id}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "CLICK", metadata: { action } })
    });

    if (action === "URL_EXTERNAL" && link) {
      window.open(link.startsWith("http") ? link : `https://${link}`, "_blank");
    } else if (action === "OPEN_WORKOUT") {
      router.push("/student/workouts");
    } else if (action === "OPEN_ASSESSMENT") {
      router.push("/student/assessments");
    } else if (action === "OPEN_FINANCE") {
      router.push("/student/finance");
    } else if (action === "OPEN_CRM") {
      router.push("/student/crm");
    } else if (action === "OPEN_CHAT") {
      router.push("/student/chat");
    } else if (action === "JOIN_CHALLENGE") {
      // Log join event
      await fetch(`/api/engage/${currentExp.id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "JOIN" })
      });
      toast.success("Inscrito no desafio com sucesso!");
    } else if (action === "APPLY_COUPON" && link) {
      navigator.clipboard.writeText(link);
      toast.success(`Cupom "${link}" copiado com sucesso!`);
    }

    // Complete the experience
    await fetch(`/api/engage/${currentExp.id}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "COMPLETE" })
    });

    handleClose(false);
  };

  if (modalExperiences.length === 0 || !isOpen) return null;

  return (
    <AnimatePresence>
      {modalExperiences.map((exp) => {
        const isCurrent = exp.id === currentExp?.id;
        const isFullscreen = exp.format === "FULLSCREEN";
        const isDrawer = exp.format === "DRAWER";

        return (
          <div 
            key={exp.id} 
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
              isCurrent ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none absolute"
            )}
            style={{ display: isCurrent ? "flex" : "none" }}
          >
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isCurrent ? { opacity: 1 } : { opacity: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => handleClose(true)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal content container */}
            <motion.div
              initial={
                isDrawer 
                  ? { y: "100%", opacity: 1 } 
                  : isFullscreen 
                    ? { scale: 1, opacity: 0 } 
                    : { scale: 0.95, opacity: 0 }
              }
              animate={
                isCurrent 
                  ? { y: 0, scale: 1, opacity: 1 } 
                  : { opacity: 0 }
              }
              exit={
                isDrawer 
                  ? { y: "100%", opacity: 1 } 
                  : { scale: 0.95, opacity: 0 }
              }
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className={cn(
                "bg-zinc-950 border border-white/10 text-foreground relative z-10 w-full flex flex-col shadow-2xl overflow-hidden select-none",
                isFullscreen && "h-full max-h-full rounded-none border-0 pt-12 p-6 md:p-12",
                isDrawer && "mt-auto rounded-t-3xl max-h-[85vh] p-6 max-w-lg border-b-0",
                !isFullscreen && !isDrawer && "max-w-md rounded-2xl p-6 m-4 max-h-[85vh] overflow-y-auto"
              )}
            >
              {/* Header row */}
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-4 border-b border-white/5 pb-2">
                <span>{exp.category}</span>
                <button 
                  onClick={() => handleClose(true)} 
                  className="p-1 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-bold text-[9px]"
                >
                  FECHAR <X className="size-3.5" />
                </button>
              </div>

              {/* Render Blocks */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {exp.blocks.map(block => (
                  <RenderBlock key={block.id} block={block} onAction={handleAction} />
                ))}
              </div>
            </motion.div>
          </div>
        );
      })}
    </AnimatePresence>
  );
}

interface EngageInlineProps {
  format: "BANNER" | "CARD";
  workspaceId?: string;
}

export function EngageInline({ format, workspaceId }: EngageInlineProps) {
  const router = useRouter();
  const [experiences, setExperiences] = useState<EngageExperience[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInlineExperiences = useCallback(async () => {
    try {
      const url = `/api/engage/active${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data: EngageExperience[] = await res.json();
      
      // Filter for matching format
      const matched = data.filter(e => e.format === format);
      setExperiences(matched);

      // Log VIEW events for all displayed inline experiences
      for (const exp of matched) {
        fetch(`/api/engage/${exp.id}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "VIEW" })
        }).catch(err => console.error(err));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [format, workspaceId]);

  useEffect(() => {
    fetchInlineExperiences();
  }, [fetchInlineExperiences, workspaceId]);

  const handleAction = async (expId: string, block: EngageBlock) => {
    const { action, link } = block.content;

    // Log click event
    await fetch(`/api/engage/${expId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "CLICK", metadata: { action } })
    });

    const isPersonal = typeof window !== "undefined" && window.location.pathname.startsWith("/personal");
    const routePrefix = isPersonal ? "/personal" : "/student";

    if (action === "URL_EXTERNAL" && link) {
      window.open(link.startsWith("http") ? link : `https://${link}`, "_blank");
    } else if (action === "OPEN_WORKOUT") {
      router.push(`${routePrefix}/workouts`);
    } else if (action === "OPEN_ASSESSMENT") {
      router.push(`${routePrefix}/assessments`);
    } else if (action === "OPEN_FINANCE") {
      router.push(`${routePrefix}/finance`);
    } else if (action === "OPEN_CRM") {
      router.push(`${routePrefix}/crm`);
    } else if (action === "APPLY_COUPON" && link) {
      if (isPersonal) {
        navigator.clipboard.writeText(link);
        toast.success(`Cupom "${link}" copiado!`);
      } else {
        toast.error("Alunos não possuem cupons aplicáveis.");
      }
    }

    // Complete the experience
    await fetch(`/api/engage/${expId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "COMPLETE" })
    });

    // Remove from inlined list immediately
    setExperiences(prev => prev.filter(e => e.id !== expId));
  };

  if (loading || experiences.length === 0) return null;

  return (
    <div className="space-y-3.5 w-full animate-in fade-in duration-300">
      {experiences.map(exp => (
        <div 
          key={exp.id} 
          className={cn(
            "border border-border/40 transition-all shadow-xs",
            format === "BANNER" && "bg-gradient-to-br from-secondary/40 via-secondary/15 to-background border border-border/40 hover:border-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
            format === "CARD" && "bg-card border-border/40 p-5 rounded-2xl flex flex-col gap-4 text-left"
          )}
        >
          {format === "BANNER" ? (
            <>
              {/* Extract first image block if any */}
              {exp.blocks.some(b => b.type === "IMAGE" && b.content.imageUrl) ? (
                <div className="shrink-0 w-full sm:w-36 aspect-video rounded-xl overflow-hidden border border-white/5 bg-zinc-950/40 relative shadow-inner">
                  <img 
                    src={exp.blocks.find(b => b.type === "IMAGE")?.content.imageUrl} 
                    className="size-full object-cover" 
                    alt="Banner thumbnail" 
                  />
                </div>
              ) : exp.blocks.some(b => b.type === "VIDEO" && b.content.videoUrl) ? (
                <div className="shrink-0 w-full sm:w-36 aspect-video rounded-xl overflow-hidden border border-white/5 bg-zinc-950/40 flex items-center justify-center relative bg-zinc-900 shadow-inner">
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                    <div className="size-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-xs">
                      <Play className="size-3 fill-white ml-0.5" />
                    </div>
                  </div>
                  <Video className="size-5 text-zinc-500" />
                </div>
              ) : null}

              <div className="flex-1 min-w-0 space-y-1 text-left">
                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary mb-1 inline-block">
                  {exp.category}
                </span>
                {exp.blocks.map(b => {
                  if (b.type === "TITLE") {
                    return <h4 key={b.id} className="text-sm font-black tracking-tight text-foreground leading-snug">{b.content.text}</h4>;
                  }
                  if (b.type === "TEXT") {
                    return <p key={b.id} className="text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed">{b.content.text}</p>;
                  }
                  return null;
                })}
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                {exp.blocks.map(b => {
                  if (b.type === "BUTTON") {
                    return (
                      <Button 
                        key={b.id} 
                        size="sm" 
                        onClick={() => handleAction(exp.id, b)}
                        className="w-full sm:w-auto h-9 text-[10px] font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-md shadow-primary/10 transition-all duration-300"
                      >
                        {b.content.text} <ChevronRight className="size-3.5 ml-1" />
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary">
                  {exp.category}
                </span>
              </div>
              <div className="space-y-3.5">
                {exp.blocks.map(b => (
                  <RenderBlock key={b.id} block={b} onAction={(block) => handleAction(exp.id, block)} />
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function RenderBlock({ block, onAction }: { block: EngageBlock; onAction: (b: EngageBlock) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código do cupom copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  switch (block.type) {
    case "TITLE":
      return (
        <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground leading-snug">
          {block.content.text}
        </h3>
      );
    case "TEXT":
      return (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {block.content.text}
        </p>
      );
    case "IMAGE":
      return block.content.imageUrl ? (
        <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-white/5 bg-zinc-950">
          <img src={block.content.imageUrl} className="size-full object-cover" alt="Campaign Banner" />
        </div>
      ) : null;
    case "VIDEO":
      if (!block.content.videoUrl) return null;
      const displayUrl = convertToEmbedUrl(block.content.videoUrl);
      const isDirectVideo = 
        displayUrl.startsWith("blob:") || 
        displayUrl.includes("campaign_banner") ||
        displayUrl.includes("/api/storage/file") ||
        /\.(mp4|webm|ogg|mov|m4v)(?:\?|$)/i.test(displayUrl);
      return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-zinc-950">
          {isDirectVideo ? (
            <video 
              src={displayUrl} 
              controls 
              className="absolute inset-0 size-full object-cover" 
            />
          ) : (
            <iframe 
              src={displayUrl} 
              className="absolute inset-0 size-full border-0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      );
    case "BUTTON":
      return (
        <Button 
          onClick={() => onAction(block)}
          className="w-full h-11 rounded-xl text-xs font-black bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-lg shadow-primary/10 gap-1.5"
        >
          {block.content.text} 
          {block.content.action === "URL_EXTERNAL" && <ExternalLink className="size-3.5" />}
        </Button>
      );
    case "COUPON":
      return (
        <div className="w-full border border-dashed border-emerald-500/35 bg-emerald-500/5 p-3 rounded-xl flex items-center justify-between gap-3">
          <Ticket className="size-5 text-emerald-500 shrink-0" />
          <span className="text-sm font-black tracking-widest text-emerald-500 uppercase flex-1 truncate text-left">
            {block.content.code || "CUPOM"}
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleCopyCode(block.content.code)}
            className="h-8 rounded-lg text-[10px] font-black border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer shrink-0"
          >
            {copied ? (
              <span className="flex items-center gap-1"><CheckCircle className="size-3 text-emerald-500" /> COPIADO</span>
            ) : (
              <span className="flex items-center gap-1"><Copy className="size-3" /> COPIAR</span>
            )}
          </Button>
        </div>
      );
    case "CHALLENGE":
      return (
        <div className="w-full border border-yellow-500/20 bg-yellow-500/5 p-4 rounded-2xl space-y-2 flex flex-col text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-yellow-500 shrink-0" />
              <span className="text-sm font-black tracking-tight text-white leading-tight truncate">
                {block.content.title || "Novo Desafio"}
              </span>
            </div>
            <span className="text-[10px] font-black text-yellow-500 whitespace-nowrap">+{block.content.points || 0} XP</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full w-[15%]" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Progresso: 0 / {block.content.goal || 5}</span>
            <Button 
              size="sm"
              onClick={() => onAction(block)}
              className="h-7 px-4 rounded-lg text-[9px] font-black bg-yellow-500 text-black hover:bg-yellow-600 cursor-pointer"
            >
              Participar
            </Button>
          </div>
        </div>
      );
    case "SEPARATOR":
      return <hr className="border-border/30 w-full my-1" />;
    case "SPACER":
      return <div style={{ height: `${block.content.height || 16}px` }} className="w-full" />;
    default:
      return null;
  }
}
