import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { GymFeatureFlagsService, GYM_CONFIG_KEYS } from "@/modules/workspaces/application/gym-feature-flags-service";
import { gymGlobalConfigSchema } from "@/modules/workspaces/domain/gym-config";
import { provisionGymWorkspace } from "@/modules/workspaces/application/gym-provisioning";
import { readJsonRequest } from "@/lib/http/read-json";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
const keys = Object.values(GYM_CONFIG_KEYS);
let original: Awaited<ReturnType<typeof prisma.systemSetting.findMany>> = [];
beforeAll(async () => { original = await prisma.systemSetting.findMany({ where: { key: { in: keys } } }); });
afterEach(async () => {
  await prisma.$transaction(async tx => {
    await tx.systemSetting.deleteMany({ where: { key: { in: keys } } });
    if (original.length) await tx.systemSetting.createMany({ data: original });
  });
});
afterAll(async () => { await prisma.$disconnect(); });
async function admin() { return prisma.user.create({ data: { email: `config-${randomUUID()}@example.invalid`, role: "SUPERADMIN" } }); }
async function setting(key: string, value: string) { await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } }); }

describe("Configuração global GYM — persistência e autorização", () => {
  it("JSON inválido e stream maior que o limite são recusados mesmo com Content-Length falso", async () => {
    const request = (body: BodyInit, headers: HeadersInit = {}) => new Request("http://127.0.0.1/config", { method: "POST", body, headers });
    expect(await readJsonRequest(request('{"configs":{}}'), 16_384)).toEqual({ configs: {} });
    await expect(readJsonRequest(request("{"), 16_384)).rejects.toMatchObject({ statusCode: 400 });
    await expect(readJsonRequest(new Request("http://127.0.0.1/config", { method: "POST" }), 16_384)).rejects.toMatchObject({ statusCode: 400 });
    await expect(readJsonRequest(request(new Uint8Array([0xff])), 16_384)).rejects.toMatchObject({ statusCode: 400 });
    await expect(readJsonRequest(request("a".repeat(16_385), { "Content-Length": "1" }), 16_384)).rejects.toMatchObject({ statusCode: 413 });
  });
  it("leitura recupera valores legados inválidos sem escrita e preserva percentuais fracionários", async () => {
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS, "2.5");
    await setting(GYM_CONFIG_KEYS.BILLING_GRACE_DAYS, "Infinity");
    await setting(GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_PERCENT, "7.5");
    const before = await prisma.systemSetting.findMany({ where: { key: { in: keys } }, orderBy: { key: "asc" } });
    const result = await GymFeatureFlagsService.getGymGlobalConfigs();
    expect(gymGlobalConfigSchema.safeParse(result).success).toBe(true);
    expect(result).toMatchObject({ defaultMaxStudents: 500, defaultBillingGraceDays: 5, defaultMaxReceptionistDiscountPercent: 7.5 });
    expect(await prisma.systemSetting.findMany({ where: { key: { in: keys } }, orderBy: { key: "asc" } })).toEqual(before);
  });
  it("PATCH parcial preserva outros valores; papel revogado e configuração inválida não gravam", async () => {
    const actor = await admin();
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS, "123");
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF, "12");
    await GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 456 }, actor.id, "Limite confirmado");
    expect(await GymFeatureFlagsService.getGymGlobalConfigs()).toMatchObject({ defaultMaxStudents: 456, defaultMaxStaff: 12 });
    expect(await prisma.auditLog.findFirst({ where: { userId: actor.id, entity: "SystemSetting" } })).toMatchObject({ ip: null, action: expect.stringContaining("Limite confirmado") });
    await expect(GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 1.5 }, actor.id)).rejects.toMatchObject({ statusCode: 400 });
    await expect(GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStaff: 10 }, actor.id, "x".repeat(2001))).rejects.toMatchObject({ statusCode: 400 });
    await prisma.user.update({ where: { id: actor.id }, data: { role: "USER" } });
    await expect(GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 789 }, actor.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(GymFeatureFlagsService.updateGymGlobalConfigs({}, actor.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.systemSetting.findUnique({ where: { key: GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS } })).toHaveProperty("value", "456");
    expect(await prisma.auditLog.count({ where: { userId: actor.id, entity: "SystemSetting" } })).toBe(1);
  });
  it("novos defaults afetam somente academias criadas depois; PERSONAL não recebe licença GYM", async () => {
    const actor = await admin();
    const owner = await prisma.user.create({ data: { email: `config-owner-${randomUUID()}@example.invalid` } });
    await GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 20, defaultMaxUnits: 1, defaultBillingGraceDays: 3, defaultMaxReceptionistDiscountCents: 100 }, actor.id);
    const create = (type: "GYM" | "PERSONAL" = "GYM") => provisionGymWorkspace({ type, name: "Workspace de teste", slug: `config-${randomUUID()}`, ownerId: owner.id }, actor.id);
    const old = await create();
    await GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 40, defaultBillingGraceDays: 7, defaultMaxReceptionistDiscountCents: 200 }, actor.id);
    const next = await create(); const personal = await create("PERSONAL");
    expect(await prisma.workspaceSubscription.findUnique({ where: { workspaceId: old.id } })).toHaveProperty("maxStudents", 20);
    expect(await prisma.gymSettings.findUnique({ where: { workspaceId: old.id } })).toMatchObject({ billingGracePeriodDays: 3, maxReceptionistDiscountInCents: BigInt(100) });
    expect(await prisma.workspaceSubscription.findUnique({ where: { workspaceId: next.id } })).toHaveProperty("maxStudents", 40);
    expect(await prisma.gymSettings.findUnique({ where: { workspaceId: next.id } })).toMatchObject({ billingGracePeriodDays: 7, maxReceptionistDiscountInCents: BigInt(200) });
    expect(await prisma.gymSettings.findUnique({ where: { workspaceId: personal.id } })).toBeNull();
    expect(await prisma.workspaceSubscription.findUnique({ where: { workspaceId: personal.id } })).toBeNull();
  });
  it("dois administradores não sobrescrevem o mesmo baseline; alterações independentes são preservadas", async () => {
    const first = await admin(); const second = await admin();
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS, "100");
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF, "10");
    const results = await Promise.allSettled([
      GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 200 }, first.id, undefined, { defaultMaxStudents: 100 }),
      GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 300 }, second.id, undefined, { defaultMaxStudents: 100 }),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find(result => result.status === "rejected");
    if (!failure || failure.status !== "rejected") throw new Error("Conflito não registrado.");
    expect(failure.reason).toMatchObject({ statusCode: 409, code: "CONFIGURATION_CONFLICT" });
    const current = await GymFeatureFlagsService.getGymGlobalConfigs();
    expect([200, 300]).toContain(current.defaultMaxStudents);
    await Promise.all([
      GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 400 }, first.id, undefined, { defaultMaxStudents: current.defaultMaxStudents }),
      GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStaff: 20 }, second.id, undefined, { defaultMaxStaff: 10 }),
    ]);
    expect(await GymFeatureFlagsService.getGymGlobalConfigs()).toMatchObject({ defaultMaxStudents: 400, defaultMaxStaff: 20 });
    await expect(GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 500 }, first.id, undefined, {})).rejects.toMatchObject({ statusCode: 400 });
  });
  it("falha na auditoria reverte todos os valores e não deixa atualização parcial", async () => {
    const actor = await admin();
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS, "100");
    await setting(GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF, "10");
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION gym_test_config_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic config audit failure'; END; $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER gym_test_config_audit_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.action LIKE 'SUPERADMIN_UPDATE_GYM_CONFIGS:%') EXECUTE FUNCTION gym_test_config_audit_failure()`);
    try {
      await expect(GymFeatureFlagsService.updateGymGlobalConfigs({ defaultMaxStudents: 200, defaultMaxStaff: 20 }, actor.id)).rejects.toThrow();
      expect(await GymFeatureFlagsService.getGymGlobalConfigs()).toMatchObject({ defaultMaxStudents: 100, defaultMaxStaff: 10 });
      expect(await prisma.auditLog.count({ where: { userId: actor.id, entity: "SystemSetting" } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS gym_test_config_audit_failure ON "AuditLog"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS gym_test_config_audit_failure()`);
    }
  });
});
