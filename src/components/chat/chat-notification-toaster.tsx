"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSnapshot } from "valtio";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { chatStore, chatActions, ChatToast } from "@/stores/chat.store";
import { useBottomAlertOffset, useDesktopAlertOffset, useIsModalOpen } from "@/hooks/use-bottom-alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const DEFAULT_CARD_HEIGHT = 64;
const STACK_GAP = 10;
const COLLAPSED_OFFSET = 13;

interface ToastCardProps {
  toast: ChatToast;
  index: number;
  totalCount: number;
  isHovered: boolean;
  offsetY: number;
  onDismiss: (id: string) => void;
  onClick: (toast: ChatToast) => void;
  onHeightReport: (id: string, height: number) => void;
}

function ToastCard({
  toast,
  index,
  totalCount,
  isHovered,
  offsetY,
  onDismiss,
  onClick,
  onHeightReport,
}: ToastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Notifica o container da altura real deste card para cálculo de espaçamento
  useEffect(() => {
    if (cardRef.current) {
      const height = cardRef.current.offsetHeight;
      if (height > 0) {
        onHeightReport(toast.id, height);
      }
    }
  }, [toast.content, onHeightReport, toast.id]);

  // Temporizador de auto-dismiss (6 segundos) pausado quando o mouse está sobre a pilha
  useEffect(() => {
    if (isHovered) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    timeoutRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, 6000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isHovered, onDismiss, toast.id]);

  // Configuração do efeito de empilhamento shadcn/Sonner
  const isFront = index === 0;
  const isVisibleCollapsed = index <= 2;

  const scale = isHovered ? 1 : Math.max(0.85, 1 - index * 0.05);
  const opacity = isHovered ? 1 : isVisibleCollapsed ? Math.max(0.5, 1 - index * 0.18) : 0;
  const zIndex = 50 - index;
  const pointerEvents = isHovered || isFront ? "auto" : "none";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{
        opacity,
        y: offsetY,
        scale,
      }}
      exit={{
        opacity: 0,
        scale: 0.85,
        y: 12,
        transition: { duration: 0.15 },
      }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 32,
        mass: 0.8,
      }}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex,
        pointerEvents,
        transformOrigin: "bottom center",
      }}
    >
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={() => onClick(toast)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(toast);
          }
        }}
        className={cn(
          "group relative flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl cursor-pointer select-none",
          "bg-white/95 dark:bg-zinc-900/90 backdrop-blur-2xl",
          "border border-black/10 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40",
          "shadow-lg dark:shadow-2xl dark:shadow-black/70",
          "ring-1 ring-black/5 dark:ring-white/5",
          "transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] overflow-hidden w-full"
        )}
      >
        {/* Avatar com Badge de Mensagem WhatsApp-style */}
        <div className="relative shrink-0">
          <Avatar className="size-8.5 sm:size-9 ring-1 ring-border/60">
            {toast.senderImage && (
              <AvatarImage src={toast.senderImage} alt={toast.senderName} />
            )}
            <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              {getInitials(toast.senderName)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center shadow-xs">
            <MessageCircle className="size-2 text-white fill-white" />
          </span>
        </div>

        {/* Conteúdo Textual */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[170px] sm:max-w-[210px]">
              {toast.senderName}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Badge indicadora de pilha caso haja mais de uma mensagem e não esteja hovered */}
              {!isHovered && totalCount > 1 && isFront && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                  +{totalCount - 1}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/80 font-medium">
                agora
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate leading-snug">
            {toast.content}
          </p>
        </div>

        {/* Botão Fechar */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          className="size-6 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 shrink-0"
          title="Fechar notificação"
        >
          <X className="size-3.5" />
          <span className="sr-only">Fechar</span>
        </Button>

        {/* Barra de progresso sutil na base */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/20 overflow-hidden">
          <div
            className={cn(
              "h-full bg-emerald-500 transition-all duration-300",
              isHovered && "opacity-75"
            )}
            style={{
              width: "100%",
              animation: isHovered
                ? "none"
                : "chat-toast-progress 6s linear forwards",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function ChatNotificationToaster() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});

  const chatSnap = useSnapshot(chatStore);
  const mobileAlertOffset = useBottomAlertOffset();
  const desktopAlertOffset = useDesktopAlertOffset();
  const isModalOpen = useIsModalOpen();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleHeightReport = useCallback((id: string, height: number) => {
    setCardHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const rawToasts = chatSnap.messageToasts;
  if (!rawToasts || rawToasts.length === 0) return null;

  // Ordena os toasts com o mais recente no topo da pilha (index 0)
  const toasts = [...rawToasts].reverse();

  const handleDismiss = (id: string) => {
    chatActions.removeMessageToast(id);
  };

  const handleClick = (toast: ChatToast) => {
    chatActions.removeMessageToast(toast.id);
    chatActions.setActiveConversationId(toast.conversationId);

    let targetBase = "/student/chat";
    if (pathname?.startsWith("/personal") || session?.user?.role === "TRAINER") {
      targetBase = "/personal/chat";
    } else if (pathname?.startsWith("/gym")) {
      targetBase = "/gym/chat";
    }

    const targetUrl = `${targetBase}?conversationId=${encodeURIComponent(toast.conversationId)}&messageId=${encodeURIComponent(toast.id)}`;

    // Dispara evento imediato para scroll e animação caso o usuário já esteja com o chat aberto
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat:focus-message", {
          detail: {
            conversationId: toast.conversationId,
            messageId: toast.id,
          },
        })
      );
    }

    router.push(targetUrl);
  };

  // Cálculo da altura dinâmica do container para garantir que o hover cubra todos os cards expandidos
  const frontHeight = cardHeights[toasts[0]?.id] || DEFAULT_CARD_HEIGHT;
  const collapsedHeight = frontHeight + Math.min(toasts.length - 1, 2) * COLLAPSED_OFFSET;
  const totalExpandedHeight = toasts.reduce(
    (sum, t) => sum + (cardHeights[t.id] || DEFAULT_CARD_HEIGHT) + STACK_GAP,
    0
  );
  const containerHeight = isHovered && toasts.length > 1 ? totalExpandedHeight : collapsedHeight;

  return createPortal(
    <aside
      aria-label="Notificações de novas mensagens do chat"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered((prev) => !prev)}
      style={{
        // No mobile: fica empilhado acima da navbar mobile (56px) + offset de alertas ativos
        // No desktop: fica no canto inferior direito, empilhado acima de qualquer alerta ativo
        bottom:
          typeof window !== "undefined" && window.innerWidth >= 768
            ? desktopAlertOffset > 0
              ? `calc(1.5rem + ${desktopAlertOffset}px)`
              : "1.5rem"
            : `calc(5.5rem + ${mobileAlertOffset}px + env(safe-area-inset-bottom, 0px))`,
      }}
      className={cn(
        "fixed z-40 select-none pointer-events-none",
        "transition-[bottom,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        // Mobile: centralizado na base
        "max-md:left-1/2 max-md:-translate-x-1/2 max-md:w-[calc(100%-2rem)] max-md:max-w-sm",
        // Desktop: canto inferior direito
        "md:left-auto md:right-6 md:translate-x-0 md:w-88 md:max-w-sm",
        isModalOpen && "opacity-0 pointer-events-none invisible"
      )}
    >
      <style jsx global>{`
        @keyframes chat-toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

      {/* Wrapper relativo com altura correspondente à expansão para capturar eventos de mouse */}
      <div
        style={{ height: containerHeight }}
        className="relative w-full transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => {
            // Cálculo da posição Y:
            // No modo recolhido (collapsed): cards anteriores se sobrepõem com leve offset negativo (-13px)
            // No modo expandido (hovered): cards se separam verticalmente em ordem com gap limpo
            let offsetY = 0;
            if (isHovered && toasts.length > 1) {
              for (let i = 0; i < index; i++) {
                offsetY -= (cardHeights[toasts[i]?.id] || DEFAULT_CARD_HEIGHT) + STACK_GAP;
              }
            } else {
              offsetY = -index * COLLAPSED_OFFSET;
            }

            return (
              <ToastCard
                key={toast.id}
                toast={toast}
                index={index}
                totalCount={toasts.length}
                isHovered={isHovered}
                offsetY={offsetY}
                onDismiss={handleDismiss}
                onClick={handleClick}
                onHeightReport={handleHeightReport}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </aside>,
    document.body
  );
}
