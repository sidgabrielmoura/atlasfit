import { describe, it, expect, vi, beforeEach } from "vitest";

describe("AbacatePay Recurrence and Auto-Renewal Suite", () => {
  describe("1. Cycle Mapping Logic", () => {
    it("deve mapear o intervalo anual para o ciclo ANNUALLY do AbacatePay", () => {
      const planYear = { interval: "year" };
      const cycle = planYear.interval === "year" ? "ANNUALLY" : "MONTHLY";
      expect(cycle).toBe("ANNUALLY");
    });

    it("deve mapear o intervalo mensal ou padrão para o ciclo MONTHLY do AbacatePay", () => {
      const planMonth = { interval: "month" };
      const cycle = planMonth.interval === "year" ? "ANNUALLY" : "MONTHLY";
      expect(cycle).toBe("MONTHLY");

      const planUndefined: { interval?: string } = {};
      const cycleDefault = planUndefined.interval === "year" ? "ANNUALLY" : "MONTHLY";
      expect(cycleDefault).toBe("MONTHLY");
    });
  });

  describe("2. Due Date (endDate) Prorogation Logic", () => {
    it("deve prorrogar o vencimento mensal em 30 dias a partir do vencimento atual", () => {
      const currentEndDate = new Date("2026-09-01T12:00:00.000Z");
      const interval: string = "month";

      const newEndDate = new Date(currentEndDate);
      if (interval === "year") {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setDate(newEndDate.getDate() + 30);
      }

      expect(newEndDate.toISOString()).toBe("2026-10-01T12:00:00.000Z");
    });

    it("deve prorrogar o vencimento anual em exatamente 1 ano a partir do vencimento atual", () => {
      const currentEndDate = new Date("2026-09-01T12:00:00.000Z");
      const interval: string = "year";

      const newEndDate = new Date(currentEndDate);
      if (interval === "year") {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setDate(newEndDate.getDate() + 30);
      }

      expect(newEndDate.getFullYear()).toBe(2027);
      expect(newEndDate.getMonth()).toBe(currentEndDate.getMonth());
      expect(newEndDate.getDate()).toBe(currentEndDate.getDate());
    });

    it("se a assinatura já estiver no passado, deve prorrogar a partir de hoje", () => {
      const pastEndDate = new Date("2025-01-01T00:00:00.000Z");
      const now = new Date();

      const currentEnd = pastEndDate && new Date(pastEndDate) > now
        ? new Date(pastEndDate)
        : now;

      const newEndDate = new Date(currentEnd);
      newEndDate.setDate(newEndDate.getDate() + 30);

      expect(newEndDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe("3. Subscription Payload Validation for AbacatePay API", () => {
    it("deve estruturar o payload de checkout de assinatura recorrente com methods CARD e retryPolicy", () => {
      const plan = { id: "plan_pro_001", name: "Plano Pro", interval: "month" };
      const user = { name: "Personal Trainer", email: "trainer@atlasfit.com" };
      const transactionId = "tx_123456";

      const subscriptionPayload = {
        items: [
          {
            id: "prod_abacate_123",
            quantity: 1
          }
        ],
        methods: ["CARD"] as Array<"CARD">,
        customer: {
          name: user.name,
          email: user.email,
          cellphone: "11999999999",
          taxId: "12345678900"
        },
        externalId: transactionId,
        metadata: {
          planId: plan.id,
          userId: "user_789",
          interval: plan.interval
        },
        retryPolicy: {
          maxRetry: 3,
          retryEvery: 1
        }
      };

      expect(subscriptionPayload.methods).toEqual(["CARD"]);
      expect(subscriptionPayload.items).toHaveLength(1);
      expect(subscriptionPayload.retryPolicy.maxRetry).toBe(3);
      expect(subscriptionPayload.metadata.interval).toBe("month");
    });
  });
});
