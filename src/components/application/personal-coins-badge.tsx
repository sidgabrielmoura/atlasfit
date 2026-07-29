"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";

export function PersonalCoinsBadge() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const res = await fetch(`/api/personal/credits/balance?workspaceId=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          setCoins(data.credits ?? 0);
        }
      } catch { }
    })();
  }, [workspaceId]);

  if (coins === null) return null;

  return (
    <Link
      href="/personal/credits"
      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold tracking-tight hover:bg-primary/10 hover:border-primary/20 transition-all duration-200 shadow-xs"
      title="Créditos de Importação (Coins do Personal)"
    >
      <Zap className="size-2.5 fill-primary text-primary" />
      <span className="tabular-nums">{coins} coins</span>
    </Link>
  );
}
