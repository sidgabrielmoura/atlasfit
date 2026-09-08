"use client";

import { useEffect, useLayoutEffect } from "react";
import { workspaceActions } from "@/stores/workspace.store";
import { updateMobileStatusBar } from "./dynamic-branding";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface WorkspaceInitializerProps {
  workspace: any;
}

export function WorkspaceInitializer({ workspace }: WorkspaceInitializerProps) {
  useIsomorphicLayoutEffect(() => {
    if (workspace) {
      workspaceActions.setActiveWorkspace(workspace);
      workspaceActions.setWorkspaces([workspace]);
      if (workspace.primaryColor) {
        updateMobileStatusBar(workspace.primaryColor);
      }
    }
  }, [workspace]);

  return null;
}
