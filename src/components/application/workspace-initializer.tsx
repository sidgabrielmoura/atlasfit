"use client";

import { useEffect, useLayoutEffect } from "react";
import { workspaceActions, type Workspace } from "@/stores/workspace.store";
import { normalizeWorkspaceColor } from "@/modules/workspaces/domain/branding";
import { updateMobileStatusBar } from "./dynamic-branding";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface WorkspaceInitializerProps {
  workspace: Omit<Workspace, "primaryColor"> & { primaryColor: string | null };
}

export function WorkspaceInitializer({ workspace }: WorkspaceInitializerProps) {
  useIsomorphicLayoutEffect(() => {
    if (workspace) {
      const primaryColor = normalizeWorkspaceColor(workspace.primaryColor);
      workspaceActions.setActiveWorkspace({ ...workspace, primaryColor });
      updateMobileStatusBar(primaryColor);
    }
  }, [workspace]);

  return null;
}
