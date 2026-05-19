import { proxy, subscribe } from "valtio";
import api from "@/lib/axios";

interface SuperAdminState {
  metrics: any;
  users: any[];
  workspaces: any[];
  logs: any[];
  exercises: any[];
  subscriptions: any[];
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
  subscriptions: [],
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
      const { search, userId, workspaceId, action } = superAdminStore.logFilters;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (userId !== "all") params.append("userId", userId);
      if (workspaceId !== "all") params.append("workspaceId", workspaceId);
      if (action !== "all") params.append("action", action);

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

  async fetchExercises() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/exercises");
      superAdminStore.exercises = data;
    } catch (err: any) {
      superAdminStore.error = err.message;
    } finally {
      superAdminStore.isLoading = false;
    }
  },

  async fetchSubscriptions() {
    superAdminStore.isLoading = true;
    try {
      const { data } = await api.get("/superadmin/subscriptions");
      superAdminStore.subscriptions = data;
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
  async createPlan(data: { name: string; price: number; interval: string; features: string; maxWorkspaces?: number }) {
    try {
      await api.post("/superadmin/plans", data);
      await superAdminActions.fetchPlans();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async updatePlan(id: string, data: { name?: string; price?: number; interval?: string; features?: string; maxWorkspaces?: number }) {
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
  async updateExerciseStatus(id: string, status: string) {
    try {
      await api.patch(`/superadmin/exercises/${id}`, { status });
      await superAdminActions.fetchExercises();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async createExercise(data: { name: string; videoUrl: string; muscleGroupId: string; isOfficial: boolean }) {
    try {
      await api.post("/superadmin/exercises", { ...data, status: "READY" });
      await superAdminActions.fetchExercises();
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  },
  async configureExercise(id: string, data: { name: string; videoUrl: string; muscleGroupId: string; isOfficial: boolean }) {
    try {
      await api.patch(`/superadmin/exercises/${id}`, { ...data, status: "READY" });
      await superAdminActions.fetchExercises();
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
