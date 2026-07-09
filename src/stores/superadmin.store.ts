import { proxy, subscribe, useSnapshot } from "valtio";
import api from "@/lib/axios";

/**
 * Deep-clone any value to strip Valtio's frozen proxy wrappers.
 * Required because Recharts (and similar libs) crash when they try to
 * index or mutate proxy objects returned by useSnapshot().
 */
function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Safe snapshot hook that returns plain JS objects instead of Valtio proxies.
 * Use this instead of `useSnapshot(superAdminStore)` in all components.
 */
export function useSuperAdminSnapshot() {
  const snap = useSnapshot(superAdminStore);
  return deepClone(snap) as SuperAdminState;
}

interface SuperAdminState {
  metrics: any;
  users: any[];
  workspaces: any[];
  logs: any[];
  exercises: any[];
  pendingExercises: any[];
  needsConfigExercises: any[];
  subscriptions: any[];
  subscriptionMetrics: any;
  settings: any[];
  integrations: any[];
  plans: any[];
  coupons: any[];
  muscleGroups: any[];
  financeData: any;
  logFilters: {
    search: string;
    userId: string;
    workspaceId: string;
    action: string;
    severity: string;
  };
  exerciseFilters: {
    search: string;
    muscleGroupId: string;
    page: number;
    limit: number;
  };
  exercisePagination: {
    total: number;
    pages: number;
    totalUsage: number;
  };
  isLoading: boolean;
  error: string | null;
}

const storageKey = "atlasfit_superadmin_store";

const initialState: SuperAdminState = {
  metrics: null,
  users: [],
  workspaces: [],
  logs: [],
  exercises: [],
  pendingExercises: [],
  needsConfigExercises: [],
  subscriptions: [],
  subscriptionMetrics: null,
  settings: [],
  integrations: [],
  plans: [],
  coupons: [],
  muscleGroups: [],
  financeData: null,
  logFilters: {
    search: "",
    userId: "all",
    workspaceId: "all",
    action: "all",
    severity: "danger", // Default focus on critical system errors
  },
  exerciseFilters: {
    search: "",
    muscleGroupId: "all",
    page: 1,
    limit: 5,
  },
  exercisePagination: {
    total: 0,
    pages: 1,
    totalUsage: 0,
  },
  isLoading: false,
  error: null,
};

const getPersistedState = () => {
  if (typeof window === "undefined") return initialState;
  const saved = localStorage.getItem(storageKey);
  return saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
};

export const superAdminStore = proxy<SuperAdminState>(getPersistedState());

subscribe(superAdminStore, () => {
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(superAdminStore));
  }
});

export const superAdminActions = {
  async fetchMetrics() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/stats");
      superAdminStore.metrics = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  async fetchUsers() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/users");
      superAdminStore.users = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  async fetchWorkspaces() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/workspaces");
      superAdminStore.workspaces = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  async fetchLogs() {
    superAdminStore.isLoading = true;
    try {
      const { search, userId, workspaceId, action, severity } = superAdminStore.logFilters;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (userId !== "all") params.append("userId", userId);
      if (workspaceId !== "all") params.append("workspaceId", workspaceId);
      if (action !== "all") params.append("action", action);
      if (severity !== "all") params.append("severity", severity);

      const { data } = await api.get(`/superadmin/logs?${params.toString()}`);
      superAdminStore.logs = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  setLogFilters(filters: Partial<SuperAdminState["logFilters"]>) {
    superAdminStore.logFilters = { ...superAdminStore.logFilters, ...filters };
    superAdminActions.fetchLogs();
  },

  setExerciseFilters(filters: Partial<SuperAdminState["exerciseFilters"]>) {
    superAdminStore.exerciseFilters = { ...superAdminStore.exerciseFilters, ...filters };
    superAdminActions.fetchExercises();
  },

  async fetchExercises() {
    superAdminStore.isLoading = true;
    try {
      const { search, muscleGroupId, page, limit } = superAdminStore.exerciseFilters;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (muscleGroupId && muscleGroupId !== "all") params.append("muscleGroupId", muscleGroupId);
      params.append("status", "READY,APPROVED");
      params.append("page", String(page));
      params.append("limit", String(limit));

      const { data } = await api.get(`/superadmin/exercises?${params.toString()}`);
      if (data && data.data) {
        superAdminStore.exercises = data.data;
        superAdminStore.exercisePagination = {
          total: data.total || 0,
          pages: data.pages || 1,
          totalUsage: data.totalUsage || 0,
        };
      } else {
        superAdminStore.exercises = Array.isArray(data) ? data : [];
        superAdminStore.exercisePagination = {
          total: superAdminStore.exercises.length,
          pages: 1,
          totalUsage: 0,
        };
      }
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  async fetchPendingExercises() {
    try {
      const { data } = await api.get("/superadmin/exercises?status=PENDING");
      superAdminStore.pendingExercises = Array.isArray(data) ? data : [];
    } catch (err: any) {
      superAdminStore.error = err.message;
    }
  },

  async fetchNeedsConfigExercises() {
    try {
      const { data } = await api.get("/superadmin/exercises?status=NEEDS_CONFIG");
      superAdminStore.needsConfigExercises = Array.isArray(data) ? data : [];
    } catch (err: any) {
      superAdminStore.error = err.message;
    }
  },

  async fetchSubscriptions() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/subscriptions");
      if (data && data.activities) {
        superAdminStore.subscriptions = data.activities;
        superAdminStore.subscriptionMetrics = data;
      } else {
        superAdminStore.subscriptions = Array.isArray(data) ? data : [];
        superAdminStore.subscriptionMetrics = null;
      }
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  async fetchSettings() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/settings");
      superAdminStore.settings = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },
  async createUser(data: any) {
    try {
      await api.post("/superadmin/users", data);
      await superAdminActions.fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async deleteUser(id: string) {
    try {
      await api.delete(`/superadmin/users/${id}`);
      await superAdminActions.fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async createWorkspace(data: { name: string; slug: string; ownerId: string }) {
    try {
      await api.post("/superadmin/workspaces", data);
      await superAdminActions.fetchWorkspaces();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async updateWorkspace(id: string, data: any) {
    try {
      await api.patch(`/superadmin/workspaces/${id}`, data);
      await superAdminActions.fetchWorkspaces();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async fetchFinance() {
    superAdminStore.isLoading = true;
    try {
      const res = await api.get("/superadmin/finance");
      superAdminStore.financeData = res.data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },
  async fetchPlans() {
    superAdminStore.isLoading = true;
    try {
      const res = await api.get("/superadmin/plans");
      superAdminStore.plans = res.data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },
  async createPlan(data: { name: string; price: number; interval: string; features: string; maxWorkspaces?: number; maxStudents?: number | null }) {
    try {
      await api.post("/superadmin/plans", data);
      await superAdminActions.fetchPlans();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async updatePlan(id: string, data: { name?: string; price?: number; interval?: string; features?: string; maxWorkspaces?: number; maxStudents?: number | null }) {
    try {
      await api.patch(`/superadmin/plans/${id}`, data);
      await superAdminActions.fetchPlans();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async deletePlan(id: string) {
    try {
      await api.delete(`/superadmin/plans/${id}`);
      await superAdminActions.fetchPlans();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async fetchCoupons() {
    superAdminStore.isLoading = true;
    try {
      const res = await api.get("/superadmin/coupons");
      superAdminStore.coupons = res.data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },
  async createCoupon(data: { code: string; discountPercent: number; maxUses?: number; expirationDate?: string }) {
    try {
      await api.post("/superadmin/coupons", data);
      await superAdminActions.fetchCoupons();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async toggleCouponStatus(id: string, isActive: boolean) {
    try {
      await api.patch("/superadmin/coupons", { id, isActive });
      await superAdminActions.fetchCoupons();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async deleteCoupon(id: string) {
    try {
      await api.delete(`/superadmin/coupons?id=${id}`);
      await superAdminActions.fetchCoupons();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async updateExerciseStatus(id: string, status: string) {
    try {
      await api.patch(`/superadmin/exercises/${id}`, { status });
      await Promise.all([
        superAdminActions.fetchExercises(),
        superAdminActions.fetchPendingExercises(),
        superAdminActions.fetchNeedsConfigExercises(),
      ]);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async createExercise(data: { name: string; videoUrl: string; muscleGroupId?: string; muscleGroupIds?: string[]; isOfficial: boolean }) {
    try {
      await api.post("/superadmin/exercises", { ...data, status: "READY" });
      await Promise.all([
        superAdminActions.fetchExercises(),
        superAdminActions.fetchPendingExercises(),
        superAdminActions.fetchNeedsConfigExercises(),
      ]);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async configureExercise(id: string, data: { name: string; videoUrl: string; muscleGroupId?: string; muscleGroupIds?: string[]; isOfficial: boolean }) {
    try {
      await api.patch(`/superadmin/exercises/${id}`, { ...data, status: "READY" });
      await Promise.all([
        superAdminActions.fetchExercises(),
        superAdminActions.fetchPendingExercises(),
        superAdminActions.fetchNeedsConfigExercises(),
      ]);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async deleteExercise(id: string) {
    try {
      await api.delete(`/superadmin/exercises/${id}`);
      await Promise.all([
        superAdminActions.fetchExercises(),
        superAdminActions.fetchPendingExercises(),
        superAdminActions.fetchNeedsConfigExercises(),
      ]);
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async updateSettings(settings: { key: string; value: string }[]) {
    try {
      await api.patch("/superadmin/settings", { settings });
      await superAdminActions.fetchSettings();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async clearCache() {
    try {
      await api.post("/superadmin/settings/cache-clear");
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async toggleMaintenanceMode() {
    try {
      await api.post("/superadmin/settings/maintenance");
      await superAdminActions.fetchSettings();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async fetchIntegrations() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/settings/integrations");
      superAdminStore.integrations = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },
  async createIntegration(data: { name: string; url?: string; icon?: string; category?: string }) {
    try {
      await api.post("/superadmin/settings/integrations", data);
      await superAdminActions.fetchIntegrations();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async toggleIntegration(id: string, isActive: boolean) {
    try {
      await api.patch(`/superadmin/settings/integrations/${id}`, { isActive });
      await superAdminActions.fetchIntegrations();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async deleteIntegration(id: string) {
    try {
      await api.delete(`/superadmin/settings/integrations/${id}`);
      await superAdminActions.fetchIntegrations();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async fetchMuscleGroups() {
    try {
      const res = await api.get("/superadmin/muscle-groups");
      superAdminStore.muscleGroups = res.data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    }
  },
};
