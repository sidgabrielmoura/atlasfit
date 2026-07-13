"use client";

import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { usePathname } from "next/navigation";

export function DynamicBranding() {
  const snap = useSnapshot(workspaceStore);
  const pathname = usePathname();
  
  let color = snap.activeWorkspace?.primaryColor || "#3052EB";
  if (color === "#0ea5e9" || color === "#ea580c") {
    color = "#3052EB";
  }

  // Na área de SuperAdmin, sempre force a cor premium azul (#3052EB)
  if (pathname?.startsWith("/superadmin")) {
    color = "#3052EB";
  }

  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        :root, .dark {
          --primary: ${color} !important;
          --sidebar-primary: ${color} !important;
          --ring: ${color} !important;
          --sidebar-ring: ${color} !important;
          --chart-1: ${color} !important;
        }
      `
    }} />
  );
}
