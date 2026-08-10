"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ChevronRight, CreditCard, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockStatusData {
  status: "OK" | "UPCOMING" | "WARNING" | "LOCKED";
  daysUntilLock: number | null;
  overdueBilling: any | null;
}

const DISMISS_KEY = "student_billing_banner_dismissed_until";

export function StudentBillingTopBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<LockStatusData | null>(null);
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

    fetch("/api/student/lock-status")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((json: LockStatusData) => {
        if (json.status !== "OK") {
          setData(json);
        }
      })
      .catch(() => { });
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

  const handleNavigate = () => {
    if (pathname !== "/student/finance") {
      router.push("/student/finance");
    }
  };

  const isWarning = data.status === "WARNING" || data.status === "LOCKED";
  const days = data.daysUntilLock;

  let message = "";
  if (data.status === "UPCOMING") {
    message = days === 0 || days === 1 
      ? "Sua mensalidade vence hoje. Toque para regularizar" 
      : `Sua mensalidade vence em ${days} dias. Toque para regularizar`;
  } else if (data.status === "WARNING") {
    message = `Mensalidade em aberto (${days} dias para pausa dos treinos). Regularize agora`;
  } else {
    message = "Treinos pausados por pendência financeira. Regularize seu acesso";
  }

  return (
    <div
      onClick={handleNavigate}
      className={cn(
        "w-full py-2 px-3 sm:px-6 flex items-center justify-between text-xs font-semibold select-none cursor-pointer transition-all duration-300 backdrop-blur-xl border-b z-40 group shadow-xs",
        isWarning
          ? "bg-amber-500/15 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
          : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start">
        {isWarning ? (
          <AlertCircle className="size-3.5 shrink-0 text-amber-400 animate-pulse" />
        ) : (
          <Clock className="size-3.5 shrink-0 text-primary animate-pulse" />
        )}
        <span className="truncate tracking-tight font-medium text-[11px] sm:text-xs">
          {message}
        </span>
        <ChevronRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-1" />
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
