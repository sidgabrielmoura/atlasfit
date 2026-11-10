import { describe, it, expect, vi, beforeEach } from "vitest";
import { isPersonalSubscriptionActive } from "@/modules/workspaces/application/personal-affiliation";

describe("isPersonalSubscriptionActive - Carência e Bloqueio Automático", () => {
  const baseStartDate = new Date("2026-01-01T00:00:00Z");

  it("mantém assinatura ativa no próprio dia do vencimento quando há carência", () => {
    // Vencimento: dia 10 às 12:00 UTC
    const dueDate = new Date("2026-11-10T12:00:00Z");
    // Hoje: dia 10 às 14:00 UTC (mesmo dia, algumas horas após)
    const now = new Date("2026-11-10T14:00:00Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "active",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      now
    );

    expect(active).toBe(true);
  });

  it("mantém assinatura ativa durante todo o período de carência (ex: 2 dias após vencimento com 3 dias de carência)", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    // Dia 12 às 12:00 UTC (2 dias após o vencimento)
    const now = new Date("2026-11-12T12:00:00Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "active",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      now
    );

    expect(active).toBe(true);
  });

  it("considera assinatura expirada quando a carência é ultrapassada e autoSuspendEnabled é true", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    // Dia 14 às 12:00 UTC (4 dias após o vencimento, carência de 3 dias esgotada)
    const now = new Date("2026-11-14T12:00:00Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "active",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      now
    );

    expect(active).toBe(false);
  });

  it("não bloqueia quando a carência é ultrapassada se autoSuspendEnabled for false", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    const now = new Date("2026-11-14T12:00:00Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "active",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: false,
      },
      now
    );

    expect(active).toBe(true);
  });

  it("bloqueia imediatamente após vencimento quando toleranceDays for 0", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    const now = new Date("2026-11-10T12:00:01Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "active",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 0,
        autoSuspendEnabled: true,
      },
      now
    );

    expect(active).toBe(false);
  });

  it("respeita a carência mesmo se nextDueDate for fornecido sem endDate", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    const now = new Date("2026-11-10T14:00:00Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "active",
        startDate: baseStartDate,
        endDate: null,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      now
    );

    expect(active).toBe(true);
  });

  it("mantém assinatura ativa se status for past_due mas estiver dentro da carência", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    const now = new Date("2026-11-11T12:00:00Z");

    const active = isPersonalSubscriptionActive(
      {
        status: "past_due",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      now
    );

    expect(active).toBe(true);
  });

  it("não concede carência pós-vencimento para assinaturas canceladas", () => {
    const dueDate = new Date("2026-11-10T12:00:00Z");
    // Após o vencimento: já foi cancelada e venceu, não deve renovar nem ter carência
    const nowAfter = new Date("2026-11-11T12:00:00Z");
    const activeAfter = isPersonalSubscriptionActive(
      {
        status: "canceled",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      nowAfter
    );
    expect(activeAfter).toBe(false);

    // Antes do vencimento: período pago continua válido
    const nowBefore = new Date("2026-11-09T12:00:00Z");
    const activeBefore = isPersonalSubscriptionActive(
      {
        status: "canceled",
        startDate: baseStartDate,
        endDate: dueDate,
        nextDueDate: dueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      nowBefore
    );
    expect(activeBefore).toBe(true);
  });
});
