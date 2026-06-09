"use client";

import { useEffect } from "react";
import { workspaceActions } from "@/stores/workspace.store";

interface WorkspaceInitializerProps {
  workspace: any;
}

export function WorkspaceInitializer({ workspace }: WorkspaceInitializerProps) {
  useEffect(() => {
    if (workspace) {
      workspaceActions.setActiveWorkspace(workspace);
      workspaceActions.setWorkspaces([workspace]);
    }
  }, [workspace]);

  return null;
}
