import { AbacatePay as OriginalAbacatePay } from "@abacatepay/sdk";

const ABACATEPAY_BASE = "https://api.abacatepay.com/v2";

export function AbacatePay(config: { secret: string }) {
  const client = OriginalAbacatePay(config);

  const authHeaders = {
    Authorization: `Bearer ${config.secret}`,
    "Content-Type": "application/json",
  };

  if (client && client.coupons) {
    client.coupons.toggleStatus = async (id: string) => {
      const res = await fetch(`${ABACATEPAY_BASE}/coupons/toggle?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id }),
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
      });
      if (!res.ok) {
        throw new Error(`AbacatePay subscriptions.cancel error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    };
  }

  const extendedProducts = Object.assign(client.products, {
    update: async (id: string, data: { name?: string; description?: string; price?: number }) => {
      const res = await fetch(`${ABACATEPAY_BASE}/products/update?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(data),
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
      });
      if (!res.ok) {
        throw new Error(`AbacatePay products.delete error: ${res.status} - ${await res.text()}`);
      }
      return (await res.json()).data;
    },
  });

  return Object.assign(client, { products: extendedProducts });
}

export type AbacatePayClient = ReturnType<typeof AbacatePay>;
