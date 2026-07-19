"use client";

import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";

export function PersonalHeaderWorkspace() {
  const snap = useSnapshot(workspaceStore);
  const activeWs = snap.activeWorkspace;

  if (!activeWs) return null;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex aspect-square size-8 items-center justify-center rounded-lg text-white font-bold text-xs shrink-0 overflow-hidden shadow-sm border border-white/[0.06]"
        style={{
          backgroundColor: activeWs.primaryColor || "var(--primary)",
        }}
      >
        {activeWs.logoUrl ? (
          <img
            src={activeWs.logoUrl}
            alt={activeWs.name}
            className="size-full object-cover"
          />
        ) : (
          <span>{activeWs.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-black tracking-tight text-foreground leading-none truncate max-w-[180px]">
          {activeWs.name}
        </span>
        <span
          className="text-[8px] font-black uppercase tracking-wider leading-none mt-0.5 truncate max-w-[150px]"
          style={{ color: activeWs.primaryColor || "var(--primary)" }}
        >
          {activeWs.plan || "Assessoria"}
        </span>
      </div>
    </div>
  );
}
