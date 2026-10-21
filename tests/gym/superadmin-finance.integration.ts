import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { getSuperadminFinance, listSuperadminTransactions, catalogCents } from "@/modules/workspaces/application/superadmin-finance";
import { getSuperAdminStats } from "@/services/superadmin.service";
import { financeOverviewSchema, financeTransactionsSchema } from "@/modules/workspaces/domain/superadmin-finance";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterEach(() => vi.useRealTimers());
afterAll(async () => prisma.$disconnect());
const now = new Date("2026-10-05T03:30:00Z");
const startDate = new Date("2026-09-01T03:00:00Z");

describe("GYM PostgreSQL — financeiro SuperAdmin", () => {
  it("separa licenças SaaS de receitas locais, normaliza anual, filtra vigência e declara lacunas", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
    const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
    const baseline = await getSuperadminFinance(admin.id);
    const month = await prisma.plan.create({ data: { name: "Mensal sintético", price: 101.01, interval: "month", features: "[]" } });
    const annual = await prisma.plan.create({ data: { name: "Anual sintético", price: 120.01, interval: "year", features: "[]" } });
    const odd = await prisma.plan.create({ data: { name: "Ciclo desconhecido", price: 9900, interval: "fortnight", features: "[]" } });
    const owner = await prisma.user.create({ data: { name: "Conta sintética", password: "segredo-nao-exportar", medicalConditions: "saude-nao-exportar", email: `finance-${randomUUID()}@example.invalid` } });
    await prisma.subscription.create({ data: { userId: owner.id, planId: annual.id, status: "active", startDate } });
    for (let i = 0; i < 2; i++) await prisma.workspace.create({ data: { ownerId: owner.id, type: "PERSONAL", name: "Mesmo titular", slug: randomUUID() } });
    const gym = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", isActive: false, name: "Academia suspensa", slug: randomUUID(), subscription: { create: { status: "ACTIVE", startDate, planId: month.id } }, payments: { create: { studentName: "Legado", planName: "Legado", amount: 990000, status: "pago", method: "PIX" } } } });
    await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "Sem preço", slug: randomUUID(), subscription: { create: { status: "ACTIVE", startDate } } } });
    for (const options of [{ status: "TRIAL" as const }, { status: "ACTIVE" as const, endDate: now }, { status: "ACTIVE" as const, startDate: new Date("2026-11-01") }]) await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "Sem vigência", slug: randomUUID(), subscription: { create: { startDate, planId: month.id, ...options } } } });
    for (const options of [{ status: "canceled" }, { status: "ACTIVE", isPreSubscription: true }, { status: "ACTIVE", endDate: now }, { status: "ACTIVE", startDate: new Date("2026-11-01") }]) {
      const user = await prisma.user.create({ data: {} });
      await prisma.subscription.create({ data: { userId: user.id, planId: month.id, startDate, ...options } });
    }
    const unknown = await prisma.user.create({ data: {} });
    await prisma.subscription.create({ data: { userId: unknown.id, planId: odd.id, status: "ACTIVE", startDate } });
    await prisma.transaction.createMany({ data: [
      { userId: owner.id, amount: 10.01, status: "approved", createdAt: new Date("2026-10-05T03:00:00Z") },
      { userId: owner.id, amount: 20.02, status: "APPROVED", createdAt: new Date("2026-10-05T02:59:59Z") },
      { userId: owner.id, amount: 40.04, status: "FAILED", createdAt: now },
      { userId: owner.id, amount: 9999, status: "REFUNDED", createdAt: now },
    ] });
    await prisma.subscriptionActivity.createMany({ data: [
      { userId: owner.id, planId: month.id, type: "NEW_SUBSCRIPTION", amount: month.price, status: "APPROVED", createdAt: startDate },
      { userId: owner.id, planId: annual.id, type: "UPGRADE", amount: annual.price, status: "APPROVED", createdAt: now },
    ] });
    const result = financeOverviewSchema.parse(await getSuperadminFinance(admin.id));
    expect(result.knownMonthlyReferenceInCents - baseline.knownMonthlyReferenceInCents).toBe(11101); // 101.01 + round(120.01 / 12)
    expect(result.eligibleSubscriptionsCount - baseline.eligibleSubscriptionsCount).toBe(4);
    expect(result.unvaluedSubscriptionsCount - baseline.unvaluedSubscriptionsCount).toBe(2);
    expect(result.mrr).toBeNull(); expect(result.arr).toBeNull(); expect(result.ltv).toBeNull(); expect(result.churn).toBeNull(); expect(result.mrrHistory).toEqual([]);
    expect(result.snapshot).toEqual({ asOf: now.toISOString(), timezone: "America/Sao_Paulo", basis: "CURRENT_CATALOG" });
    expect(result.totalRevenue - baseline.totalRevenue).toBeCloseTo(30.03, 8);
    expect(result.todaysRevenue - baseline.todaysRevenue).toBeCloseTo(10.01, 8);
    expect(result.totalFailedRevenue - baseline.totalFailedRevenue).toBeCloseTo(40.04, 8);
    expect(result.recentUpgrades).toEqual(expect.arrayContaining([expect.objectContaining({ user: owner.name, to: annual.name, from: month.name })]));
    expect(JSON.stringify(result)).not.toMatch(/segredo-nao-exportar|saude-nao-exportar|abacateCustomerId|password|medicalConditions/);
    const listing = financeTransactionsSchema.parse(await listSuperadminTransactions(admin.id, { userId: owner.id, dateRange: "7days", planId: annual.id, limit: 1 }));
    expect(listing.pagination).toMatchObject({ total: 2, pages: 2 });
    expect(listing.data[0]).toMatchObject({ amount: 10.01, status: "APPROVED", user: { id: owner.id, subscription: { plan: { name: annual.name } } } });
    const text = JSON.stringify(listing);
    expect(text).not.toMatch(/segredo-nao-exportar|saude-nao-exportar|abacateCustomerId|password|medicalConditions/);
    const stats = await getSuperAdminStats(admin.id);
    expect(stats.financial).toMatchObject({ knownMonthlyReferenceInCents: result.knownMonthlyReferenceInCents, mrr: null });
    expect(stats.financialGrowthData).toEqual([]);
    expect(await prisma.workspacePayment.count({ where: { workspaceId: gym.id } })).toBe(1);
  });

  it("recusa papel revogado, filtros inválidos e consolidação com centavos fracionários", async () => {
    const user = await prisma.user.create({ data: { role: "USER" } });
    await expect(getSuperadminFinance(user.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(listSuperadminTransactions(user.id, {})).rejects.toMatchObject({ statusCode: 403 });
    const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
    for (const input of [{ page: "0" }, { page: "1x" }, { limit: "101" }, { status: "paid" }, { dateRange: "unknown" }, { extra: "ignored?" }]) await expect(listSuperadminTransactions(admin.id, input)).rejects.toMatchObject({ statusCode: 400 });
    expect(catalogCents(12.01)).toBe(BigInt(1201)); expect(catalogCents(0)).toBe(BigInt(0));
    expect(catalogCents(1.001)).toBeNull(); expect(catalogCents(-1)).toBeNull(); expect(catalogCents(Number.POSITIVE_INFINITY)).toBeNull();
    const invalid = await prisma.transaction.create({ data: { userId: user.id, amount: 1.001, status: "APPROVED" } });
    try { await expect(getSuperadminFinance(admin.id)).rejects.toMatchObject({ statusCode: 422, code: "INVALID_AMOUNT" }); }
    finally { await prisma.transaction.delete({ where: { id: invalid.id } }); }
    await prisma.user.update({ where: { id: admin.id }, data: { role: "USER" } });
    await expect(getSuperAdminStats(admin.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});
