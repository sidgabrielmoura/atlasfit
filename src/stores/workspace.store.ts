import { proxy } from "valtio";
import { chatActions } from "./chat.store";
import { workoutActions } from "./workout.store";

export interface Workspace {
  id: string; name: string; slug: string; type?: "PERSONAL" | "GYM"; logo: string;
  logoUrl?: string | null; primaryColor: string; plan: string; slogan?: string | null;
  watermarkUrl?: string | null; workoutCoverUrl?: string | null; roles?: readonly string[];
  defaultRoute?: string; unitsCount?: number;
}
interface WorkspaceState { activeWorkspaceId: string | null; activeWorkspace: Workspace | null; workspaces: Workspace[]; isLoading: boolean; }

// The server cookie and membership check are authoritative. Never restore another login's tenant or theme from localStorage.
export const workspaceStore = proxy<WorkspaceState>({ activeWorkspaceId: null, activeWorkspace: null, workspaces: [], isLoading: false });

export const workspaceActions = {
  setWorkspaces(workspaces: readonly Workspace[]) {
    workspaceStore.workspaces = workspaces.map(workspace => ({ ...workspace, roles: workspace.roles ? [...workspace.roles] : undefined }));
    const active = workspaces.find(workspace => workspace.id === workspaceStore.activeWorkspaceId);
    if (active) workspaceStore.activeWorkspace = { ...active };
    // Listing memberships must not implicitly switch the server's selected context.
  },
  setActiveWorkspace(workspace: Workspace) {
    if (workspaceStore.activeWorkspaceId !== workspace.id) { chatActions.resetWorkspace(); workoutActions.bindWorkspace(workspace.id); }
    workspaceStore.activeWorkspaceId = workspace.id;
    workspaceStore.activeWorkspace = { ...workspace };
    if (!workspaceStore.workspaces.some(item => item.id === workspace.id)) workspaceStore.workspaces.push({ ...workspace });
    else workspaceStore.workspaces = workspaceStore.workspaces.map(item => item.id === workspace.id ? { ...workspace } : item);
  },
  setActiveWorkspaceId(id: string) {
    if (workspaceStore.activeWorkspaceId !== id) { chatActions.resetWorkspace(); workoutActions.bindWorkspace(id); }
    workspaceStore.activeWorkspaceId = id;
    workspaceStore.activeWorkspace = workspaceStore.workspaces.find(workspace => workspace.id === id) ?? null;
  },
  setLoading(loading: boolean) { workspaceStore.isLoading = loading; },
  clear() {
    chatActions.resetWorkspace();
    workoutActions.cancelWorkout();
    workspaceStore.activeWorkspaceId = null;
    workspaceStore.activeWorkspace = null;
    workspaceStore.workspaces = [];
    workspaceStore.isLoading = false;
  },
};
