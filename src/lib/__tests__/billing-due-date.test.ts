import { describe, it, expect } from "vitest";
import { advanceBillingDueDate } from "../billing-due-date";

describe("advanceBillingDueDate", () => {
  it("avança 1 mês preservando o dia 10", () => {
    const current = new Date("2026-11-10T12:00:00Z");
    const next = advanceBillingDueDate(current, "MENSAL", new Date("2026-11-10T14:00:00Z"));

    expect(next.toISOString()).toBe("2026-12-10T12:00:00.000Z");
  });

  it("avança 3 meses para periodicidade TRIMESTRAL", () => {
    const current = new Date("2026-11-10T12:00:00Z");
    const next = advanceBillingDueDate(current, "TRIMESTRAL", new Date("2026-11-10T14:00:00Z"));

    expect(next.toISOString()).toBe("2027-02-10T12:00:00.000Z");
  });

  it("avança 1 ano para periodicidade ANUAL", () => {
    const current = new Date("2026-11-10T12:00:00Z");
    const next = advanceBillingDueDate(current, "ANUAL", new Date("2026-11-10T14:00:00Z"));

    expect(next.toISOString()).toBe("2027-11-10T12:00:00.000Z");
  });

  it("ajusta corretamente o final de mês quando o próximo mês tem menos dias (ex: 31 de janeiro -> 28 de fevereiro)", () => {
    const current = new Date("2026-01-31T12:00:00Z");
    const next = advanceBillingDueDate(current, "MENSAL", new Date("2026-01-31T14:00:00Z"));

    expect(next.getUTCMonth()).toBe(1); // Fevereiro
    expect(next.getUTCDate()).toBe(28);
    expect(next.getUTCHours()).toBe(12);
  });
});
