"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, AlertCircle, Clock, MessageCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformBillingStatusData {
  status: "OK" | "UPCOMING" | "WARNING" | "LOCKED";
  daysUntilLock: number | null;
  isManual: boolean;
  dueDate: string | null;
  whatsappUrl: string;
  checkoutUrl: string;
  planName?: string;
}

const DISMISS_KEY = "platform_billing_banner_dismissed_until";

export function PlatformBillingTopBanner({ role = "PERSONAL" }: { role?: "PERSONAL" | "GYM" }) {
  const router = useRouter();
  const [data, setData] = useState<PlatformBillingStatusData | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil) {
      const untilTs = Number(dismissedUntil);
      if (!isNaN(untilTs) && Date.now() < untilTs) {
        setDismissed(true);
        return;
      }
    }

    setDismissed(false);

    fetch("/api/platform/billing-status")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((json: PlatformBillingStatusData) => {
        if (json.status !== "OK") {
          setData(json);
        }
      })
      .catch(() => {});
  }, []);

  if (dismissed || !data || data.status === "OK") {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const expireTs = Date.now() + thirtyMinutesInMs;
    localStorage.setItem(DISMISS_KEY, expireTs.toString());
    setDismissed(true);
  };

  const handleRegularize = () => {
    if (data.isManual && data.whatsappUrl) {
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
    } else if (data.checkoutUrl) {
      if (data.checkoutUrl.startsWith("http")) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      } else {
        router.push(data.checkoutUrl);
      }
    }
  };

  const isOverdue = data.status === "WARNING" || data.status === "LOCKED";
  const days = data.daysUntilLock;

  let message = "";
  if (data.status === "UPCOMING") {
    message =
      days === 0 || days === 1
        ? "Sua mensalidade vence hoje. Clique para regularizar"
        : `Sua mensalidade vence em ${days} dias. Clique para regularizar`;
  } else if (data.status === "WARNING") {
    message = `Mensalidade em aberto (${days} dias até a suspensão do acesso). Regularize agora`;
  } else {
    message = "Acesso suspenso por pendência financeira. Regularize seu plano";
  }

  return (
    <div
      onClick={handleRegularize}
      className={cn(
        "w-full py-2 px-3 sm:px-6 flex items-center justify-between text-xs font-semibold select-none cursor-pointer transition-all duration-300 backdrop-blur-xl border-b z-40 group shadow-xs",
        isOverdue
          ? "bg-rose-500/15 border-rose-500/30 text-rose-200 hover:bg-rose-500/20"
          : "bg-amber-500/15 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start">
        {isOverdue ? (
          <AlertCircle className="size-3.5 shrink-0 text-rose-400 animate-pulse" />
        ) : (
          <Clock className="size-3.5 shrink-0 text-amber-400 animate-pulse" />
        )}
        <span className="truncate tracking-tight font-medium text-[11px] sm:text-xs">
          {message}
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider underline underline-offset-2 ml-1 text-foreground/90">
          Regularizar
          {data.isManual ? (
            <MessageCircle className="size-3 text-emerald-400 ml-0.5" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-1" />
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        title="Fechar por 30 minutos"
        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2 cursor-pointer"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
