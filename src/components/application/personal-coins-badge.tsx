"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useImportCreditRealtime } from "@/hooks/use-import-realtime";

interface PersonalCoinsBadgeProps {
  role?: "personal" | "gym";
  workspaceId?: string;
  className?: string;
}

export function PersonalCoinsBadge({ role, workspaceId: workspaceIdProp, className }: PersonalCoinsBadgeProps = {}) {
  const pathname = usePathname();
  const workspaceSnap = useSnapshot(workspaceStore);
  const effectiveWorkspaceId = workspaceIdProp || workspaceSnap.activeWorkspaceId || workspaceSnap.activeWorkspace?.id;
  const isGym = role === "gym" || pathname?.startsWith("/gym") || workspaceSnap.activeWorkspace?.type === "GYM";
  const [coins, setCoins] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const revision = useRef(0);
  const requestId = useRef(0);

  const fetchBalance = useCallback(async () => {
    if (!effectiveWorkspaceId) {
      setIsLoading(false);
      return;
    }
    const startedAt = revision.current;
    const request = ++requestId.current;
    try {
      const endpoint = isGym
        ? `/api/gym/credits/balance?workspaceId=${effectiveWorkspaceId}`
        : `/api/personal/credits/balance?workspaceId=${effectiveWorkspaceId}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (request === requestId.current && startedAt === revision.current) setCoins(data.credits ?? 0);
      } else {
        if (request === requestId.current && startedAt === revision.current) setCoins(previous => previous ?? 0);
      }
    } catch {
      if (request === requestId.current && startedAt === revision.current) setCoins(previous => previous ?? 0);
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, [effectiveWorkspaceId, isGym]);

  useEffect(() => {
    setCoins(null);
    setIsLoading(true);
    void fetchBalance();
    return () => { requestId.current++; };
  }, [fetchBalance]);
  useImportCreditRealtime(effectiveWorkspaceId, isGym ? "gym" : "personal", balance => {
    revision.current++;
    setCoins(balance.credits);
    setIsLoading(false);
  }, () => { void fetchBalance(); });

  if (isLoading && coins === null) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold tracking-tight shadow-xs",
          className
        )}
      >
        <Zap className="size-2.5 text-primary/40 animate-pulse" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    );
  }

  const targetHref = isGym ? "/gym/credits" : "/personal/credits";
  const title = isGym
    ? "Créditos de Importação da Academia)"
    : "Créditos de Importação do Personal";

  return (
    <Link
      href={targetHref}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold tracking-tight hover:bg-primary/10 hover:border-primary/20 transition-all duration-200 shadow-xs cursor-pointer",
        className
      )}
      title={title}
    >
      <Zap className="size-2.5 fill-primary text-primary" />
      <span className="tabular-nums">{(coins ?? 0)} créditos</span>
    </Link>
  );
}

export const CoinsBadge = PersonalCoinsBadge;
