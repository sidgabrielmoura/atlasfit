import { proxy, subscribe, useSnapshot } from "valtio";
import api from "@/lib/axios";

export interface EngageBlock {
  id: string;
  type: "TITLE" | "TEXT" | "IMAGE" | "VIDEO" | "BUTTON" | "BANNER" | "CARD" | "LIST" | "COUNTER" | "CTA" | "COUPON" | "CHALLENGE" | "SEPARATOR" | "SPACER";
  content: any; // Text value, URL, or JSON action configuration
}

export interface EngageSegmentation {
  roles?: string[];         // ["PERSONAL", "STUDENT"]
  plans?: string[];         // Specific plan names
  workspaceIds?: string[];  // Targeted workspaces
  objective?: string;       // "Hipertrofia", "Emagrecimento", etc.
  tags?: string[];          // Lead or student tags
  isActiveStudent?: boolean;// Target active/inactive
}

export interface EngageExperience {
  id: string;
  title: string;
  category: string;
  format: "BANNER" | "CARD" | "DRAWER" | "MODAL" | "FULLSCREEN";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  priority: number;
  startDate: string;
  endDate: string;
  showOnlyOnce: boolean;
  blocks: EngageBlock[];
  segmentation: EngageSegmentation;
  workspaceId?: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  // Stats aggregated
  _count?: {
    userStatuses: number;
    eventLogs: number;
  };
  stats?: {
    views: number;
    clicks: number;
    dismisses: number;
    joins: number;
    completions: number;
    ctr: number;
  };
}

interface EngageState {
  experiences: EngageExperience[];
  isLoading: boolean;
  error: string | null;
  filters: {
    search: string;
    category: string;
    format: string;
    status: string;
    page: number;
    limit: number;
  };
  pagination: {
    total: number;
    pages: number;
  };
}

const storageKey = "atlasfit_engage_store";

const initialState: EngageState = {
  experiences: [],
  isLoading: false,
  error: null,
  filters: {
    search: "",
    category: "all",
    format: "all",
    status: "all",
    page: 1,
    limit: 10,
  },
  pagination: {
    total: 0,
    pages: 1,
  },
};

const getPersistedState = () => {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? { ...initialState, ...JSON.parse(saved), isLoading: false, error: null } : initialState;
  } catch {
    return initialState;
  }
};

export const engageStore = proxy<EngageState>(getPersistedState());

if (typeof window !== "undefined") {
  subscribe(engageStore, () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          filters: engageStore.filters,
        })
      );
    } catch (err) {
      console.error("Failed to persist engage state:", err);
    }
  });
}

export function useEngageSnapshot() {
  const snap = useSnapshot(engageStore);
  // Deep clone to strip Valtio proxy wrappers for chart library compatibility
  return JSON.parse(JSON.stringify(snap)) as EngageState;
}

export const engageActions = {
  setFilters(filters: Partial<EngageState["filters"]>) {
    engageStore.filters = { ...engageStore.filters, ...filters };
  },

  async fetchSuperadminExperiences() {
    engageStore.isLoading = true;
    engageStore.error = null;
    try {
      const { search, category, format, status, page, limit } = engageStore.filters;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "all") params.append("category", category);
      if (format && format !== "all") params.append("format", format);
      if (status && status !== "all") params.append("status", status);
      params.append("page", String(page));
      params.append("limit", String(limit));
      params.append("_t", String(Date.now())); // Cache buster

      const { data } = await api.get(`/superadmin/engage?${params.toString()}`);
      engageStore.experiences = data.data || [];
      engageStore.pagination = {
        total: data.total || 0,
        pages: data.pages || 1,
      };
    } catch (err: any) {
      engageStore.error = err.message || "Erro ao carregar experiências";
    } finally {
      engageStore.isLoading = false;
    }
  },

  async fetchPersonalExperiences(workspaceId: string) {
    if (!workspaceId) return;
    engageStore.isLoading = true;
    engageStore.error = null;
    try {
      const { search, category, format, status, page, limit } = engageStore.filters;
      const params = new URLSearchParams();
      params.append("workspaceId", workspaceId);
      if (search) params.append("search", search);
      if (category && category !== "all") params.append("category", category);
      if (format && format !== "all") params.append("format", format);
      if (status && status !== "all") params.append("status", status);
      params.append("page", String(page));
      params.append("limit", String(limit));
      params.append("_t", String(Date.now())); // Cache buster

      const { data } = await api.get(`/personal/engage?${params.toString()}`);
      engageStore.experiences = data.data || [];
      engageStore.pagination = {
        total: data.total || 0,
        pages: data.pages || 1,
      };
    } catch (err: any) {
      engageStore.error = err.message || "Erro ao carregar experiências";
    } finally {
      engageStore.isLoading = false;
    }
  },

  async createSuperadminExperience(payload: any) {
    try {
      await api.post("/superadmin/engage", payload);
      // Wait 100ms for database write consistency and indexing before refetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engageActions.fetchSuperadminExperiences();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message || "Erro ao criar experiência");
    }
  },

  async updateSuperadminExperience(id: string, payload: any) {
    try {
      await api.patch(`/superadmin/engage/${id}`, payload);
      // Wait 100ms for database write consistency before refetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engageActions.fetchSuperadminExperiences();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message || "Erro ao atualizar experiência");
    }
  },

  async deleteSuperadminExperience(id: string) {
    try {
      await api.delete(`/superadmin/engage/${id}`);
      // Wait 100ms for database consistency before refetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engageActions.fetchSuperadminExperiences();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message || "Erro ao deletar experiência");
    }
  },

  async createPersonalExperience(workspaceId: string, payload: any) {
    try {
      await api.post(`/personal/engage?workspaceId=${workspaceId}`, payload);
      // Wait 100ms for database write consistency and indexing before refetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engageActions.fetchPersonalExperiences(workspaceId);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message || "Erro ao criar experiência");
    }
  },

  async updatePersonalExperience(workspaceId: string, id: string, payload: any) {
    try {
      await api.patch(`/personal/engage/${id}?workspaceId=${workspaceId}`, payload);
      // Wait 100ms for database write consistency before refetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engageActions.fetchPersonalExperiences(workspaceId);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message || "Erro ao atualizar experiência");
    }
  },

  async deletePersonalExperience(workspaceId: string, id: string) {
    try {
      await api.delete(`/personal/engage/${id}?workspaceId=${workspaceId}`);
      // Wait 100ms for database consistency before refetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engageActions.fetchPersonalExperiences(workspaceId);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message || "Erro ao deletar experiência");
    }
  }
};
