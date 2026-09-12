import { AbacatePay as OriginalAbacatePay } from "@abacatepay/sdk";

const ABACATEPAY_BASE = "https://api.abacatepay.com/v2";

export function AbacatePay(config: { secret: string }) {
  const client = OriginalAbacatePay(config);

  const authHeaders = {
    Authorization: `Bearer ${config.secret}`,
    "Content-Type": "application/json",
  };

  if (client && client.coupons) {
    client.coupons.list = async () => {
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/coupons/list`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}
      return [];
    };

    client.coupons.toggleStatus = async (id: string) => {
      const res = await fetch(`${ABACATEPAY_BASE}/coupons/toggle?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`AbacatePay toggle error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    };

    client.coupons.delete = async (id: string) => {
      const res = await fetch(`${ABACATEPAY_BASE}/coupons/delete?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`AbacatePay delete error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    };
  }

  if (client && client.subscriptions) {
    (client.subscriptions as any).cancel = async (data: { id: string }) => {
      const res = await fetch(`${ABACATEPAY_BASE}/subscriptions/cancel`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`AbacatePay subscriptions.cancel error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    };
  }

  const extendedProducts = Object.assign(client.products || {}, {
    list: async () => {
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/products/list`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}
      if (typeof client.products?.list === "function") {
        try {
          return await client.products.list();
        } catch {}
      }
      return [];
    },
    update: async (id: string, data: { name?: string; description?: string; price?: number; image?: string; imageUrl?: string }) => {
      const res = await fetch(`${ABACATEPAY_BASE}/products/update?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`AbacatePay products.update error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    },
    delete: async (param: string | { id: string }) => {
      const id = typeof param === "string" ? param : param.id;
      const res = await fetch(`${ABACATEPAY_BASE}/products/delete?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`AbacatePay products.delete error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    },
  });

  const extendedCheckouts = Object.assign(client.checkouts || {}, {
    list: async () => {
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/checkouts/list`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}
      if (typeof client.checkouts?.list === "function") {
        try {
          return await client.checkouts.list();
        } catch {}
      }
      return [];
    }
  });

  const extendedStore = Object.assign(client.store || {}, {
    get: async () => {
      // AbacatePay v2 usa /stores/get (plural)
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/stores/get`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}

      // Fallback para /store/get
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/store/get`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}

      return {
        id: "abacate_store",
        name: "AtlasFit Store",
        balance: { available: 0, pending: 0, blocked: 0 }
      };
    }
  });

  const extendedMrr = Object.assign(client.mrr || {}, {
    get: async () => {
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/public-mrr/mrr`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          const raw = json.data || json;
          const mrrVal = typeof raw?.mrr?.value === "number"
            ? raw.mrr.value
            : (typeof raw?.mrr === "number" ? raw.mrr : 0);
          const totalActive = typeof raw?.totalActiveSubscriptions?.value === "number"
            ? raw.totalActiveSubscriptions.value
            : (typeof raw?.totalActiveSubscriptions === "number" ? raw.totalActiveSubscriptions : 0);
          return {
            mrr: mrrVal,
            totalActiveSubscriptions: totalActive,
          };
        }
      } catch {}
      return { mrr: 0, totalActiveSubscriptions: 0 };
    },
    revenue: async (query?: { startDate?: string; endDate?: string }) => {
      const now = new Date();
      const endDefault = now.toISOString().split("T")[0];
      const startDefault = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const startDate = query?.startDate || startDefault;
      const endDate = query?.endDate || endDefault;

      try {
        const res = await fetch(`${ABACATEPAY_BASE}/public-mrr/revenue?startDate=${startDate}&endDate=${endDate}`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}
      return { totalRevenue: 0, totalTransactions: 0, transactionsPerDay: {} };
    },
    merchant: async () => {
      try {
        const res = await fetch(`${ABACATEPAY_BASE}/public-mrr/merchant-info`, {
          method: "GET",
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch {}
      return { name: "", website: "", createdAt: "" };
    }
  });

  return Object.assign(client, {
    products: extendedProducts,
    checkouts: extendedCheckouts,
    store: extendedStore,
    mrr: extendedMrr,
  });
}

export type AbacatePayClient = ReturnType<typeof AbacatePay>;

export function resolvePublicImageUrl(url?: string | null): string | undefined {
  if (!url || !url.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://app.atlasfit.site"
  ).replace(/\/$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${path}`;
}

export function maskTaxId(taxId?: string | null): string {
  if (!taxId) return "—";
  const cleaned = taxId.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.***.***/${cleaned.slice(8, 12)}-**`;
  }
  return "***";
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    const ddd = cleaned.slice(-11, -9);
    const last4 = cleaned.slice(-4);
    return `(${ddd}) *****-${last4}`;
  }
  return "(**) *****-****";
}

export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "—";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}
