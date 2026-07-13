import { proxy, subscribe } from "valtio";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo: string;
  logoUrl?: string | null;
  primaryColor: string;
  plan: string;
  slogan?: string | null;
  watermarkUrl?: string | null;
  workoutCoverUrl?: string | null;
}

interface WorkspaceState {
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
}

const storageKey = "atlasfit_workspace_store";

const initialState: WorkspaceState = {
  activeWorkspaceId: null,
  activeWorkspace: null,
  workspaces: [],
  isLoading: false,
};

const getPersistedState = () => {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      const activeWorkspace = parsed.activeWorkspace || null;
      if (activeWorkspace && (activeWorkspace.primaryColor === "#0ea5e9" || activeWorkspace.primaryColor === "#ea580c" || !activeWorkspace.primaryColor)) {
        activeWorkspace.primaryColor = "#3052EB";
      }
      let workspaces = parsed.workspaces || [];
      workspaces = workspaces.map((w: any) => {
        if (w.primaryColor === "#0ea5e9" || w.primaryColor === "#ea580c" || !w.primaryColor) {
          return { ...w, primaryColor: "#3052EB" };
        }
        return w;
      });
      return {
        ...initialState,
        activeWorkspaceId: parsed.activeWorkspaceId || null,
        activeWorkspace,
        workspaces,
      };
    }
  } catch (err) {
    console.error("Failed to parse persisted workspace state:", err);
  }
  return initialState;
};

export const workspaceStore = proxy<WorkspaceState>(getPersistedState());

if (typeof window !== "undefined") {
  subscribe(workspaceStore, () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          activeWorkspaceId: workspaceStore.activeWorkspaceId,
          activeWorkspace: workspaceStore.activeWorkspace,
          workspaces: workspaceStore.workspaces,
        })
      );
    } catch (err) {
      console.error("Failed to persist workspace state:", err);
    }
  });
}

export const workspaceActions = {
  setWorkspaces(workspaces: Workspace[]) {
    workspaceStore.workspaces = workspaces;
    
    // Auto-select first workspace or sync activeWorkspace if activeWorkspaceId exists
    if (workspaces.length > 0) {
      const found = workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
      if (found) {
        workspaceStore.activeWorkspace = found;
      } else {
        workspaceStore.activeWorkspaceId = workspaces[0].id;
        workspaceStore.activeWorkspace = workspaces[0];
      }
    } else {
      workspaceStore.activeWorkspaceId = null;
      workspaceStore.activeWorkspace = null;
    }
  },

  setActiveWorkspace(workspace: Workspace) {
    workspaceStore.activeWorkspaceId = workspace.id;
    workspaceStore.activeWorkspace = workspace;
  },

  setActiveWorkspaceId(id: string) {
    workspaceStore.activeWorkspaceId = id;
    workspaceStore.activeWorkspace = null;
  },

  setLoading(loading: boolean) {
    workspaceStore.isLoading = loading;
  }
};
