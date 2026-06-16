import { AbacatePay as OriginalAbacatePay, AbacatePayClient } from "@abacatepay/sdk";

export function AbacatePay(config: { secret: string }): AbacatePayClient {
  const client = OriginalAbacatePay(config);

  if (client && client.coupons) {
    // Monkey-patch toggleStatus because the SDK has a bug (uses HTTP PATCH instead of POST)
    client.coupons.toggleStatus = async (id: string) => {
      const res = await fetch(`https://api.abacatepay.com/v2/coupons/toggle?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AbacatePay API Error (toggle): ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      return json.data;
    };

    // Monkey-patch delete because the SDK has a bug (uses HTTP DELETE instead of POST)
    client.coupons.delete = async (id: string) => {
      const res = await fetch(`https://api.abacatepay.com/v2/coupons/delete?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AbacatePay API Error (delete): ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      return json.data;
    };
  }

  return client;
}
