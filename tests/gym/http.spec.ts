import { afterAll, describe, expect, it, vi } from "vitest";
import { decode as decodeSessionJwt, encode as encodeSessionJwt } from "next-auth/jwt";
import { randomUUID, randomBytes, createHash, randomInt } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import prisma from "@/lib/prisma";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { gymGlobalConfigSchema } from "@/modules/workspaces/domain/gym-config";
import { financeOverviewSchema, financeTransactionsSchema } from "@/modules/workspaces/domain/superadmin-finance";
import { guardianDependentSchema, guardianLegalDocumentSchema } from "@/modules/workspaces/domain/guardian-portal";
import { gymStatementSchema } from "@/modules/workspaces/domain/gym-statement";
import { guardianInvitationIssuedSchema, guardianInvitationInfoSchema } from "@/modules/workspaces/domain/guardian-ingress";
import { DEFAULT_PREFERENCES } from "@/lib/notifications/types";
import { generateTOTPSecret, generateTOTPToken } from "@/lib/auth/totp";
import { prepareEmailFactor } from "@/lib/auth/mfa-service";
import { issueImpersonationStart } from "@/lib/auth/impersonation-service";
import { getStudentInvitationInfo } from "@/modules/workspaces/application/gym-student-ingress";

const origin = process.env.GYM_HTTP_ORIGIN;
describe("HTTP ingresso adulto GYM", () => {
  it("cadastro, convite, formulário de setup e Credentials permitem portal USER com contexto próprio", async () => {
    const owner = await account(), browser = await authenticated(owner), workspace = await academy(owner), unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } }); browser.setWorkspaceCookie(workspace.id);
    const email = `ingress-http-${randomUUID()}@example.invalid`, post = (path: string, data: unknown) => browser.request(path, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify(data) });
    const registered = await post("/api/gym/students", { workspaceId: workspace.id, unitId: unit.id, name: "Ingresso HTTP", email, birthDate: "1990-01-15", idempotencyKey: randomUUID() }); expect(registered.status).toBe(201); const student = await registered.json(); await prisma.user.update({ where: { id: student.userId }, data: { cpfCnpj: "52998224725" } });
    const issued = await post(`/api/gym/students/${student.memberId}/invite`, { workspaceId: workspace.id, confirmed: true, delivery: "MANUAL_LINK", requestKey: randomUUID() }); expect(issued.status).toBe(200); expect(issued.headers.get("cache-control")).toBe("private, no-store"); const invite = await issued.json(), token = new URL(invite.invitationPath, origin).searchParams.get("token")!;
    const anonymous = new BrowserSession(); expect((await anonymous.request(invite.invitationPath)).status).toBe(200); const displayed = await anonymous.serverAction("getSetupInfo", [token]); expect(displayed.result).toMatchObject({ success: true, needsEmail: false }); const docs = await getStudentInvitationInfo(token);
    const argumentsForSetup = [token, "senha-ingresso-http", undefined, undefined, true, true, docs.termsDocumentId, docs.privacyDocumentId, undefined, docs.termsDocumentHash, docs.privacyDocumentHash];
    expect((await browser.serverAction("setupPassword", argumentsForSetup)).result).toHaveProperty("error"); expect((await anonymous.serverAction("setupPassword", argumentsForSetup)).result).toMatchObject({ success: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: student.userId } }); const login = await authenticated({ user, email, password: "senha-ingresso-http" }); expect(await login.userId()).toBe(user.id);
    expect((await login.serverAction("selectActiveWorkspace", [workspace.id])).result).toMatchObject({ success: true }); expect((await login.request("/student/dashboard")).status).toBe(200); expect((await login.request("/api/student/settings")).status).toBe(200);
    expect((await anonymous.serverAction("setupPassword", argumentsForSetup)).result).toHaveProperty("error"); expect(await prisma.freeTrial.findUnique({ where: { userId: user.id } })).toBeNull();
  });
  it("origem e ator não podem ser injetados; reemissão, prazo e revogação bloqueiam link anterior", async () => {
    const actor = await account(), studentAccount = await account(), workspace = await academy(actor), browser = await authenticated(actor), unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: studentAccount.user.id, role: "STUDENT", unitId: unit.id } }); browser.setWorkspaceCookie(workspace.id);
    const f = { owner: actor.user, student: studentAccount.user, workspace, unit, studentMember: member, browser }, owner = f.browser, input = { workspaceId: f.workspace.id, confirmed: true, delivery: "MANUAL_LINK", requestKey: randomUUID() }, route = `/api/gym/students/${f.studentMember.id}/invite`;
    await prisma.user.update({ where: { id: f.student.id }, data: { password: null } });
    const send = (data: unknown, originHeader = origin!) => owner.request(route, { method: "POST", headers: { "Content-Type": "application/json", Origin: originHeader }, body: JSON.stringify(data) });
    expect((await send(input, "https://example.invalid")).status).toBe(403); expect((await send({ ...input, actorUserId: f.student.id })).status).toBe(400); expect((await send({ ...input, confirmed: false })).status).toBe(400);
    const first = await send(input); expect(first.status).toBe(200); const oldToken = new URL((await first.json()).invitationPath, origin).searchParams.get("token")!;
    const renewed = await send({ ...input, requestKey: randomUUID() }); expect(renewed.status).toBe(200); const token = new URL((await renewed.json()).invitationPath, origin).searchParams.get("token")!;
    const anonymous = new BrowserSession(); await anonymous.request(`/auth/setup-password?token=${token}`); expect((await anonymous.serverAction("getSetupInfo", [oldToken])).result).toHaveProperty("error");
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.studentMember.id, role: "STUDENT" }, data: { revokedAt: new Date() } });
    // Legacy fixture has no grants; create explicit revoked history as well.
    if (!await prisma.workspaceRoleGrant.count({ where: { memberId: f.studentMember.id } })) await prisma.workspaceRoleGrant.create({ data: { memberId: f.studentMember.id, role: "STUDENT", unitId: f.unit.id, revokedAt: new Date(), grantedBy: f.owner.id } });
    expect((await anonymous.serverAction("getSetupInfo", [token])).result).toHaveProperty("error");
  });
});

describe("HTTP armazenamento administrativo paginado", () => {
  it("exige administrador atual e valida filtros antes de responder dados limitados sem consulta R2", async () => {
    const route = "/api/superadmin/storage", admin = await account("SUPERADMIN"), browser = await authenticated(admin);
    expect((await new BrowserSession().request(route + "?includeBucket=false")).status).toBe(401);
    const ordinary = await authenticated(await account()); expect((await ordinary.request(route + "?includeBucket=false")).status).toBe(401);
    for (const query of ["pageSize=101", "page=0", "page=1&page=2", "status=OTHER", "injected=true", "search=" + "x".repeat(121)]) expect((await browser.request(route + "?includeBucket=false&" + query)).status).toBe(400);
    const unique = `http-storage-${randomUUID()}`;
    for (let index = 0; index < 3; index++) await prisma.user.create({ data: { role: "TRAINER", name: `${unique} ${index}` } });
    const first = await browser.request(route + `?includeBucket=false&search=${unique}&pageSize=2`); expect(first.status).toBe(200); expect(first.headers.get("cache-control")).toBe("private, no-store"); const body = await first.json();
    expect(body.bucketStats).toBeNull(); expect(body.personalsMetrics).toHaveLength(2); expect(body.pagination).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(body.personalsMetrics[0]).not.toHaveProperty("password");
    const second = await (await browser.request(route + `?includeBucket=false&search=${unique}&pageSize=2&page=2`)).json(); expect(second.personalsMetrics).toHaveLength(1); expect(second.summary).toEqual(body.summary); expect(second.personalsMetrics[0].userId).not.toBe(body.personalsMetrics[0].userId);
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: "USER" } }); expect((await browser.request(route + "?includeBucket=false")).status).toBe(401);
  });
});

describe("HTTP sessão global e suporte", () => {
  it("emissão estrita, token único e retorno preservam administrador original; origem estrangeira e suporte encadeado são negados", async () => {
    const admin = await account("SUPERADMIN"), target = await account(), browser = await authenticated(admin);
    const input = { targetUserId: target.user.id, reason: "Suporte exclusivamente sintético" };
    const post = (client: BrowserSession, body: unknown, source = origin!) => client.request("/api/superadmin/impersonate", { method: "POST", headers: { "Content-Type": "application/json", Origin: source }, body: JSON.stringify(body) });
    expect((await post(new BrowserSession(), input)).status).toBe(401);
    expect((await post(browser, input, "https://example.invalid")).status).toBe(403);
    expect((await post(browser, { ...input, actorUserId: admin.user.id })).status).toBe(400);
    const protectedAdmin = await account("SUPERADMIN"); expect((await post(browser, { ...input, targetUserId: protectedAdmin.user.id })).status).toBe(403);
    const issued = await post(browser, input); expect(issued.status).toBe(200); expect(issued.headers.get("cache-control")).toBe("private, no-store"); const grant = await issued.json();
    expect(await prisma.verificationToken.findUnique({ where: { token: grant.token } })).toBeNull();
    const support = new BrowserSession(); await support.login(target.email, "", undefined, grant.token); expect(await support.userId()).toBe(target.user.id);
    expect((await (await support.request("/api/auth/session")).json()).user).toMatchObject({ isImpersonated: true, originalAdminUserId: admin.user.id, originalAdminSessionVersion: 0 });
    expect((await post(support, { ...input, targetUserId: admin.user.id })).status).toBe(401);
    const returned = await support.request("/api/superadmin/unimpersonate", { method: "POST", headers: { Origin: origin! } }); expect(returned.status).toBe(200); const returnGrant = await returned.json();
    await support.login(admin.email, "", undefined, returnGrant.token); expect(await support.userId()).toBe(admin.user.id);
    expect((await (await support.request("/api/auth/session")).json()).user.isImpersonated).toBe(false);
    const replay = new BrowserSession(); await replay.login(admin.email, "", undefined, returnGrant.token); expect(await replay.userId()).toBeNull();
  });
  it("grant emitido antes de revogar administrador ou alvo não autentica, incluindo retorno pendente", async () => {
    for (const subject of ["admin", "target"] as const) {
      const admin = await account("SUPERADMIN"), target = await account(), actor = await authenticated(admin);
      const response = await actor.request("/api/superadmin/impersonate", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify({ targetUserId: target.user.id, reason: "Ensaio de revogação antes do uso" }) }); expect(response.status).toBe(200); const grant = await response.json();
      await prisma.user.update({ where: { id: subject === "admin" ? admin.user.id : target.user.id }, data: { sessionVersion: { increment: 1 } } });
      const denied = new BrowserSession(); await denied.login(target.email, "", undefined, grant.token); expect(await denied.userId()).toBeNull();
    }
    const admin = await account("SUPERADMIN"), target = await account(), actor = await authenticated(admin);
    const { token } = await issueImpersonationStart(admin.user, { targetUserId: target.user.id, reason: "Ensaio de retorno pendente" });
    const support = new BrowserSession(); await support.login(target.email, "", undefined, token);
    const returned = await support.request("/api/superadmin/unimpersonate", { method: "POST", headers: { Origin: origin! } }); expect(returned.status).toBe(200); const grant = await returned.json();
    await prisma.user.update({ where: { id: admin.user.id }, data: { sessionVersion: { increment: 1 } } });
    const denied = new BrowserSession(); await denied.login(admin.email, "", undefined, grant.token); expect(await denied.userId()).toBeNull(); expect(await support.userId()).toBeNull(); expect(await actor.userId()).toBeNull();
  });
  it("demover por administração revoga sessão; papel relido e senha removida retiram privilégio/acesso imediatamente", async () => {
    const admin = await account("SUPERADMIN"), target = await account("SUPERADMIN"), actor = await authenticated(admin), previous = await authenticated(target);
    const response = await actor.request(`/api/superadmin/users/${target.user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "USER" }) }); expect(response.status).toBe(200); expect(await previous.userId()).toBeNull();
    const regular = await authenticated(target); expect(await regular.userId()).toBe(target.user.id); expect((await regular.request(`/api/superadmin/users/${admin.user.id}`)).status).toBe(401);
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: "USER" } });
    expect((await (await actor.request("/api/auth/session")).json()).user.role).toBe("USER"); expect((await actor.request(`/api/superadmin/users/${target.user.id}`)).status).toBe(401);
    await prisma.user.update({ where: { id: target.user.id }, data: { password: null } }); expect(await regular.userId()).toBeNull(); expect((await regular.request("/api/student/settings")).status).toBe(401);
  });
  it("troca própria valida bytes e senha atual; revoga duas sessões e grant pendente sem permitir alteração por suporte", async () => {
    const student = await account(), owner = await account(), admin = await account("SUPERADMIN"), gym = await academy(owner);
    const member = await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: student.user.id, role: "STUDENT" } });
    const first = await authenticated(student), second = await authenticated(student); first.setWorkspaceCookie(gym.id); second.setWorkspaceCookie(gym.id);
    const pending = await issueImpersonationStart(admin.user, { targetUserId: student.user.id, reason: "Grant anterior à troca de senha" });
    const issued = await issueImpersonationStart(admin.user, { targetUserId: student.user.id, reason: "Suporte não altera senha própria" });
    const support = new BrowserSession(); await support.login(student.email, "", undefined, issued.token); support.setWorkspaceCookie(gym.id);
    const input = { action: "changePassword", currentPassword: student.password, newPassword: "New-synthetic-password2026!" };
    const patch = (client: BrowserSession, body: unknown) => client.request("/api/student/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await patch(first, { ...input, newPassword: "😀".repeat(20) })).status).toBe(400); expect((await patch(first, { ...input, currentPassword: "wrong" })).status).toBe(400); expect((await patch(support, input)).status).toBe(403);
    expect((await patch(first, input)).status).toBe(200); expect(await first.userId()).toBeNull(); expect(await second.userId()).toBeNull(); expect(await support.userId()).toBeNull();
    const stale = new BrowserSession(); await stale.login(student.email, "", undefined, pending.token); expect(await stale.userId()).toBeNull();
    const fresh = await authenticated({ ...student, password: input.newPassword }); expect(await fresh.userId()).toBe(student.user.id);
    expect(await prisma.workspaceMember.findUnique({ where: { id: member.id } })).toMatchObject({ isActive: true });
  });
  it("política de 24h rejeita JWT antigo quando habilitada e preserva sessão renovada ou política desabilitada", async () => {
    const previous = await prisma.systemSetting.findUnique({ where: { key: "session_expiration" } });
    try {
      await prisma.systemSetting.upsert({ where: { key: "session_expiration" }, create: { key: "session_expiration", value: "false" }, update: { value: "false" } });
      const subject = await account(), expired = await authenticated(subject), renewable = await authenticated(subject), recent = await authenticated(subject);
      await expired.backdateCookieForTest(25); await renewable.backdateCookieForTest(25);
      expect(await renewable.userId()).toBe(subject.user.id);
      await prisma.systemSetting.update({ where: { key: "session_expiration" }, data: { value: "true" } });
      expect(await expired.userId()).toBeNull(); expect(await recent.userId()).toBe(subject.user.id); expect(await renewable.userId()).toBe(subject.user.id);
    } finally {
      if (previous) await prisma.systemSetting.update({ where: { key: "session_expiration" }, data: { value: previous.value } });
      else await prisma.systemSetting.deleteMany({ where: { key: "session_expiration" } });
    }
  });
});
describe("HTTP contexto PERSONAL e trial", () => {
  it("dashboard usa tenant selecionado e trial revogado/futuro não autoriza; quota exclui alunos GYM", async () => {
    const subject = await account(), user = await prisma.user.update({ where: { id: subject.user.id }, data: { role: "TRAINER", onboarded: true } });
    const first = await prisma.workspace.create({ data: { ownerId: user.id, name: "Personal HTTP A", slug: randomUUID(), type: "PERSONAL", members: { create: { userId: user.id, role: "OWNER" } } } });
    const second = await prisma.workspace.create({ data: { ownerId: user.id, name: "Personal HTTP B", slug: randomUUID(), type: "PERSONAL", members: { create: { userId: user.id, role: "OWNER" } } } });
    const gym = await academy({ ...subject, user });
    for (const workspaceId of [first.id, gym.id, gym.id]) { const student = await prisma.user.create({ data: {} }); await prisma.workspaceMember.create({ data: { userId: student.id, workspaceId, role: "STUDENT" } }); }
    const trial = await prisma.freeTrial.create({ data: { userId: user.id, isActive: true, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 7 * 86400000) } });
    const browser = await authenticated({ ...subject, user }); browser.setWorkspaceCookie(first.id);
    expect((await browser.request(`/api/personal/dashboard?workspaceId=${first.id}`)).status).toBe(200);
    expect((await browser.request(`/api/personal/dashboard?workspaceId=${second.id}`)).status).toBe(409);
    browser.setWorkspaceCookie(gym.id); expect((await browser.request(`/api/personal/dashboard?workspaceId=${gym.id}`)).status).toBe(403);
    browser.setWorkspaceCookie(first.id);
    const active = await (await browser.request("/api/personal/subscription")).json(); expect(active.currentSubscription.freeTrial.isActive).toBe(true); expect(active.currentSubscription.usage.students.current).toBe(1);
    await prisma.freeTrial.update({ where: { id: trial.id }, data: { isActive: false } });
    const revoked = await (await browser.request("/api/personal/subscription")).json(); expect(revoked.currentSubscription.freeTrial.isActive).toBe(false); expect(revoked.currentSubscription.status).toBe("expired");
    const blocked = await browser.request("/personal/dashboard"); expect(blocked.status).toBe(307); expect(new URL(blocked.headers.get("location")!, origin).pathname).toBe("/subscription-expired");
    await prisma.freeTrial.update({ where: { id: trial.id }, data: { isActive: true, startDate: new Date(Date.now() + 86400000) } });
    expect((await (await browser.request("/api/personal/subscription")).json()).currentSubscription.freeTrial.isActive).toBe(false);
    expect(await prisma.subscription.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });
});
describe("HTTP treinos avançados", () => {
  it("editor autorizado usa revisão, rejeita adulteração e preserva fichas; suspensão bloqueia escrita", async () => {
    const owner = await account(), workspace = await academy(owner), browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const stranger = await authenticated(await account()); stranger.setWorkspaceCookie(workspace.id);
    const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
    const exercise = await prisma.exercise.create({ data: { name: "Exercício avançado HTTP", muscleGroupId: muscle.id, isOfficial: true, status: "APPROVED" } });
    const template = await prisma.workout.create({ data: { workspaceId: workspace.id, creatorId: owner.user.id, name: "Modelo avançado HTTP", goal: "Força", duration: "40 min", difficulty: "Intermediário", exercises: { create: [0, 1].map(order => ({ exerciseId: exercise.id, sets: 3, reps: "10", rest: "60s", order })) } }, include: { exercises: true } });
    const route = `/api/gym/workouts/templates/${template.id}/advanced`, query = `${route}?workspaceId=${workspace.id}`;
    expect((await new BrowserSession().request(query)).status).toBe(401); expect((await stranger.request(query)).status).toBe(403);
    const loaded = await browser.request(query); expect(loaded.status).toBe(200); expect(loaded.headers.get("cache-control")).toBe("private, no-store"); const baseline = (await loaded.json()).data;
    const input = { workspaceId: workspace.id, revision: baseline.revision, groups: [], exercises: template.exercises.map((row, order) => ({ id: row.id, sets: 5, reps: "8", rest: "90s", load: "30 kg", description: "HTTP", order, groupId: null, allowRepsModification: false, method: { type: "DROPSET", config: { drops: 2, reduction: 20 } } })) };
    const patch = (value: object) => browser.request(route, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
    expect((await patch({ ...input, actorUserId: owner.user.id })).status).toBe(400);
    expect((await patch({ ...input, groups: [{ id: randomUUID(), type: "BISET", config: null }], exercises: input.exercises.map(row => ({ ...row, groupId: randomUUID() })) })).status).toBe(400);
    expect((await patch(input)).status).toBe(200); expect((await patch(input)).status).toBe(409);
    const persisted = await prisma.workoutExercise.findMany({ where: { workoutId: template.id } }); expect(persisted.every(row => row.sets === 5 && row.methodType === "DROPSET")).toBe(true);
    expect(await prisma.auditLog.count({ where: { entityId: template.id, action: "GYM_TEMPLATE_ADVANCED_UPDATED" } })).toBe(1);
    const fresh = (await (await browser.request(query)).json()).data;
    await prisma.workspace.update({ where: { id: workspace.id }, data: { isActive: false } });
    expect((await patch({ ...input, revision: fresh.revision })).status).toBe(403);
  });
});
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (origin !== "http://127.0.0.1:31173" || database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("HTTP exige aplicação e banco descartáveis específicos.");
afterAll(async () => { await prisma.$disconnect(); });

describe("HTTP BigInt configurações", () => {
  it("settings completos preservam centavos acima de 2^53 em GET/PATCH e na atualização administrativa", async () => {
    const admin = await account("SUPERADMIN"), owner = await account(), workspace = await academy(owner), browser = await authenticated(admin);
    const amount = BigInt("9223372036854775807");
    await prisma.gymSettings.create({ data: { workspaceId: workspace.id, timezone: "America/Sao_Paulo", operatingHours: { monday: { open: "08:00", close: "20:00" } }, billingGracePeriodDays: 9, capacityLimit: 150, requireGuardianSignature: true, maxReceptionistDiscountInCents: amount } });
    const main = `/api/superadmin/workspaces/${workspace.id}`, config = `${main}/gym-config`;
    const expected = { maxReceptionistDiscountInCents: amount.toString(), requireGuardianSignature: true, capacityLimit: 150 };
    for (const route of [main, config]) {
      const response = await browser.request(route); expect(response.status).toBe(200); expect((await response.json()).settings).toMatchObject(expected);
    }
    const patch = await browser.request(config, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: { billingGracePeriodDays: 12 } }) });
    expect(patch.status).toBe(200); expect((await patch.json()).settings).toMatchObject({ ...expected, billingGracePeriodDays: 12 });
    const administrative = await browser.request(main, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Academia BigInt verificada" }) });
    expect(administrative.status).toBe(200); expect((await administrative.json()).settings).toMatchObject(expected);
    expect((await prisma.gymSettings.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).maxReceptionistDiscountInCents).toBe(amount);
  });
});

describe("HTTP MFA completo", () => {
  it("Credentials com 3FA nega ausência, expiração, usuário estrangeiro e replay da prova", async () => {
    const subject = await account("SUPERADMIN", true), foreign = await account("SUPERADMIN", true), secret = generateTOTPSecret();
    await prisma.user.update({ where: { id: subject.user.id }, data: { twoFactorSecret: secret, twoFactorType: "AUTHENTICATOR", threeFactorEnabled: true } });
    const policy = await resolveAuthenticationPolicy(subject.user.id), other = await resolveAuthenticationPolicy(foreign.user.id);
    if (!policy || !other) throw new Error("Fixture sem política.");
    const denied = new BrowserSession(); await denied.login(subject.email, subject.password); expect(await denied.userId()).toBeNull();
    const expired = await issueCredentialProof(subject.user.id, policy.user.password || "", authenticationPolicyKey(policy));
    await prisma.verificationToken.updateMany({ where: { token: createHash("sha256").update(expired).digest("hex") }, data: { expires: new Date(Date.now() - 1000) } });
    await denied.login(subject.email, subject.password, expired); expect(await denied.userId()).toBeNull();
    const wrongUser = await issueCredentialProof(foreign.user.id, other.user.password || "", authenticationPolicyKey(other));
    await denied.login(subject.email, subject.password, wrongUser); expect(await denied.userId()).toBeNull();
    const valid = await issueCredentialProof(subject.user.id, policy.user.password || "", authenticationPolicyKey(policy));
    const accepted = new BrowserSession(); await accepted.login(subject.email, subject.password, valid); expect(await accepted.userId()).toBe(subject.user.id);
    await denied.login(subject.email, subject.password, valid); expect(await denied.userId()).toBeNull();
  });
  it("alteração exige senha e os dois fatores atuais; só então modifica e revoga todas as sessões", async () => {
    const admin = await account("SUPERADMIN", true), secret = generateTOTPSecret();
    await prisma.user.update({ where: { id: admin.user.id }, data: { twoFactorSecret: secret, twoFactorType: "AUTHENTICATOR", threeFactorEnabled: true } });
    const browser = await authenticated(admin), second = await authenticated(admin);
    const beforeStatus = await prisma.userTotpDevice.count({ where: { userId: admin.user.id } });
    expect((await browser.request("/api/superadmin/security/totp/status")).status).toBe(200);
    expect(await prisma.userTotpDevice.count({ where: { userId: admin.user.id } })).toBe(beforeStatus);
    const post = (route: string, body: unknown) => browser.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const reauth = "/api/superadmin/security/reauthenticate", toggle = "/api/superadmin/security/totp/toggle-3fa";
    expect((await post(toggle, { enabled: false })).status).toBe(403);
    expect((await post(reauth, { password: "senha-errada" })).status).toBe(401);
    expect((await post(reauth, { password: admin.password, totpCode: generateTOTPToken(secret) })).status).toBe(401);
    const policy = await resolveAuthenticationPolicy(admin.user.id); if (!policy) throw new Error("Sem política.");
    const factor = await prepareEmailFactor(`MFA_SETTINGS:${policy.identifier}`, true); if (!factor.code) throw new Error("Sem código sintético.");
    const email = await post(reauth, { password: admin.password, code: factor.code }); expect(email.status).toBe(200); expect(await email.json()).toMatchObject({ success: false, step: "TOTP" });
    const confirmed = await post(reauth, { password: admin.password, totpCode: generateTOTPToken(secret) }); expect(confirmed.status).toBe(200);
    const proof = (await confirmed.json()).reauthenticationProof;
    expect((await post(toggle, { enabled: "false", reauthenticationProof: proof })).status).toBe(400);
    expect((await post(toggle, { enabled: false, reauthenticationProof: proof, actorUserId: randomUUID() })).status).toBe(400);
    expect((await post(toggle, { enabled: false, reauthenticationProof: proof })).status).toBe(200);
    expect(await browser.userId()).toBeNull(); expect(await second.userId()).toBeNull();
    expect(await prisma.user.findUniqueOrThrow({ where: { id: admin.user.id } })).toMatchObject({ threeFactorEnabled: false, sessionVersion: 1 });
  });
});

describe("HTTP encerramento GYM", () => {
  it("nega sessão ausente, ator injetado e contexto estrangeiro; preserva dados e confirma o recibo no retry", async () => {
    const owner = await account(), stranger = await account(), workspace = await academy(owner);
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const other = await authenticated(stranger); other.setWorkspaceCookie(workspace.id);
    const route = "/api/gym/settings/closure", body = { workspaceId: workspace.id, requestKey: randomUUID(), confirmationSlug: workspace.slug, reason: "Encerramento HTTP sintético autorizado" };
    const post = (session: BrowserSession, input: unknown = body) => session.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    expect((await post(new BrowserSession())).status).toBe(401);
    expect((await browser.request(`/api/personal/workspace?workspaceId=${workspace.id}`, { method: "DELETE" })).status).toBe(403);
    expect((await post(other)).status).toBe(403);
    expect((await post(browser, { ...body, actorUserId: owner.user.id })).status).toBe(400);
    expect((await post(browser, { ...body, confirmationSlug: "academia-errada" })).status).toBe(409);
    expect((await browser.request(`${route}?workspaceId=${randomUUID()}`)).status).toBe(409);
    expect((await (await browser.request(`${route}?workspaceId=${workspace.id}`)).json()).data).toMatchObject({ canClose: true, alreadyClosed: false });
    const closed = await post(browser); expect(closed.status).toBe(200); const receipt = (await closed.json()).data;
    const repeated = await post(browser); expect(repeated.status).toBe(200); expect((await repeated.json()).data).toMatchObject({ receiptId: receipt.receiptId, alreadyClosed: true });
    expect((await post(browser, { ...body, requestKey: randomUUID() })).status).toBe(409);
    expect(await prisma.workspace.findUnique({ where: { id: workspace.id } })).toMatchObject({ isActive: false, ownerId: owner.user.id });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(1);
    expect((await (await browser.request(`${route}?workspaceId=${workspace.id}`)).json()).data).toMatchObject({ alreadyClosed: true });
  });
});

describe("HTTP realtime selecionado", () => {
  it("token exige sessão, rejeita seleção divergente e JSON da URL inválido antes do provedor", async () => {
    const anonymous = new BrowserSession();
    expect((await anonymous.request("/api/ably/token")).status).toBe(401);
    const owner = await account(), workspace = await academy(owner);
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    expect((await browser.request(`/api/ably/token?workspaceId=${randomUUID()}`)).status).toBe(409);
    expect((await browser.request("/api/ably/token?workspaceId=")).status).toBe(400);
    expect((await browser.request(`/api/ably/token?workspaceId=${workspace.id}&workspaceId=${workspace.id}`)).status).toBe(400);
    const matching = await browser.request(`/api/ably/token?workspaceId=${workspace.id}`);
    expect(matching.status).toBe(503); // Isolated HTTP app intentionally has no provider credentials.
    expect(await matching.text()).toBe("Serviço de tempo real não configurado.");
  });
});

describe("HTTP entregas e preferências", () => {
  it("nega cron e preferências sem sessão/autorização, sem consumir a fila", async () => {
    const browser = new BrowserSession();
    const before = await prisma.deliveryOutbox.count({ where: { status: "PROCESSING" } });
    expect((await browser.request("/api/cron/deliveries")).status).toBe(401);
    expect((await browser.request("/api/cron/deliveries", { headers: { Authorization: "Bearer synthetic-wrong-secret" } })).status).toBe(401);
    expect((await browser.request("/api/notifications/preferences")).status).toBe(401);
    expect((await browser.request("/api/notifications/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ TRAINING: { push: false } }) })).status).toBe(401);
    expect(await prisma.deliveryOutbox.count({ where: { status: "PROCESSING" } })).toBe(before);
  });
  it("PATCH concorrente preserva flags e rejeita payload inválido sem alterar outro usuário", async () => {
    const owner = await account(), other = await account();
    const browser = await authenticated(owner);
    const route = "/api/notifications/preferences";
    const patch = (body: unknown) => browser.request(route, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(await (await browser.request(route)).json()).toEqual(DEFAULT_PREFERENCES);
    const results = await Promise.all([patch({ TRAINING: { push: false } }), patch({ TRAINING: { email: false } }), patch({ FINANCE: { inApp: false } })]);
    expect(results.map(result => result.status)).toEqual([200, 200, 200]);
    const expected = { ...DEFAULT_PREFERENCES, TRAINING: { push: false, email: false, inApp: true }, FINANCE: { push: true, email: true, inApp: false } };
    expect(await (await browser.request(route)).json()).toEqual(expected);
    expect((await patch({ TRAINING: { push: "false" } })).status).toBe(400);
    expect((await patch({ userId: other.user.id, TRAINING: { push: true } })).status).toBe(400);
    expect((await browser.request(route, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{" })).status).toBe(400);
    expect(await (await browser.request(route)).json()).toEqual(expected);
    expect(await prisma.notificationPreference.findUnique({ where: { userId: other.user.id } })).toBeNull();
  });
  it("comunicação GYM exige chave, deduplica HTTP concorrente e revalida suspensão no retry", async () => {
    const owner = await account(), student = await account();
    const workspace = await academy(owner);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    await prisma.workspaceMember.create({ data: { userId: student.user.id, workspaceId: workspace.id, unitId: unit.id, role: "STUDENT", studentProfile: { create: {} } } });
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const route = "/api/gym/communication/notifications";
    const body = { workspaceId: workspace.id, requestKey: randomUUID(), title: "Aviso HTTP sintético", message: "Mensagem interna sintética", targetAudience: "ALL_STUDENTS", channel: "IN_APP" };
    const post = (data: unknown) => browser.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const { requestKey: _ignored, ...withoutKey } = body;
    expect((await post(withoutKey)).status).toBe(400);
    expect((await post({ ...body, channel: "EMAIL" })).status).toBe(400);
    const responses = await Promise.all(Array.from({ length: 4 }, () => post(body)));
    expect(responses.map(response => response.status)).toEqual([201, 201, 201, 201]);
    const results = await Promise.all(responses.map(response => response.json()));
    expect(new Set(results.map(result => result.dispatchId)).size).toBe(1);
    expect(results[0]).toMatchObject({ status: "PERSISTED", channel: "IN_APP", recipientsCount: 1 });
    expect(await prisma.notification.count({ where: { workspaceId: workspace.id } })).toBe(1);
    expect((await post({ ...body, message: "Conteúdo divergente" })).status).toBe(409);
    await prisma.workspace.update({ where: { id: workspace.id }, data: { isActive: false } });
    expect((await post(body)).status).toBe(403);
    expect(await prisma.notification.count({ where: { workspaceId: workspace.id } })).toBe(1);
  });
});

describe("HTTP passo 3 completo", () => {
  async function fixture() {
    const owner = await account(), student = await account();
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("1990-01-15") } });
    const workspace = await academy(owner), unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.user.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Contrato HTTP passo 3", versions: { create: { version: 1, name: "Plano sintético", priceInCents: BigInt(10000), termsText: "Condições contratuais HTTP sintéticas", durationDays: 365 } } }, include: { versions: true } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, unitId: unit.id, studentMemberId: member.id, planVersionId: plan.versions[0].id, priceInCents: BigInt(10000), status: "ACTIVE", accessGranted: true, activatedAt: new Date(), startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 365 * 86400000), cycleCount: 1, acceptance: { create: { workspaceId: workspace.id, signerUserId: student.user.id, termsVersion: "1", termsSnapshot: "Snapshot HTTP original" } } } });
    const invoice = await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, enrollmentId: enrollment.id, studentMemberId: member.id, studentUserId: student.user.id, invoiceNumber: randomUUID(), title: "Obrigação HTTP original", dueDate: new Date(), subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), payerName: "Aluno sintético", createdByUserId: owner.user.id } });
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const post = (route: string, data: unknown, session = browser) => session.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return { owner, student, workspace, unit, member, enrollment, invoice, browser, post };
  }
  it("nega sessão ausente, tipos inválidos e campos de autoridade injetados; não lista outra academia", async () => {
    const f = await fixture(), anonymous = new BrowserSession();
    expect((await anonymous.request(`/api/gym/reviews?workspaceId=${f.workspace.id}&kind=CONTRACT`)).status).toBe(401);
    expect((await f.browser.request(`/api/gym/reviews?workspaceId=${f.workspace.id}&kind=WRONG`)).status).toBe(400);
    const route = `/api/gym/reviews/INVOICE/${f.invoice.id}`;
    const shown = await (await f.browser.request(`${route}?workspaceId=${f.workspace.id}`)).json();
    expect((await f.post(route, { workspaceId: f.workspace.id, requestKey: randomUUID(), previewDigest: shown.digest, approved: true, reason: "Conferência sintética do saldo HTTP", evidenceReference: "HTTP-DOC-001", actorUserId: f.owner.user.id })).status).toBe(400);
    expect((await f.browser.request(`${route}?workspaceId=${randomUUID()}`)).status).toBe(409);
    expect(await prisma.gymAdministrativeReview.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("revisa legado por documento e libera cancelamento local, preservando faturas e referência externa", async () => {
    const f = await fixture(), provider = `http-sub-${randomUUID()}`;
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { providerSubscriptionId: provider, recurrenceMode: "PROVIDER" } });
    expect((await f.post(`/api/gym/enrollments/${f.enrollment.id}/cancel`, { workspaceId: f.workspace.id, immediate: true, reason: "Sem confirmação externa" })).status).toBe(409);
    const route = `/api/gym/reviews/CONTRACT/${f.enrollment.id}`, shown = await (await f.browser.request(`${route}?workspaceId=${f.workspace.id}`)).json();
    const data = { workspaceId: f.workspace.id, requestKey: randomUUID(), previewDigest: shown.digest, approved: true, reason: "Conferência documental HTTP sintética", evidenceReference: "HTTP-EXTERNAL-CLOSED-001", externalSubscriptionClosed: true, externalChargesReviewed: true, completedCycles: 1 };
    const results = await Promise.all([f.post(route, data), f.post(route, data)]); expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(await prisma.gymAdministrativeReview.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect((await f.post(`/api/gym/enrollments/${f.enrollment.id}/cancel`, { workspaceId: f.workspace.id, immediate: true, reason: "Encerramento após conferência documental" })).status).toBe(200);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "CANCELLED", retiredProviderSubscriptionId: provider });
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });
  });
  it("corrige agregado com saldo de migração, recusa mudança concorrente e entrega a página de revisão", async () => {
    const f = await fixture(), route = `/api/gym/reviews/INVOICE/${f.invoice.id}`;
    const shown = await (await f.browser.request(`${route}?workspaceId=${f.workspace.id}`)).json();
    const data = { workspaceId: f.workspace.id, requestKey: randomUUID(), previewDigest: shown.digest, approved: true, reason: "Saldo pago antes da migração confirmado", evidenceReference: "HTTP-MIGRATION-001", openingAmountInCents: "4000" };
    await prisma.gymInvoice.update({ where: { id: f.invoice.id }, data: { description: "Edição concorrente" } });
    expect((await f.post(route, data)).status).toBe(409);
    const fresh = await (await f.browser.request(`${route}?workspaceId=${f.workspace.id}`)).json();
    expect((await f.post(route, { ...data, previewDigest: fresh.digest })).status).toBe(200);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "PARTIALLY_PAID", openingPaidAmountInCents: BigInt(4000), balanceRemainingInCents: BigInt(6000) });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    const page = await f.browser.request("/gym/reconciliation"); expect(page.status).toBe(200); expect(await page.text()).toContain("Revisão de contratos e saldos");
  });
  it("retira cancelamento futuro sem reativar ou apagar dívida; matrícula encerrada não admite retirada", async () => {
    const f = await fixture(), base = `/api/gym/enrollments/${f.enrollment.id}/cancel`;
    expect((await f.post(base, { workspaceId: f.workspace.id, immediate: false, reason: "Encerramento no término da vigência" })).status).toBe(200);
    expect((await f.post(base + "/withdraw", { workspaceId: f.workspace.id, reason: "Retirada solicitada pelo aluno" })).status).toBe(200);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "ACTIVE", accessGranted: true, autoRenew: false, cancellationEffectiveDate: null });
    expect((await f.post(base, { workspaceId: f.workspace.id, immediate: true, reason: "Encerramento imediato solicitado" })).status).toBe(200);
    expect((await f.post(base + "/withdraw", { workspaceId: f.workspace.id, reason: "Não deve reativar matrícula encerrada" })).status).toBe(409);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN" });
  });
});

describe("HTTP webhook de transição", () => {
  it("confirma revisão GYM, nega autenticação inválida e retorna 503 para processamento falho", async () => {
    const owner = await prisma.user.create({ data: { name: "Titular HTTP sintético" } });
    const gym = await prisma.workspace.create({ data: { type: "GYM", name: "Legado HTTP", slug: randomUUID(), ownerId: owner.id } });
    const account = await prisma.paymentProviderAccount.create({ data: { workspaceId: gym.id, provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID() } });
    const headers = { "Content-Type": "application/json", "asaas-access-token": "synthetic-http-webhook-secret" };
    const body = JSON.stringify({ id: randomUUID(), event: "ACCOUNT_UPDATED", account: { id: account.providerAccountId } });
    const request = (value: string, authorized = true) => fetch(`${origin}/api/webhooks/payments/asaas`, { method: "POST", headers: authorized ? headers : { "Content-Type": "application/json" }, body: value, signal: AbortSignal.timeout(90_000) });
    expect((await request(body, false)).status).toBe(400);
    const accepted = await request(body);
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({ success: true, status: "REVIEW_REQUIRED" });
    const retained = await prisma.paymentWebhookEvent.findFirstOrThrow({ where: { gymWorkspaceId: gym.id } });
    expect(retained).toMatchObject({ processingStatus: "REVIEW_REQUIRED", processedAt: null });
    expect(await prisma.walletLedgerEntry.count({ where: { providerAccountId: account.id } })).toBe(0);
    const failed = await request(JSON.stringify({ id: randomUUID(), event: "TRANSFER_FAILED", transfer: { id: randomUUID() } }));
    expect(failed.status).toBe(503);
    expect(await failed.json()).toMatchObject({ success: false, status: "FAILED_RETRYABLE" });
  });
});

class BrowserSession {
  private cookies = new Map<string, string>();
  async backdateCookieForTest(hours: number) {
    // Only the explicitly isolated HTTP server uses this known synthetic secret.
    const secret = "isolated-gym-test-secret-not-for-production", salt = "authjs.session-token", raw = this.cookies.get(salt);
    if (!raw) throw new Error("Cookie sintético ausente.");
    const token = await decodeSessionJwt({ token: raw, secret, salt }); if (!token) throw new Error("JWT sintético inválido.");
    const date = Date.now();
    vi.useFakeTimers(); vi.setSystemTime(date - hours * 3600000);
    try { this.cookies.set(salt, await encodeSessionJwt({ token, secret, salt, maxAge: 30 * 86400 })); }
    finally { vi.useRealTimers(); }
  }
  setWorkspaceCookie(workspaceId: string) { this.cookies.set("atlasfit_active_workspace_id", workspaceId); }
  async request(route: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set("cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(`${origin}${route}`, { ...options, headers, redirect: "manual", signal: options.signal ?? AbortSignal.timeout(90_000) });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";")[0]; const separator = pair.indexOf("=");
      this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }
  async login(email: string, password: string, authenticationProof?: string, impersonateToken?: string) {
    const csrfResponse = await this.request("/api/auth/csrf");
    const csrf: unknown = await csrfResponse.json();
    if (typeof csrf !== "object" || !csrf || !("csrfToken" in csrf) || typeof csrf.csrfToken !== "string") throw new Error("Contrato CSRF inválido.");
    return this.request("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" }, body: new URLSearchParams({ email, password, csrfToken: csrf.csrfToken, callbackUrl: `${origin}/select-workspace`, ...(authenticationProof ? { authenticationProof } : {}), ...(impersonateToken ? { impersonateToken } : {}) }) });
  }
  async userId() {
    const response = await this.request("/api/auth/session");
    const body: unknown = await response.json();
    if (typeof body !== "object" || !body || !("user" in body) || typeof body.user !== "object" || !body.user || !("id" in body.user)) return null;
    return body.user.id;
  }
  async serverAction(name: "getSetupInfo" | "setupPassword" | "selectActiveWorkspace" | "createWorkspace", args: unknown[]) {
    const manifest: unknown = JSON.parse(readFileSync(".tmp/gym-http-app/.next/dev/server/server-reference-manifest.json", "utf8"));
    if (typeof manifest !== "object" || !manifest || !("node" in manifest) || typeof manifest.node !== "object" || !manifest.node) throw new Error("Manifest de ações locais indisponível.");
    const actions = Object.entries(manifest.node).filter(([, value]) => typeof value === "object" && value !== null && "exportedName" in value && value.exportedName === name);
    if (actions.length !== 1) throw new Error("Ação local não identificada de forma única.");
    const response = await this.request(name === "createWorkspace" ? "/personal/academy" : name === "selectActiveWorkspace" ? "/select-workspace" : "/auth/setup-password", { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", "Next-Action": actions[0][0], Origin: origin || "" }, body: JSON.stringify(args) });
    const text = await response.text();
    for (const line of text.split("\n")) {
      const value = line.slice(line.indexOf(":") + 1).trim(); if (!value.startsWith("{")) continue;
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && ("success" in parsed || "error" in parsed)) return { status: response.status, result: parsed };
    }
    throw new Error(`Resposta de Server Action fora do contrato (HTTP ${response.status}).`);
  }
}

describe("HTTP privacidade e saúde completo", () => {
  it("atende o direito após licença encerrada sem habilitar operação comercial; página independente mantém a fila", async () => {
    const f = await privacyFixture();
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "CANCELED" } });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { isActive: false } });
    const submitted = await f.post(f.studentBrowser, "/api/user/privacy", { workspaceId: f.workspace.id, type: "ACCESS", notes: "Acesso solicitado após encerramento comercial." });
    expect(submitted.status).toBe(201); const requestId = (await submitted.json()).request.id;
    expect((await f.ownerBrowser.request(`/api/gym/privacy/requests?workspaceId=${f.workspace.id}`)).status).toBe(200);
    expect((await f.post(f.ownerBrowser, "/api/gym/privacy/requests", { workspaceId: f.workspace.id, requestId, command: { action: "START_REVIEW" } })).status).toBe(200);
    const exported = await f.post(f.ownerBrowser, "/api/gym/privacy/export", { workspaceId: f.workspace.id, targetUserId: f.student.user.id, requestId }); expect(exported.status).toBe(200);
    expect((await exported.json()).data.attachmentManifest.complete).toBe(true);
    expect((await f.post(f.ownerBrowser, "/api/gym/privacy/export", { workspaceId: f.workspace.id, targetUserId: f.student.user.id })).status).toBe(403);
    const page = await f.ownerBrowser.request(`/account/gym-privacy?workspaceId=${f.workspace.id}`); expect(page.status).toBe(200); expect(await page.text()).toContain("Atendimento de privacidade");
  });
  async function privacyFixture() {
    const owner = await account(), student = await account();
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("1990-01-15"), medicalConditions: "SAUDE_GLOBAL_HTTP", weight: 99 } });
    const workspace = await prisma.workspace.create({ data: { ownerId: owner.user.id, name: "Privacidade HTTP", slug: randomUUID(), type: "GYM", subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } } } });
    await prisma.workspaceMember.create({ data: { userId: owner.user.id, workspaceId: workspace.id, role: "OWNER" } });
    const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade HTTP" } });
    const member = await prisma.workspaceMember.create({ data: { userId: student.user.id, workspaceId: workspace.id, unitId: unit.id, role: "STUDENT", studentProfile: { create: {} } } });
    const ownerBrowser = await authenticated(owner), studentBrowser = await authenticated(student);
    ownerBrowser.setWorkspaceCookie(workspace.id); studentBrowser.setWorkspaceCookie(workspace.id);
    const post = (browser: BrowserSession, route: string, body: unknown) => browser.request(route, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify(body) });
    return { owner, student, workspace, unit, member, ownerBrowser, studentBrowser, post };
  }
  it("settings não expõe segredos e grava medidas locais; seleção estrangeira e boolean de aceite não contornam onboarding", async () => {
    const f = await privacyFixture();
    const evaluations = `/api/gym/students/${f.member.id}/evaluations`;
    expect((await f.post(f.ownerBrowser, evaluations, { workspaceId: f.workspace.id, type: "POSTURAL", weight: true, height: 170 })).status).toBe(400);
    expect((await f.post(f.ownerBrowser, evaluations, { workspaceId: f.workspace.id, type: "POSTURAL", weight: "70", height: "170", notes: "Registro exclusivamente sintético." })).status).toBe(201);
    const otherOrigin = await f.ownerBrowser.request(evaluations, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.invalid" }, body: JSON.stringify({ workspaceId: f.workspace.id, type: "POSTURAL", weight: 70, height: 170 }) }); expect(otherOrigin.status).toBe(403);
    const patch = await f.studentBrowser.request("/api/student/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updatePhysical", weight: "71", height: "172", bodyFat: "15", muscleMass: "30" }) }); expect(patch.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: f.student.user.id } })).toMatchObject({ weight: 99, medicalConditions: "SAUDE_GLOBAL_HTTP" });
    const settings = await f.studentBrowser.request("/api/student/settings"); expect(settings.status).toBe(200); const profile = await settings.json(); expect(profile.physicalData).toMatchObject({ weight: 71, height: 172 }); expect(JSON.stringify(profile)).not.toMatch(/SAUDE_GLOBAL_HTTP|password|twoFactorSecret|setupToken/);
    const updated = await f.studentBrowser.request("/api/student/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateProfile", name: "Titular HTTP", objective: "Objetivo local HTTP" }) }); expect(updated.status).toBe(200); expect(JSON.stringify(await updated.json())).not.toMatch(/password|twoFactorSecret|setupToken/);
    const onboard = await f.post(f.studentBrowser, "/api/student/onboarding", { medicalConditions: "INTAKE_HTTP", weight: "70", acceptedTerms: true, acceptedPrivacy: true }); expect(onboard.status).toBe(409);
    expect(await prisma.legalAcceptance.count({ where: { userId: f.student.user.id } })).toBe(0);
    f.studentBrowser.setWorkspaceCookie("workspace-forjado"); expect((await f.studentBrowser.request("/api/student/settings")).status).toBe(404);
    expect(await prisma.studentProgress.count({ where: { workspaceId: f.workspace.id, studentId: f.student.user.id } })).toBe(1);
  });
  it("pedido do próprio titular é local e mínimo; fila exige gestão, origem correta e execução fundamentada", async () => {
    const f = await privacyFixture();
    const submitted = await f.post(f.studentBrowser, "/api/user/privacy", { workspaceId: f.workspace.id, type: "DELETION", notes: "Pedido sintético HTTP" }); expect(submitted.status).toBe(201); const request = (await submitted.json()).request;
    expect(request.id).toBeTruthy(); expect(JSON.stringify(request)).not.toMatch(/metadata|tokenHash|identityEvidenceReference/);
    const queue = `/api/gym/privacy/requests?workspaceId=${f.workspace.id}`;
    expect((await f.studentBrowser.request(queue)).status).toBe(403); const listing = await f.ownerBrowser.request(queue); expect(listing.status).toBe(200); expect((await listing.json()).requests).toMatchObject([{ id: request.id, identityVerified: true }]);
    const rejected = await f.ownerBrowser.request("/api/gym/privacy/requests", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.invalid" }, body: JSON.stringify({ workspaceId: f.workspace.id, requestId: request.id, command: { action: "START_REVIEW" } }) }); expect(rejected.status).toBe(403);
    const retain = { action: "RETAIN", reason: "Retenção fundamentada sintética, sujeita a revisão", reviewAt: new Date(Date.now() + 86400000).toISOString() };
    const deleted = { action: "DELETE", reason: "Eliminação solicitada dos registros locais" };
    const result = await f.post(f.ownerBrowser, "/api/gym/privacy/requests", { workspaceId: f.workspace.id, requestId: request.id, command: { action: "DECIDE_DELETION", response: "Pedido atendido localmente, com retenções fundamentadas", decision: { health: deleted, training: deleted, files: deleted, membership: retain, contractsAndFinance: retain, legalAndAudit: retain, communications: retain, globalIdentityAndOtherControllers: retain } } }); expect(result.status).toBe(200); expect((await result.json()).data).toMatchObject({ status: "PARTIALLY_COMPLETED", completed: true });
    const blocked = await f.studentBrowser.request("/api/student/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updatePhysical", weight: 71 }) }); expect(blocked.status).toBe(409);
    const own = await f.studentBrowser.request("/api/user/privacy"); expect(own.status).toBe(200); const ownBody = await own.json(); expect(ownBody.requests).toMatchObject([{ id: request.id, status: "PARTIALLY_COMPLETED", response: "Pedido atendido localmente, com retenções fundamentadas" }]); expect(JSON.stringify(ownBody.requests)).not.toMatch(/metadata|tokenHash|identityEvidenceReference/);
    expect(await prisma.user.findUnique({ where: { id: f.student.user.id } })).toMatchObject({ medicalConditions: "SAUDE_GLOBAL_HTTP" });
  });
  it("consulta opaca, convite e login do titular antecedem vínculo; uso em outra unidade ou conta é recusado", async () => {
    const f = await privacyFixture(); const existing = await account(); await prisma.user.update({ where: { id: existing.user.id }, data: { birthDate: new Date("1990-01-15") } }); const own = await authenticated(existing);
    const duplicate = await f.ownerBrowser.request("/api/gym/students/check-duplicate", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify({ workspaceId: f.workspace.id, unitId: f.unit.id, email: existing.email }) }); expect(duplicate.status).toBe(200); const lookup = await duplicate.json(); expect(lookup.user.id).not.toBe(existing.user.id); expect(JSON.stringify(lookup)).not.toContain(existing.email);
    const issued = await f.post(f.ownerBrowser, "/api/gym/students/identity-link", { workspaceId: f.workspace.id, unitId: f.unit.id, targetUserId: lookup.user.id, email: existing.email }); expect(issued.status).toBe(200); const invitation = await issued.json(); const token = new URL(invitation.path, origin).searchParams.get("token")!;
    expect((await f.post(f.studentBrowser, "/api/user/gym-link", { requestId: invitation.requestId, token, accepted: true })).status).toBe(403);
    expect((await f.post(own, "/api/user/gym-link", { requestId: invitation.requestId, token, accepted: true })).status).toBe(200);
    const payload = { workspaceId: f.workspace.id, unitId: f.unit.id, existingUserId: existing.user.id, email: existing.email, idempotencyKey: randomUUID(), identityLinkProofId: invitation.requestId };
    const registered = await f.post(f.ownerBrowser, "/api/gym/students", payload); expect(registered.status).toBe(201); expect(await registered.json()).toMatchObject({ userId: existing.user.id });
    expect((await f.post(own, "/api/user/gym-link", { requestId: invitation.requestId, token, accepted: true })).status).toBe(403);
    const ownPrivacy = await own.request("/api/user/privacy"); expect(JSON.stringify((await ownPrivacy.json()).requests)).not.toMatch(/GYM_IDENTITY_LINK|tokenHash|verifiedBy/);
  });
});

async function account(role: "USER" | "SUPERADMIN" = "USER", mfa = false) {
  const password = "senha-http-sintetica";
  const user = await prisma.user.create({ data: { email: `http-${randomUUID()}@example.invalid`, name: "Teste HTTP", password: await bcrypt.hash(password, 10), role, twoFactorEnabled: mfa } });
  if (!user.email) throw new Error("Fixture sem email.");
  return { user, email: user.email, password };
}
async function authenticated(subject: Awaited<ReturnType<typeof account>>) {
  const policy = await resolveAuthenticationPolicy(subject.user.id);
  if (!policy) throw new Error("Fixture sem política.");
  const proof = await issueCredentialProof(subject.user.id, policy.user.password || "", authenticationPolicyKey(policy));
  const browser = new BrowserSession();
  await browser.login(subject.email, subject.password, proof);
  expect(await browser.userId()).toBe(subject.user.id);
  return browser;
}

async function entitlePersonalForTest(browser: BrowserSession, userId: string, workspaceId: string) {
  await prisma.freeTrial.create({ data: { userId, isActive: true, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 7 * 86400000) } });
  browser.setWorkspaceCookie(workspaceId);
}

async function academy(subject: Awaited<ReturnType<typeof account>>) {
  return prisma.workspace.create({ data: { type: "GYM", name: "Academia HTTP", slug: `http-gym-${randomUUID()}`, ownerId: subject.user.id, members: { create: { userId: subject.user.id, role: "OWNER" } }, units: { create: { name: "Unidade HTTP" } }, subscription: { create: { status: "ACTIVE", maxStudents: 10 } } } });
}

describe("HTTP sete tópicos de autoridade", () => {
  it("chat não lista outra unidade e evolução própria revalida a licença na sessão existente", async () => {
    const owner = await account(), manager = await account(), student = await account(), other = await account();
    const gym = await academy(owner); const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: gym.id } });
    const b = await prisma.gymUnit.create({ data: { workspaceId: gym.id, name: "Outra unidade de chat" } });
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: manager.user.id, role: "MANAGER", unitId: a.id } });
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: other.user.id, role: "TRAINER", unitId: b.id } });
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("1990-01-15") } });
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: student.user.id, role: "STUDENT", unitId: a.id, studentProfile: { create: {} } } });
    const browser = await authenticated(manager);
    const contactsResponse = await browser.request(`/api/chat/contacts?workspaceId=${gym.id}`); expect(contactsResponse.status).toBe(200);
    const contacts = await contactsResponse.json();
    expect(contacts.map((contact: { id: string }) => contact.id)).toContain(student.user.id);
    expect(contacts.map((contact: { id: string }) => contact.id)).not.toContain(other.user.id);
    expect((await browser.request("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: gym.id, targetUserId: other.user.id }) })).status).toBe(403);
    expect(await prisma.conversation.count({ where: { workspaceId: gym.id } })).toBe(0);
    const learner = await authenticated(student); learner.setWorkspaceCookie(gym.id);
    const progress = () => learner.request("/api/student/evolution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logProgress", weight: "75.5" }) });
    expect((await progress()).status).toBe(200);
    expect(await prisma.studentProgress.count({ where: { workspaceId: gym.id, studentId: student.user.id } })).toBe(1);
    await prisma.workspaceSubscription.update({ where: { workspaceId: gym.id }, data: { status: "EXPIRED" } });
    // The shared membership query hides an ineligible tenant before the write handler.
    expect((await progress()).status).toBe(404);
    expect(await prisma.studentProgress.count({ where: { workspaceId: gym.id, studentId: student.user.id } })).toBe(1);
  });
  it("sessão existente e superadmin operacional obedecem suspensão/licença; recuperação administrativa funciona", async () => {
    const owner = await account(); const admin = await account("SUPERADMIN");
    const gym = await academy(owner); const browser = await authenticated(owner); const administration = await authenticated(admin);
    expect((await browser.request(`/api/gym/staff?workspaceId=${gym.id}`)).status).toBe(200);
    const change = (value: object) => administration.request(`/api/superadmin/workspaces/${gym.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
    expect((await change({ isActive: false, expectedIsActive: true })).status).toBe(200);
    for (const client of [browser, administration]) {
      const denied = await client.request(`/api/gym/staff?workspaceId=${gym.id}`);
      expect(denied.status).toBe(403); expect(await denied.json()).toMatchObject({ error: { code: "WORKSPACE_SUSPENDED" } });
    }
    expect((await administration.request(`/api/superadmin/workspaces/${gym.id}`)).status).toBe(200);
    expect((await change({ isActive: true, expectedIsActive: false })).status).toBe(200);
    await prisma.workspaceSubscription.update({ where: { workspaceId: gym.id }, data: { status: "TRIAL", trialEndsAt: new Date(Date.now() - 1000) } });
    const expired = await browser.request(`/api/gym/staff?workspaceId=${gym.id}`);
    expect(expired.status).toBe(403); expect(await expired.json()).toMatchObject({ error: { code: "INVALID_STATUS" } });
    expect((await administration.request(`/api/superadmin/workspaces/${gym.id}/gym-config`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: { status: "ACTIVE" } }) })).status).toBe(200);
    expect((await browser.request(`/api/gym/staff?workspaceId=${gym.id}`)).status).toBe(200);
  });
  it("gestor legado só consulta e concede na unidade original; catálogo compartilhado não concede gestão global", async () => {
    const owner = await account(); const manager = await account(); const gym = await academy(owner);
    const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: gym.id } });
    const b = await prisma.gymUnit.create({ data: { workspaceId: gym.id, name: "Unidade HTTP protegida" } });
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: manager.user.id, role: "MANAGER", unitId: a.id } });
    const browser = await authenticated(manager);
    const roster = await browser.request(`/api/gym/staff?workspaceId=${gym.id}`); expect(roster.status).toBe(200);
    expect((await browser.request(`/api/gym/plans?workspaceId=${gym.id}`)).status).toBe(200);
    expect((await browser.request(`/api/gym/staff?workspaceId=${gym.id}&unitId=${b.id}`)).status).toBe(403);
    const invite = (unitId?: string) => browser.request("/api/gym/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: gym.id, unitId, email: `${randomUUID()}@example.invalid`, role: "TRAINER" }) });
    expect((await invite()).status).toBe(403); expect((await invite(b.id)).status).toBe(403); expect((await invite(a.id)).status).toBe(201);
    const plan = await browser.request("/api/gym/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: gym.id, name: "Plano indevido", priceInCents: 100, billingCycle: "MONTHLY", termsText: "Termos sintéticos" }) });
    expect(plan.status).toBe(403); expect(await prisma.gymPlan.count({ where: { workspaceId: gym.id } })).toBe(0);
  });
  it("impersonação mantém executor real na auditoria, nega ator forjado e respeita revogação do administrador", async () => {
    const owner = await account(); const admin = await account("SUPERADMIN"); const gym = await academy(owner);
    const { token } = await issueImpersonationStart(admin.user, { targetUserId: owner.user.id, reason: "Ensaio sintético de auditoria" });
    const support = new BrowserSession(); await support.login(owner.email, "", undefined, token); expect(await support.userId()).toBe(owner.user.id);
    const input = { workspaceId: gym.id, name: "Plano de suporte HTTP", priceInCents: 1000, billingCycle: "MONTHLY", termsText: "Condições exclusivamente sintéticas" };
    const request = (body: object) => support.request("/api/gym/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await request({ ...input, actorUserId: owner.user.id })).status).toBe(400);
    const created = await request(input); expect(created.status).toBe(201);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: gym.id, action: { startsWith: "GYM_PLAN_CREATED:" } }, orderBy: { createdAt: "desc" } });
    expect(audit.userId).toBe(admin.user.id);
    expect(audit.metadata).toMatchObject({ actorUserId: admin.user.id, effectiveUserId: owner.user.id, impersonated: true, phase: "LOCAL_COMMIT" });
    expect(JSON.stringify(audit.metadata)).not.toContain(token);
    await prisma.user.update({ where: { id: admin.user.id }, data: { sessionVersion: { increment: 1 } } });
    expect((await request(input)).status).toBe(401);
    expect(await prisma.gymPlan.count({ where: { workspaceId: gym.id } })).toBe(1);
  });
});

describe("HTTP política aprovada de matrícula", () => {
  it("ativa uma matrícula, rejeita segunda e suspende emissão na pausa mantendo dívida e replay", async () => {
    const owner = await account(); const student = await account();
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("1990-01-15"), cpfCnpj: "12345678909", whatsapp: "11900000000" } });
    const gym = await academy(owner); const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: gym.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: student.user.id, unitId: unit.id, role: "STUDENT", studentProfile: { create: {} } } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: gym.id, name: "Plano HTTP de política", versions: { create: { name: "Plano HTTP", termsText: "Contrato exclusivamente sintético HTTP", priceInCents: BigInt(10000), durationDays: 365 } } }, include: { versions: true } });
    const createPending = () => prisma.gymEnrollment.create({ data: { workspaceId: gym.id, studentMemberId: member.id, planVersionId: plan.versions[0].id, unitId: unit.id, priceInCents: BigInt(10000), status: "PENDING_ACTIVATION", startDate: new Date(Date.now() - 60000), endDate: new Date(Date.now() + 365 * 86400000), nextDueDate: new Date(), subscriptionStatus: "ACTIVE", acceptance: { create: { workspaceId: gym.id, signerUserId: student.user.id, termsSnapshot: "Aceite HTTP sintético", termsVersion: "1" } } } });
    const a = await createPending(), b = await createPending(); const browser = await authenticated(owner);
    const post = (path: string, value: object) => browser.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: gym.id, ...value }) });
    expect((await post(`/api/gym/enrollments/${a.id}/activate`, { overrideReason: "Liberação exclusivamente sintética" })).status).toBe(200);
    const second = await post(`/api/gym/enrollments/${b.id}/activate`, { overrideReason: "Outra liberação sintética" });
    expect(second.status).toBe(409); expect(await second.json()).toMatchObject({ error: { code: "ACTIVE_ENROLLMENT_EXISTS" } });
    const independent = await post("/api/gym/enrollments", { studentMemberId: member.id, planVersionId: plan.versions[0].id });
    expect(independent.status).toBe(409); expect(await independent.json()).toMatchObject({ error: { code: "ACTIVE_ENROLLMENT_EXISTS" } });
    const cycle = `/api/gym/enrollments/${a.id}/subscription/cycle`;
    const initial = await post(cycle, {}); expect(initial.status).toBe(200); const first = await initial.json();
    const state = await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: a.id } });
    const paused = await post(`/api/gym/enrollments/${a.id}/pause`, { startDate: new Date(Date.now() - 60000).toISOString(), endDate: new Date(Date.now() + 3600000).toISOString(), reason: "Pausa HTTP sintética", extendEndDate: true });
    expect(paused.status).toBe(200); expect(await paused.json()).toMatchObject({ status: "PAUSED", accessGranted: false });
    const refused = await post(cycle, {}); expect(refused.status).toBe(409); expect(await refused.json()).toMatchObject({ error: { code: "BILLING_PAUSED" } });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: a.id } })).toMatchObject({ cycleCount: state.cycleCount, nextDueDate: state.nextDueDate });
    const replay = await post(cycle, { dueDate: first.dueDate }); expect(replay.status).toBe(200); expect(await replay.json()).toMatchObject({ invoiceId: first.invoiceId });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: a.id } })).toBe(1);
    expect(await prisma.gymInvoice.findUnique({ where: { id: first.invoiceId } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });
  });
});

describe("HTTP reaceite próprio", () => {
  async function legalFixture(test: (subject: Awaited<ReturnType<typeof account>>, browser: BrowserSession, body: Record<string, unknown>, docId: string) => Promise<void>) {
    const subject = await account();
    const content = "Termos exclusivamente sintéticos HTTP de reaceite próprio.";
    const doc = await prisma.legalDocument.create({ data: { type: "TERMS", title: "Termos sintéticos HTTP", version: randomUUID(), content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } });
    try { await test(subject, await authenticated(subject), { documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash, accepted: true }, doc.id); }
    finally {
      await prisma.auditLog.deleteMany({ where: { userId: subject.user.id } });
      await prisma.legalAcceptance.deleteMany({ where: { userId: subject.user.id } });
      await prisma.legalDocument.delete({ where: { id: doc.id } });
      await prisma.user.delete({ where: { id: subject.user.id } });
    }
  }
  it("exige sessão, origem confiável, JSON limitado e contrato estrito", async () => legalFixture(async (subject, browser, body) => {
    const send = (value: unknown, headers: Record<string, string> = { "Content-Type": "application/json" }) => browser.request("/api/user/privacy/accept", { method: "POST", headers, body: typeof value === "string" ? value : JSON.stringify(value) });
    expect((await new BrowserSession().request("/api/user/privacy/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status).toBe(401);
    expect((await send(body, { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await send(body, { "Content-Type": "application/json", Origin: "https://foreign.example.invalid" })).status).toBe(403);
    expect((await send(body, { "Content-Type": "application/json", "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await send("{")).status).toBe(400);
    expect((await send(" ".repeat(4097))).status).toBe(413);
    for (const value of [{ documentType: body.documentType, documentVersion: body.documentVersion }, { ...body, accepted: false }, { ...body, representedUserId: subject.user.id }]) expect((await send(value)).status).toBe(400);
    expect(await prisma.legalAcceptance.count({ where: { userId: subject.user.id } })).toBe(0);
  }));
  it("hash antigo retorna 409; confirmação atual e repetição mantêm um aceite e uma auditoria", async () => legalFixture(async (subject, browser, body, docId) => {
    const send = (input: unknown) => browser.request("/api/user/privacy/accept", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify(input) });
    const content = "Nova versão exclusivamente sintética HTTP com o mesmo ID.";
    const hash = calculateDocumentHash(content);
    await prisma.legalDocument.update({ where: { id: docId }, data: { content, contentHash: hash } });
    expect((await send(body)).status).toBe(409);
    expect(await prisma.legalAcceptance.count({ where: { userId: subject.user.id } })).toBe(0);
    const current = { ...body, documentHash: hash };
    const responses = await Promise.all([send(current), send(current)]);
    for (const response of responses) { expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); }
    const results = await Promise.all(responses.map(r => r.json()));
    expect(results[0].acceptance.id).toBe(results[1].acceptance.id);
    expect(await prisma.legalAcceptance.count({ where: { userId: subject.user.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { userId: subject.user.id, action: "USER_LEGAL_REACCEPTED" } })).toBe(1);
  }));
  it("sessão de suporte não registra aceite próprio pelo titular", async () => legalFixture(async (subject, _browser, body) => {
    const admin = await account("SUPERADMIN"); const { token } = await issueImpersonationStart(admin.user, { targetUserId: subject.user.id, reason: "Ensaio sintético de aceite" });
    try {
      const support = new BrowserSession(); await support.login(subject.email, "", undefined, token);
      expect(await support.userId()).toBe(subject.user.id);
      expect((await support.request("/api/user/privacy/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status).toBe(403);
      expect(await prisma.legalAcceptance.count({ where: { userId: subject.user.id } })).toBe(0);
    } finally {
      await prisma.verificationToken.deleteMany({ where: { token: createHash("sha256").update(token).digest("hex") } });
      await prisma.auditLog.deleteMany({ where: { userId: admin.user.id } });
      await prisma.user.delete({ where: { id: admin.user.id } });
    }
  }));
});

describe("HTTP portal do responsável", () => {
  async function family() {
    const parent = await account(); const owner = await account(); const student = await account();
    await prisma.user.update({ where: { id: parent.user.id }, data: { cpfCnpj: "12345678909", birthDate: new Date("1990-01-15") } });
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("2013-01-15"), medicalConditions: "saude-privada-nao-exportar" } });
    const workspace = await academy(owner); const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.user.id, unitId: unit.id, role: "STUDENT", isMinor: false, studentProfile: { create: { medicalClearance: true } }, roleGrants: { create: { role: "STUDENT", unitId: unit.id } } } });
    const guardian = await prisma.gymGuardian.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, guardianUserId: parent.user.id, cpf: "12345678909", name: "Responsável HTTP", phone: "11900000000", relationship: "MAE", verifiedAt: new Date(), isFinancialResponsible: true, isLegalRepresentative: false, hasHealthAccess: false } });
    return { parent, owner, student, workspace, unit, member, guardian };
  }
  it("consulta financeira exige poder próprio e exclui outras academias; revogação retira leitura na mesma sessão", async () => {
    const f = await family(); const browser = await authenticated(f.parent);
    const amount = BigInt("9007199254740993");
    await prisma.gymSettings.create({ data: { workspaceId: f.workspace.id, maxReceptionistDiscountInCents: BigInt("9223372036854775807"), requireGuardianSignature: true } });
    await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, studentUserId: f.student.user.id, invoiceNumber: randomUUID(), title: "Mensalidade do dependente HTTP", dueDate: new Date(), subtotalInCents: amount, totalInCents: amount, balanceRemainingInCents: amount, payerName: "Pagador-nao-exportar", createdByUserId: f.owner.user.id } });
    const route = `/api/guardian/dependents/${f.guardian.id}/finance?workspaceId=${f.workspace.id}`;
    expect((await new BrowserSession().request(route)).status).toBe(401);
    const listing = await browser.request("/api/guardian/dependents"); expect(listing.status).toBe(200);
    const rows = await listing.json(); expect(rows).toHaveLength(1);
    expect(rows[0].workspace.settings).toEqual({ requireGuardianSignature: true });
    expect(JSON.stringify(rows)).not.toContain("maxReceptionistDiscountInCents");
    expect(guardianDependentSchema.parse(rows[0])).toMatchObject({ contracts: [], student: { isMinor: true, birthDate: null, medicalClearance: null }, powers: { isFinancialResponsible: true, isLegalRepresentative: false } });
    const response = await browser.request(route); expect(response.status).toBe(200);
    expect(gymStatementSchema.parse(await response.json())).toMatchObject({ workspaceId: f.workspace.id, totals: { outstandingInCents: amount.toString(), receivedInCents: "0", overdueInCents: "0" }, invoices: [{ title: "Mensalidade do dependente HTTP", totalInCents: amount.toString(), overdue: false }] });
    const another = await academy(f.owner);
    expect((await browser.request(`/api/guardian/dependents/${f.guardian.id}/finance?workspaceId=${another.id}`)).status).toBe(403);
    expect((await browser.request(route + "&page=0")).status).toBe(400);
    expect((await browser.request(route + "&userId=" + f.student.user.id)).status).toBe(400);
    expect((await browser.request(`/api/guardian/dependents/${f.guardian.id}/accept-terms?workspaceId=${f.workspace.id}&documentType=TERMS`)).status).toBe(403);
    const text = JSON.stringify(rows); expect(text).not.toMatch(/password|saude-privada|12345678909|verificationNotes|medicalConditions/);
    const screen = await browser.request("/guardian/dependents"); expect(screen.status).toBe(200);
    const html = await screen.text(); expect(html).toContain("Portal do Responsável"); expect(html).toContain("data-slot=\"skeleton\"");
    await prisma.gymGuardian.update({ where: { id: f.guardian.id }, data: { isFinancialResponsible: false, isLegalRepresentative: true } });
    expect((await browser.request(route)).status).toBe(403); // Legal power does not restore financial power.
    await prisma.gymGuardian.update({ where: { id: f.guardian.id }, data: { revokedAt: new Date() } });
    expect((await browser.request(route)).status).toBe(403);
    expect(await (await browser.request("/api/guardian/dependents")).json()).toEqual([]);
  });
  it("documento exibido exige hash atual, ciência de privacidade é única e perde autoridade na maioridade", async () => {
    const f = await family(); await prisma.gymGuardian.update({ where: { id: f.guardian.id }, data: { isLegalRepresentative: true } });
    const browser = await authenticated(f.parent); const route = `/api/guardian/dependents/${f.guardian.id}/accept-terms`;
    const content = "Política de privacidade exclusivamente sintética HTTP.";
    const document = await prisma.legalDocument.create({ data: { type: "PRIVACY", title: "Privacidade HTTP", version: randomUUID(), content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } });
    const shownResponse = await browser.request(`${route}?workspaceId=${f.workspace.id}&documentType=PRIVACY`); expect(shownResponse.status).toBe(200);
    const shown = guardianLegalDocumentSchema.parse(await shownResponse.json()); expect(shown).toMatchObject({ id: document.id, acceptedAt: null, documentHash: document.contentHash });
    const body = { workspaceId: f.workspace.id, documentType: "PRIVACY", documentId: shown.id, documentHash: shown.documentHash, accepted: true };
    const send = (data: object) => browser.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const admin = await account("SUPERADMIN"); const { token: impersonateToken } = await issueImpersonationStart(admin.user, { targetUserId: f.parent.user.id, reason: "Ensaio sintético de responsável" });
    const support = new BrowserSession(); await support.login(f.parent.email, "", undefined, impersonateToken); expect(await support.userId()).toBe(f.parent.user.id);
    expect((await support.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status).toBe(403);
    expect(await prisma.legalAcceptance.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect((await send({ ...body, documentHash: undefined })).status).toBe(400);
    const changed = content + " Texto revisado.";
    await prisma.legalDocument.update({ where: { id: document.id }, data: { content: changed, contentHash: calculateDocumentHash(changed) } });
    expect((await send(body)).status).toBe(409);
    expect(await prisma.legalAcceptance.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    const refreshed = guardianLegalDocumentSchema.parse(await (await browser.request(`${route}?workspaceId=${f.workspace.id}&documentType=PRIVACY`)).json());
    const current = { ...body, documentHash: refreshed.documentHash };
    expect((await send(current)).status).toBe(201); expect((await send(current)).status).toBe(201);
    expect(await prisma.legalAcceptance.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.legalAcceptance.findFirst({ where: { workspaceId: f.workspace.id } })).toMatchObject({ acceptanceType: "PRIVACY_ACKNOWLEDGED", representedUserId: f.student.user.id, documentHash: refreshed.documentHash });
    const accepted = guardianLegalDocumentSchema.parse(await (await browser.request(`${route}?workspaceId=${f.workspace.id}&documentType=PRIVACY`)).json()); expect(accepted.acceptedAt).not.toBeNull();
    expect(await prisma.gymEnrollment.count({ where: { workspaceId: f.workspace.id } })).toBe(0); expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    await prisma.user.update({ where: { id: f.student.user.id }, data: { birthDate: new Date("1990-01-15") } });
    expect((await send(current)).status).toBe(403);
    expect(await (await browser.request("/api/guardian/dependents")).json()).toEqual([]);
  });
});

describe("HTTP financeiro SuperAdmin", () => {
  it("calcula recorrência ativa, bloqueia cálculo operacional na academia suspensa e mantém licença separada", async () => {
    const admin = await account("SUPERADMIN"); const owner = await account();
    const workspace = await academy(owner);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const student = await account();
    const member = await prisma.workspaceMember.create({ data: { userId: student.user.id, workspaceId: workspace.id, unitId: unit.id, role: "STUDENT", studentProfile: { create: {} }, roleGrants: { create: { role: "STUDENT" } } } });
    await prisma.workspaceMember.create({ data: { userId: (await account()).user.id, workspaceId: workspace.id, isActive: false, role: "STUDENT", studentProfile: { create: {} } } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano HTTP" } });
    const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Anual HTTP", priceInCents: BigInt(12001), billingCycle: "ANNUAL", durationDays: 365, termsText: "Termos sintéticos" } });
    const now = new Date();
    await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, unitId: unit.id, studentMemberId: member.id, planVersionId: version.id, status: "ACTIVE", priceInCents: BigInt(12001), startDate: new Date(now.getTime() - 86400000), endDate: new Date(now.getTime() + 365 * 86400000), activatedAt: new Date(now.getTime() - 86400000) } });
    await prisma.workspacePayment.createMany({ data: ["pago", "pendente", "atrasado"].map(status => ({ workspaceId: workspace.id, studentName: "Legado HTTP", planName: "Legado", amount: 990000, status, method: "PIX" })) });
    const browser = await authenticated(admin);
    const activeResponse = await browser.request(`/api/superadmin/workspaces/${workspace.id}`);
    expect(activeResponse.status).toBe(200);
    expect(await activeResponse.json()).toMatchObject({ mrr: 10, gymFinancialOverview: { executive: { mrrInCents: 1000, activeStudentsCount: 1, activeRecurringContracts: 1 } } });
    await prisma.workspace.update({ where: { id: workspace.id }, data: { isActive: false } });
    const response = await browser.request(`/api/superadmin/workspaces/${workspace.id}`);
    expect(response.status).toBe(200);
    const detail = await response.json();
    expect(detail).toMatchObject({ mrr: null, studentsCount: 1, staffCount: 1, registeredPlansCount: 1, registeredWorkoutsCount: 0, isActive: false, gymFinancialOverview: null });
    expect(await prisma.gymEnrollment.findFirst({ where: { workspaceId: workspace.id } })).toMatchObject({ status: "ACTIVE", priceInCents: BigInt(12001) });
    expect(detail.payments).toHaveLength(3);
    expect(JSON.stringify(detail)).not.toContain(student.password);
    const personal = await prisma.workspace.create({ data: { ownerId: owner.user.id, type: "PERSONAL", name: "Personal independente", slug: randomUUID(), payments: { create: { studentName: "Aluno", planName: "Avulso", amount: 1000, status: "pago", method: "PIX" } } } });
    const personalResponse = await browser.request(`/api/superadmin/workspaces/${personal.id}`);
    expect(personalResponse.status).toBe(200);
    expect(await personalResponse.json()).toMatchObject({ mrr: null, gymFinancialOverview: null });
  });

  it("valida contratos HTTP, filtros e acesso sem expor campos de autenticação", async () => {
    const admin = await account("SUPERADMIN"); const owner = await account();
    await prisma.user.update({ where: { id: owner.user.id }, data: { medicalConditions: "saude-http-nao-exportar" } });
    await prisma.transaction.create({ data: { userId: owner.user.id, amount: 42.01, status: "approved", paymentMethod: "PIX" } });
    const browser = await authenticated(admin);
    const finance = await browser.request("/api/superadmin/finance");
    expect(finance.status).toBe(200);
    const summary = financeOverviewSchema.parse(await finance.json());
    expect(summary).toMatchObject({ ltv: null, churn: null, mrrHistory: [], snapshot: { basis: "CURRENT_CATALOG" } });
    const stats = await browser.request("/api/superadmin/stats"); expect(stats.status).toBe(200);
    expect(await stats.json()).toMatchObject({ financial: { knownMonthlyReferenceInCents: summary.knownMonthlyReferenceInCents }, financialGrowthData: [] });
    const route = `/api/superadmin/finance/transactions?userId=${owner.user.id}`;
    const response = await browser.request(route); expect(response.status).toBe(200);
    const listing = financeTransactionsSchema.parse(await response.json());
    expect(listing.pagination.total).toBe(1);
    expect(listing.data[0]).toMatchObject({ amount: 42.01, status: "APPROVED", user: { id: owner.user.id } });
    expect(JSON.stringify(listing)).not.toMatch(/password|saude-http-nao-exportar|sessionVersion|twoFactorSecret|abacateCustomerId/);
    for (const query of ["page=0", "limit=101", "status=paid", "dateRange=invalid"]) expect((await browser.request(`/api/superadmin/finance/transactions?${query}`)).status).toBe(400);
    const ordinary = await authenticated(owner);
    expect((await ordinary.request("/api/superadmin/finance")).status).toBe(401);
    expect((await ordinary.request(route)).status).toBe(401);
    for (const page of ["/superadmin/finance", "/superadmin/dashboard"]) {
      const screen = await browser.request(page); expect(screen.status).toBe(200);
      expect(await screen.text()).not.toContain("NEXT_ERROR");
    }
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: "USER", sessionVersion: { increment: 1 } } });
    expect((await browser.request("/api/superadmin/stats")).status).toBe(401);
    expect((await browser.request("/api/superadmin/finance")).status).toBe(401);
  });
});

describe("HTTP caixa interno por unidade", () => {
  it("valida contrato, conserva uma movimentação por tentativa e revoga leitura e retry sem promover papel local", async () => {
    const owner = await account(); const workspace = await academy(owner); const operator = await account();
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const second = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade protegida" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.user.id, role: "MANAGER", unitId: unit.id } });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, unitId: unit.id, role: "FINANCE" } });
    const cash = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unit.id, name: "Caixa HTTP", accountType: "CASH", balanceInCents: BigInt(1000) } });
    const bank = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unit.id, name: "Banco HTTP", accountType: "BANK_ACCOUNT", balanceInCents: BigInt(1000) } });
    const hidden = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: second.id, name: "Banco protegido", accountType: "BANK_ACCOUNT" } });
    await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, name: "Central protegida", accountType: "BANK_ACCOUNT" } });
    await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unit.id, name: "Legado externo", accountType: "GATEWAY_ONLINE" } });
    const browser = await authenticated(operator); browser.setWorkspaceCookie(workspace.id);
    const send = (route: string, body: object) => browser.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const accountRoute = `/api/gym/finance/accounts?workspaceId=${workspace.id}`;
    const drawerRoute = `/api/gym/finance/cash-drawer?workspaceId=${workspace.id}`;
    const accounts = await browser.request(accountRoute); expect(accounts.status).toBe(200);
    expect(await accounts.json()).toMatchObject({ accounts: expect.arrayContaining([expect.objectContaining({ id: cash.id })]), includeUnassigned: false });
    const listing = await browser.request(accountRoute); const listingText = await listing.text();
    expect(listingText).not.toContain(hidden.id); expect(listingText).not.toContain("GATEWAY_ONLINE");
    expect((await browser.request(`${drawerRoute}&status=INVALID`)).status).toBe(400);
    expect((await send("/api/gym/finance/accounts", { workspaceId: workspace.id, unitId: unit.id, name: "Wallet", accountType: "GATEWAY_ONLINE" })).status).toBe(400);
    expect((await send("/api/gym/finance/accounts", { workspaceId: workspace.id, name: "Global indevida", accountType: "CASH" })).status).toBe(403);
    expect((await send("/api/gym/finance/cash-drawer", { workspaceId: workspace.id, financialAccountId: cash.id, openingAmountInCents: "1000" })).status).toBe(400);
    const opened = await send("/api/gym/finance/cash-drawer", { workspaceId: workspace.id, financialAccountId: cash.id, openingAmountInCents: 1000 }); expect(opened.status).toBe(201);
    const session: unknown = await opened.json();
    if (typeof session !== "object" || session === null || !("id" in session) || typeof session.id !== "string") throw new Error("Abertura sem identificador.");
    const movement = { workspaceId: workspace.id, sessionId: session.id, idempotencyKey: randomUUID(), movementType: "BLEED", amountInCents: 100, destinationAccountId: bank.id };
    const receipts = await Promise.all([send("/api/gym/finance/cash-drawer/movements", movement), send("/api/gym/finance/cash-drawer/movements", movement)]);
    for (const receipt of receipts) expect(receipt.status).toBe(201);
    expect(await receipts[0].json()).toEqual(await receipts[1].json());
    expect((await send("/api/gym/finance/cash-drawer/movements", { ...movement, amountInCents: 101 })).status).toBe(409);
    const transfer = { workspaceId: workspace.id, fromAccountId: bank.id, toAccountId: cash.id, amountInCents: 50, idempotencyKey: randomUUID() };
    const transfers = await Promise.all([send("/api/gym/finance/transfers", transfer), send("/api/gym/finance/transfers", transfer)]);
    for (const response of transfers) expect(response.status).toBe(201);
    expect(await transfers[0].json()).toEqual(await transfers[1].json());
    expect((await send("/api/gym/finance/transfers", { ...transfer, toAccountId: hidden.id, idempotencyKey: randomUUID() })).status).toBe(403);
    expect((await send("/api/gym/finance/cash-drawer/close", { workspaceId: workspace.id, sessionId: session.id, actualCashInCents: 950 })).status).toBe(200);
    expect((await send("/api/gym/finance/cash-drawer/movements", movement)).status).toBe(201);
    expect((await send("/api/gym/finance/cash-drawer/movements", { ...movement, idempotencyKey: randomUUID() })).status).toBe(409);
    expect((await send("/api/gym/finance/cash-drawer/reconcile", { workspaceId: workspace.id, sessionId: session.id, reconciliationNotes: "sim" })).status).toBe(400);
    expect((await send("/api/gym/finance/cash-drawer/reconcile", { workspaceId: workspace.id, sessionId: session.id, reconciliationNotes: "Contagem conferida pelo responsável" })).status).toBe(200);
    expect(await prisma.gymCashDrawerMovement.count({ where: { sessionId: session.id, movementType: "BLEED" } })).toBe(1);
    expect((await prisma.gymFinancialAccount.findUniqueOrThrow({ where: { id: cash.id } })).balanceInCents).toBe(BigInt(950));
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    expect((await browser.request(accountRoute)).status).toBe(403); expect((await browser.request(drawerRoute)).status).toBe(403);
    expect((await send("/api/gym/finance/cash-drawer/movements", movement)).status).toBe(403);
    expect((await prisma.gymFinancialAccount.findUniqueOrThrow({ where: { id: cash.id } })).balanceInCents).toBe(BigInt(950));
  });
});

describe("HTTP administração de workspace", () => {
  it("listagem e detalhe refletem suspensão/reativação; baseline e papel revogado impedem alteração", async () => {
    const admin = await account("SUPERADMIN"); const owner = await account(); const workspace = await academy(owner);
    const browser = await authenticated(admin); const ordinary = await authenticated(owner); ordinary.setWorkspaceCookie(workspace.id);
    const route = `/api/superadmin/workspaces/${workspace.id}`;
    const patch = (body: object) => browser.request(route, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const listing = async () => {
      const response = await browser.request("/api/superadmin/workspaces"); expect(response.status).toBe(200);
      const body: unknown = await response.json(); if (!Array.isArray(body)) throw new Error("Listagem administrativa fora do contrato.");
      return body.find((entry: unknown) => typeof entry === "object" && entry !== null && "id" in entry && entry.id === workspace.id);
    };
    expect(await listing()).toMatchObject({ isActive: true });
    expect((await ordinary.request(route, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false, expectedIsActive: true }) })).status).toBe(401);
    expect((await patch({ isActive: "false", expectedIsActive: true })).status).toBe(400);
    expect((await patch({ type: "PERSONAL" })).status).toBe(409);
    const suspended = await patch({ isActive: false, expectedIsActive: true }); expect(suspended.status).toBe(200); expect(await suspended.json()).toMatchObject({ isActive: false });
    expect(await listing()).toMatchObject({ isActive: false });
    expect((await ordinary.request(`/api/gym/finance/invoices?workspaceId=${workspace.id}`)).status).toBe(403);
    expect((await patch({ isActive: true, expectedIsActive: true })).status).toBe(409);
    const resumed = await patch({ isActive: true, expectedIsActive: false }); expect(resumed.status).toBe(200); expect(await resumed.json()).toMatchObject({ isActive: true });
    expect(await listing()).toMatchObject({ isActive: true });
    expect((await ordinary.request(`/api/gym/finance/invoices?workspaceId=${workspace.id}`)).status).toBe(200);
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: "USER" } });
    expect((await patch({ isActive: false, expectedIsActive: true })).status).toBe(401);
    expect((await prisma.workspace.findUniqueOrThrow({ where: { id: workspace.id } })).isActive).toBe(true);
  });
});

describe("HTTP equipe e ingresso por unidade", () => {
  it("SSR e API isolam equipe; convite chega ao destinatário, aceite troca cookie e revogação atual nega a mesma sessão", async () => {
    const owner = await account(); const workspace = await academy(owner); const operator = await account();
    const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade B protegida" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.user.id, role: "MANAGER", unitId: a.id } });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "MANAGER", unitId: a.id } });
    const visibleUser = await account(); await prisma.user.update({ where: { id: visibleUser.user.id }, data: { name: "Profissional permitido HTTP" } });
    const visible = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: visibleUser.user.id, role: "TRAINER", unitId: a.id } });
    const hiddenUser = await account(); await prisma.user.update({ where: { id: hiddenUser.user.id }, data: { name: "Profissional sigiloso da unidade B HTTP" } });
    const hidden = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: hiddenUser.user.id, role: "TRAINER", unitId: b.id } });
    const browser = await authenticated(operator); browser.setWorkspaceCookie(workspace.id);
    const send = (route: string, body: object, method = "POST") => browser.request(route, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const route = `/api/gym/staff?workspaceId=${workspace.id}`;
    const listing = await browser.request(route); expect(listing.status).toBe(200);
    const listText = await listing.text(); expect(listText).toContain(visible.id); expect(listText).not.toContain(hidden.id); expect(listText).not.toContain('"password"'); expect(listText).not.toContain('"tokenHash"');
    const screen = await browser.request("/gym/staff"); expect(screen.status).toBe(200);
    const html = await screen.text(); expect(html).toContain("Profissional permitido HTTP"); expect(html).not.toContain("Profissional sigiloso da unidade B HTTP"); expect(html).not.toContain('"tokenHash"');
    expect((await browser.request(`${route}&page=-1`)).status).toBe(400);
    expect((await browser.request(`/api/gym/staff/${hidden.id}?workspaceId=${workspace.id}`)).status).toBe(404);
    expect((await send(`/api/gym/staff/${visible.id}?workspaceId=${workspace.id}`, { workspaceId: workspace.id, role: "OWNER" }, "PATCH")).status).toBe(403);
    expect((await send(`/api/gym/staff/${visible.id}?workspaceId=${workspace.id}`, { workspaceId: workspace.id, cref: "CREF-HTTP", actorUserId: owner.user.id }, "PATCH")).status).toBe(400);
    expect((await send(`/api/gym/staff/${visible.id}?workspaceId=${workspace.id}`, { workspaceId: workspace.id, cref: "CREF-HTTP" }, "PATCH")).status).toBe(200);
    expect((await prisma.workspaceMember.findUniqueOrThrow({ where: { id: visible.id } })).unitId).toBe(a.id);
    const recipient = await account();
    expect((await send("/api/gym/staff", { workspaceId: workspace.id, email: recipient.email, role: "TRAINER", unitId: b.id })).status).toBe(403);
    const invited = await send("/api/gym/staff", { workspaceId: workspace.id, email: recipient.email, role: "TRAINER", unitId: a.id, cref: "CREF-CONVITE" }); expect(invited.status).toBe(201);
    const raw: unknown = await invited.json();
    if (typeof raw !== "object" || raw === null || !("inviteUrl" in raw) || typeof raw.inviteUrl !== "string" || !("id" in raw) || typeof raw.id !== "string") throw new Error("Convite fora do contrato.");
    expect(raw).toMatchObject({ delivery: "MANUAL_LINK" }); expect(raw).not.toHaveProperty("rawToken"); expect(raw).not.toHaveProperty("invitation");
    const token = new URL(raw.inviteUrl, origin).searchParams.get("token");
    const pending = await browser.request(`/api/gym/invitations?workspaceId=${workspace.id}`); expect(pending.status).toBe(200);
    const pendingText = await pending.text(); expect(pendingText).toContain(raw.id); expect(pendingText).not.toContain('"tokenHash"'); expect(pendingText).not.toContain(token || "invalid");
    const preview = await browser.request(`/api/gym/invitations/accept?token=${token}`); expect(preview.status).toBe(200); expect(await preview.text()).not.toContain(recipient.email);
    expect((await send("/api/gym/invitations/accept", { token })).status).toBe(403);
    const receiving = await authenticated(recipient);
    const replies = await Promise.all([receiving.request("/api/gym/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }), receiving.request("/api/gym/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })]);
    expect(replies.map(reply => reply.status).sort()).toEqual([200, 409]);
    expect((await receiving.request(`/api/gym/workouts/students?workspaceId=${workspace.id}`)).status).toBe(200);
    const accepted = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { workspaceId: workspace.id, userId: recipient.user.id } } });
    expect(accepted.unitId).toBe(a.id); expect(await prisma.gymStaffProfile.findUnique({ where: { memberId: accepted.id } })).toMatchObject({ cref: "CREF-CONVITE" });
    const learner = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: (await account()).user.id, role: "STUDENT", unitId: a.id, assignedStaffId: visible.id, studentProfile: { create: {} } } });
    expect((await send(`/api/gym/staff/${hidden.id}?workspaceId=${workspace.id}`, { workspaceId: workspace.id, reason: "Tentativa em unidade alheia" }, "DELETE")).status).toBe(403);
    expect((await send(`/api/gym/staff/${hidden.id}/terminate`, { workspaceId: workspace.id, reason: "Alias em unidade alheia" })).status).toBe(403);
    const offboarded = await send(`/api/gym/staff/${visible.id}?workspaceId=${workspace.id}`, { workspaceId: workspace.id, replacementStaffMemberId: accepted.id, reason: "Repasse sintético HTTP" }, "DELETE");
    expect(offboarded.status).toBe(200); expect(await offboarded.json()).toMatchObject({ reassignedStudentsCount: 1 });
    expect(await prisma.workspaceMember.findUnique({ where: { id: learner.id } })).toMatchObject({ assignedStaffId: accepted.id });
    expect(await prisma.workspaceMember.findUnique({ where: { id: visible.id } })).toMatchObject({ isActive: false });
    expect(await prisma.workspaceMember.findUnique({ where: { id: hidden.id } })).toMatchObject({ isActive: true });
    const another = await account();
    const pendingInvite = await send("/api/gym/staff", { workspaceId: workspace.id, email: another.email, role: "TRAINER", unitId: a.id });
    const pendingBody: unknown = await pendingInvite.json();
    if (typeof pendingBody !== "object" || pendingBody === null || !("id" in pendingBody) || typeof pendingBody.id !== "string") throw new Error("Convite pendente fora do contrato.");
    expect((await browser.request(`/api/gym/invitations/${pendingBody.id}?workspaceId=${workspace.id}`, { method: "DELETE" })).status).toBe(200);
    expect(await prisma.workspaceInvitation.findUnique({ where: { id: pendingBody.id } })).toMatchObject({ status: "REVOKED" });
    expect((await send("/api/gym/settings/transfer-ownership", { workspaceId: workspace.id, targetUserId: recipient.user.id })).status).toBe(403);
    const titular = await authenticated(owner); titular.setWorkspaceCookie(workspace.id);
    const transfer = (actor: BrowserSession, targetUserId: string) => actor.request("/api/gym/settings/transfer-ownership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.id, targetUserId }) });
    const transferred = await transfer(titular, recipient.user.id); expect(transferred.status).toBe(200); expect(await transferred.json()).toMatchObject({ data: { newOwnerId: recipient.user.id } });
    expect((await transfer(titular, operator.user.id)).status).toBe(403);
    expect((await transfer(receiving, owner.user.id)).status).toBe(200);
    expect(await prisma.workspace.findUnique({ where: { id: workspace.id } })).toMatchObject({ ownerId: owner.user.id });
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    expect((await browser.request(route)).status).toBe(403);
    expect((await send(`/api/gym/staff/${visible.id}?workspaceId=${workspace.id}`, { workspaceId: workspace.id, cref: "INDEVIDO" }, "PATCH")).status).toBe(403);
    expect(await prisma.gymStaffProfile.findUnique({ where: { memberId: visible.id } })).toMatchObject({ cref: "CREF-HTTP" });
  });
});

describe("HTTP página financeira e despesas por unidade", () => {
  it("FINANCE local abre a página, cadastra catálogo e despesa, registra baixa parcial e reversão sem acessar outra unidade", async () => {
    const owner = await account(); const workspace = await academy(owner); const operator = await account();
    const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade protegida do financeiro" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.user.id, role: "MANAGER", unitId: a.id } });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, unitId: a.id, role: "FINANCE" } });
    const ownStudent = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: (await prisma.user.create({ data: { name: "Aluno autorizado do financeiro" } })).id, unitId: a.id, role: "STUDENT", studentProfile: { create: {} } } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: (await prisma.user.create({ data: { name: "Aluno sigiloso de outra unidade" } })).id, unitId: b.id, role: "STUDENT", studentProfile: { create: {} } } });
    const bank = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: a.id, name: "Banco autorizado do financeiro", accountType: "BANK_ACCOUNT", balanceInCents: BigInt(1000) } });
    const protectedBank = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: b.id, name: "Banco sigiloso de outra unidade", accountType: "BANK_ACCOUNT", balanceInCents: BigInt(1000) } });
    const browser = await authenticated(operator); browser.setWorkspaceCookie(workspace.id);
    const send = (route: string, body: object) => browser.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const page = await browser.request("/gym/finance"); expect(page.status).toBe(200);
    const html = await page.text(); expect(html).toContain(ownStudent.id); expect(html).not.toContain("Aluno sigiloso de outra unidade"); expect(html).not.toContain("Banco sigiloso de outra unidade");
    const invoiceFields = { workspaceId: workspace.id, studentMemberId: ownStudent.id, title: "Fatura avulsa HTTP única", dueDate: "2026-10-10", idempotencyKey: randomUUID(), items: [{ itemType: "SERVICE", description: "Serviço HTTP", unitPriceInCents: 1000 }] };
    const invoiceResponses = await Promise.all([send("/api/gym/finance/invoices", invoiceFields), send("/api/gym/finance/invoices", invoiceFields)]);
    for (const response of invoiceResponses) expect(response.status).toBe(201);
    expect(await invoiceResponses[0].json()).toEqual(await invoiceResponses[1].json());
    expect((await send("/api/gym/finance/invoices", { ...invoiceFields, title: "Intenção alterada" })).status).toBe(409);
    expect(await prisma.gymInvoice.count({ where: { workspaceId: workspace.id } })).toBe(1);
    const categoriesRoute = "/api/gym/finance/expenses/categories";
    expect((await browser.request(`${categoriesRoute}?workspaceId=${workspace.id}`)).status).toBe(200);
    expect(await prisma.gymExpenseCategory.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect((await send(categoriesRoute, { workspaceId: workspace.id, initializeDefaults: true })).status).toBe(200);
    const category = await prisma.gymExpenseCategory.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    expect((await send(categoriesRoute, { workspaceId: workspace.id, name: "Injeção", color: "expression(invalid)" })).status).toBe(400);
    expect((await send("/api/gym/finance/suppliers", { workspaceId: workspace.id, tradeName: "Fornecedor HTTP da unidade", actorUserId: owner.user.id })).status).toBe(400);
    expect((await send("/api/gym/finance/suppliers", { workspaceId: workspace.id, tradeName: "Fornecedor HTTP da unidade" })).status).toBe(201);
    const expenseRoute = "/api/gym/finance/expenses";
    const fields = { workspaceId: workspace.id, unitId: a.id, categoryId: category.id, title: `Despesa HTTP ${randomUUID()}`, amountInCents: 500, dueDate: new Date(Date.now() + 86400000).toISOString(), idempotencyKey: randomUUID() };
    expect((await send(expenseRoute, { ...fields, unitId: b.id })).status).toBe(403);
    expect((await send(expenseRoute, { ...fields, paidImmediately: "false" })).status).toBe(400);
    const created = await send(expenseRoute, fields); expect(created.status).toBe(201);
    const expense = await prisma.gymExpense.findFirstOrThrow({ where: { workspaceId: workspace.id, title: fields.title } });
    const paymentFields = { workspaceId: workspace.id, financialAccountId: bank.id, paidAmountInCents: 100, idempotencyKey: randomUUID() };
    const paymentRoute = `${expenseRoute}/${expense.id}/pay`;
    expect((await send(paymentRoute, { ...paymentFields, financialAccountId: protectedBank.id })).status).toBe(403);
    const paid = await send(paymentRoute, paymentFields); expect(paid.status).toBe(200); expect(await paid.json()).toMatchObject({ paidAmountInCents: 100, balanceRemainingInCents: 400 });
    expect((await send(paymentRoute, paymentFields)).status).toBe(200);
    expect(await prisma.gymExpensePayment.count({ where: { expenseId: expense.id } })).toBe(1);
    expect((await send(`${expenseRoute}/${expense.id}/cancel`, { workspaceId: workspace.id, cancellationReason: "Cancelar despesa com recebimento" })).status).toBe(409);
    const payment = await prisma.gymExpensePayment.findFirstOrThrow({ where: { expenseId: expense.id } });
    expect((await send(`${expenseRoute}/${expense.id}/payments/${payment.id}/reverse`, { workspaceId: workspace.id, reversalReason: "Correção rastreável HTTP" })).status).toBe(200);
    expect((await prisma.gymFinancialAccount.findUniqueOrThrow({ where: { id: bank.id } })).balanceInCents).toBe(BigInt(1000));
    expect((await send(`${expenseRoute}/${expense.id}/cancel`, { workspaceId: workspace.id, cancellationReason: "Cancelamento após reversão" })).status).toBe(200);
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    expect((await browser.request(`${categoriesRoute}?workspaceId=${workspace.id}`)).status).toBe(403);
    expect((await send(paymentRoute, paymentFields)).status).toBe(403);
    expect((await send("/api/gym/finance/invoices", invoiceFields)).status).toBe(403);
  });
});

describe("HTTP indicadores e exportação por unidade", () => {
  it("expõe a posição atual, inclui o dia civil completo e apresenta histórico insuficiente sem estimar cancelamento", async () => {
    const owner = await account(); const workspace = await academy(owner);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    await prisma.gymSettings.create({ data: { workspaceId: workspace.id, timezone: "America/Sao_Paulo" } });
    const user = await prisma.user.create({ data: { name: "Aluno temporal HTTP" } });
    const student = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, userId: user.id, role: "STUDENT" } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano temporal" } });
    const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: "Personalizado", billingCycle: "CUSTOM", durationDays: 45, priceInCents: BigInt(30001), termsText: "Condições sintéticas" } });
    const activatedAt = new Date(Date.now() - 1000);
    await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, unitId: unit.id, studentMemberId: student.id, planVersionId: version.id, status: "ACTIVE", activatedAt, startDate: activatedAt, priceInCents: BigInt(30001) } });
    await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, unitId: unit.id, studentMemberId: student.id, planVersionId: version.id, status: "ACTIVE", startDate: new Date("2020-01-01T12:00:00Z"), createdAt: new Date("2020-01-01T12:00:00Z"), priceInCents: BigInt(30001) } });
    const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(activatedAt);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    const today = `${part("year")}-${part("month")}-${part("day")}`;
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const response = await browser.request(`/api/gym/analytics/kpis?workspaceId=${workspace.id}&startDate=${today}&endDate=${today}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: {
      snapshot: { basis: "CURRENT" }, period: { timezone: "America/Sao_Paulo" },
      executive: { mrrInCents: 40002, activeRecurringContracts: 2, newEnrollmentsCount: 1, lifecycleHistoryIncompleteCount: 1, churnRatePercentage: null },
    } });
    expect((await browser.request(`/api/gym/analytics/kpis?workspaceId=${workspace.id}&startDate=${today}&endDate=${today}&timezone=Invalid/Zone`)).status).toBe(400);
    const page = await browser.request("/gym/finance"); expect(page.status).toBe(200);
    const html = await page.text(); expect(html).toContain("reportTimezone"); expect(html).toContain("America/Sao_Paulo");
  });
  it("FINANCE local recebe parcelas autorizadas; TRAINER vê carteira sem financeiro, e revogação impede nova consulta", async () => {
    const owner = await account(); const workspace = await academy(owner); const subject = await account();
    const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade protegida do relatório" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: subject.user.id, role: "MANAGER", unitId: a.id } });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, unitId: a.id, role: "FINANCE" } });
    const studentA = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: a.id, userId: (await prisma.user.create({ data: { name: "Aluno permitido HTTP", medicalConditions: "saude-nao-exportar-http" } })).id, role: "STUDENT", assignedStaffId: member.id } });
    const studentB = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: b.id, userId: (await prisma.user.create({ data: { name: "Aluno protegido HTTP" } })).id, role: "STUDENT" } });
    const invoices = [];
    for (const student of [studentA, studentB]) invoices.push(await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: student.id, studentUserId: student.userId, invoiceNumber: randomUUID(), title: "Obrigação HTTP relatório", dueDate: new Date(), subtotalInCents: BigInt(1000), totalInCents: BigInt(1000), balanceRemainingInCents: BigInt(1000), payerName: "Pagador sintético", createdByUserId: owner.user.id } }));
    await prisma.gymPayment.create({ data: { workspaceId: workspace.id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), receivedByUserId: owner.user.id, payerName: "Pagador sintético", paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: BigInt(1600), allocations: { create: [{ invoiceId: invoices[0].id, allocatedAmountInCents: BigInt(600) }, { invoiceId: invoices[1].id, allocatedAmountInCents: BigInt(1000) }] } } });
    const browser = await authenticated(subject); browser.setWorkspaceCookie(workspace.id);
    const route = `/api/gym/analytics/kpis?workspaceId=${workspace.id}`;
    const send = (body: object) => browser.request("/api/gym/analytics/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const financial = await browser.request(route); expect(financial.status).toBe(200);
    expect((await browser.request(`/api/gym/finance/legacy?workspaceId=${workspace.id}`)).status).toBe(403);
    const ownerBrowser = await authenticated(owner); ownerBrowser.setWorkspaceCookie(workspace.id);
    const legacy = await ownerBrowser.request(`/api/gym/finance/legacy?workspaceId=${workspace.id}`); expect(legacy.status).toBe(200);
    expect(await legacy.json()).toMatchObject({ data: { mode: "LEGACY_READ_ONLY", account: null, externalStateVerified: false } });
    expect(await prisma.paymentProviderAccount.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect(await financial.json()).toMatchObject({ data: { access: { financial: true, unitIds: [a.id], includeUnassigned: false }, cashFlow: { grossReceivedInCents: 600 }, accountsReceivable: { totalReceivableInCents: 1000 } } });
    const exported = await send({ workspaceId: workspace.id, exportType: "INVOICES" }); expect(exported.status).toBe(200); expect(exported.headers.get("X-Row-Count")).toBe("1");
    const csv = await exported.text(); expect(csv).toContain(invoices[0].invoiceNumber); expect(csv).not.toContain(invoices[1].invoiceNumber); expect(csv).not.toContain("saude-nao-exportar-http");
    expect((await browser.request(`${route}&unitId=${b.id}`)).status).toBe(403);
    expect((await browser.request(`${route}&startDate=invalid`)).status).toBe(400);
    expect((await send({ workspaceId: workspace.id, exportType: "PAYMENTS", actorUserId: owner.user.id })).status).toBe(400);
    const dashboard = await browser.request("/gym/dashboard"); expect(dashboard.status).toBe(200); expect(await dashboard.text()).toContain("Financeiro interno");
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { role: "TRAINER" } });
    const operational = await browser.request(route); expect(operational.status).toBe(200);
    expect(await operational.json()).toMatchObject({ data: { access: { financial: false, unitIds: [a.id] }, cashFlow: { grossReceivedInCents: 0 }, accountsReceivable: { totalReceivableInCents: 0 } } });
    const students = await send({ workspaceId: workspace.id, exportType: "STUDENTS" }); expect(students.status).toBe(200); expect(students.headers.get("X-Row-Count")).toBe("1"); expect(await students.text()).not.toContain("Aluno protegido HTTP");
    expect((await send({ workspaceId: workspace.id, exportType: "ENROLLMENTS" })).status).toBe(403);
    const trainerDashboard = await browser.request("/gym/dashboard"); expect(trainerDashboard.status).toBe(200); expect(await trainerDashboard.text()).not.toContain("Financeiro interno");
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    expect((await browser.request(route)).status).toBe(403);
    expect((await send({ workspaceId: workspace.id, exportType: "STUDENTS" })).status).toBe(403);
  });
});

describe("HTTP isolado — autenticação e limites reais das rotas", () => {
  it("módulos retirados respondem 404 sem serviços ou comandos em segundo plano", async () => {
    const owner = await account(); const workspace = await academy(owner); const browser = await authenticated(owner);
    browser.setWorkspaceCookie(workspace.id);
    for (const route of ["/api/gym/crm/leads", "/api/gym/classes/sessions", "/api/gym/devices", "/api/gym/access/evaluate", "/api/gym/reception/feed", "/api/student/classes", "/gym/crm", "/gym/classes", "/gym/access"]) {
      const response = await browser.request(`${route}?workspaceId=${workspace.id}`);
      expect(response.status, route).toBe(404);
    }
  });
  it("configuração global confirma persistência parcial, valida JSON e recusa papel revogado", async () => {
    const retiredFlags = ["turnstilesEnabled", "classesEnabled", "crmEnabled", "biometricsEnabled"];
    const route = "/api/superadmin/gym-settings";
    const subject = await account("SUPERADMIN"); const ordinary = await account();
    const browser = await authenticated(subject); const other = await authenticated(ordinary);
    expect((await other.request(route)).status).toBe(401);
    const key = "gym_default_max_students";
    const before = await prisma.systemSetting.findUnique({ where: { key } });
    const post = (body: string) => browser.request(route, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    try {
      const baseline = await browser.request(route); expect(baseline.status).toBe(200);
      const baselineBody: unknown = await baseline.json();
      const applied = gymGlobalConfigSchema.parse(baselineBody);
      for (const field of retiredFlags) expect(baselineBody).not.toHaveProperty(field);
      expect((await post("{")).status).toBe(400);
      expect((await post("a".repeat(16_385))).status).toBe(413);
      expect((await post(JSON.stringify({ configs: {} }))).status).toBe(400);
      expect((await post(JSON.stringify({ configs: { defaultMaxStudents: 1.5 } }))).status).toBe(400);
      expect((await post(JSON.stringify({ configs: { defaultMaxStudents: 777 }, adminUserId: subject.user.id }))).status).toBe(400);
      const invalidConfigs = [
        { configs: { defaultMaxStudents: -1 }, baseline: { defaultMaxStudents: applied.defaultMaxStudents } },
        { configs: { defaultMaxStudents: 1.5 }, baseline: { defaultMaxStudents: applied.defaultMaxStudents } },
        { configs: { turnstilesEnabled: "true" }, baseline: { turnstilesEnabled: false } },
        { configs: { primaryHardwareDriver: "UNSUPPORTED" }, baseline: { primaryHardwareDriver: "CONTROL_ID" } },
        { configs: { defaultMaxStudents: 777 }, baseline: {} },
      ];
      for (const input of invalidConfigs) expect((await post(JSON.stringify(input))).status).toBe(400);
      const update = await post(JSON.stringify({ configs: { defaultMaxStudents: 777 }, baseline: { defaultMaxStudents: applied.defaultMaxStudents }, reason: "Conferência HTTP de configuração" }));
      expect(update.status).toBe(200); expect(await update.json()).toMatchObject({ success: true, configs: { defaultMaxStudents: 777 } });
      const reload = await browser.request(route, { cache: "no-store" }); expect(reload.status).toBe(200);
      const body: unknown = await reload.json(); expect(body).toMatchObject({ defaultMaxStudents: 777 });
      expect((await post(JSON.stringify({ configs: { defaultMaxStudents: 888 }, baseline: { defaultMaxStudents: 776 } }))).status).toBe(409);
      if (typeof baselineBody !== "object" || baselineBody === null || typeof body !== "object" || body === null) throw new Error("DTO global inválido.");
      for (const [field, value] of Object.entries(baselineBody)) if (field !== "defaultMaxStudents") expect(Reflect.get(body, field)).toEqual(value);
      expect(await prisma.systemSetting.findUnique({ where: { key } })).toHaveProperty("value", "777");
      await prisma.user.update({ where: { id: subject.user.id }, data: { role: "USER" } });
      expect((await browser.request(route)).status).toBe(401);
      expect((await post(JSON.stringify({ configs: { defaultMaxStudents: 888 } }))).status).toBe(401);
      expect(await prisma.systemSetting.findUnique({ where: { key } })).toHaveProperty("value", "777");
    } finally {
      if (before) await prisma.systemSetting.update({ where: { key }, data: { value: before.value } });
      else await prisma.systemSetting.deleteMany({ where: { key } });
    }
  });
  it("biblioteca GYM percorre página SSR, criação, edição, prescrição idempotente e desativação sem apagar fichas", async () => {
    const owner = await account(); const workspace = await academy(owner);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const user = await prisma.user.create({ data: { name: "Aluno da ficha HTTP", password: "synthetic-no-export", cpfCnpj: "synthetic-no-export" } });
    const student = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, userId: user.id, role: "STUDENT", studentProfile: { create: {} } } });
    const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
    const exercise = await prisma.exercise.create({ data: { name: `ExercicioHTTP-${randomUUID()}`, muscleGroupId: muscle.id, isOfficial: true, status: "APPROVED" } });
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const send = (route: string, method: string, body: object) => browser.request(route, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const fields = { workspaceId: workspace.id, name: `ModeloHTTP-${randomUUID()}`, goal: "Força", difficulty: "Iniciante", duration: "30 min", allowSkipExercises: true, exercises: [{ exerciseId: exercise.id, sets: 3, reps: "12", rest: "60s", load: "10 kg" }] };
    expect((await send("/api/gym/workouts/templates", "POST", { ...fields, creatorUserId: owner.user.id })).status).toBe(400);
    const created = await send("/api/gym/workouts/templates", "POST", fields); expect(created.status).toBe(201);
    const template = await prisma.workout.findFirstOrThrow({ where: { workspaceId: workspace.id, name: fields.name } });
    const html = await browser.request(`/gym/workouts?search=${encodeURIComponent(fields.name)}`); expect(html.status).toBe(200);
    expect(await html.text()).toContain(fields.name);
    const changed = await send(`/api/gym/workouts/templates/${template.id}`, "PATCH", { workspaceId: workspace.id, duration: "45 min", allowCompleteView: true }); expect(changed.status).toBe(200);
    expect((await browser.request(`/api/gym/workouts/templates?workspaceId=${workspace.id}&limit=51`)).status).toBe(400);
    const options = await browser.request(`/api/gym/workouts/students?workspaceId=${workspace.id}`); expect(options.status).toBe(200);
    expect(await options.text()).not.toContain("synthetic-no-export");
    const available = await browser.request(`/api/gym/workouts/exercises?workspaceId=${workspace.id}&search=${encodeURIComponent(exercise.name)}`); expect(available.status).toBe(200); expect(await available.json()).toMatchObject({ data: [{ id: exercise.id }] });
    const input = { workspaceId: workspace.id, studentMemberId: student.id, templateWorkoutId: template.id, dayOfWeek: 2, idempotencyKey: randomUUID() };
    const assignments = await Promise.all([send("/api/gym/workouts/assign", "POST", input), send("/api/gym/workouts/assign", "POST", input)]);
    for (const response of assignments) { expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ success: true, workout: { studentId: user.id, duration: "45 min", allowSkipExercises: true, allowCompleteView: true } }); }
    expect(await prisma.workout.count({ where: { workspaceId: workspace.id, studentId: user.id } })).toBe(1);
    expect((await send("/api/gym/workouts/assign", "POST", { ...input, dayOfWeek: 3 })).status).toBe(409);
    const reading = await browser.request(`/api/gym/students/${student.id}/workouts?workspaceId=${workspace.id}`); expect(reading.status).toBe(200); expect(await reading.json()).toMatchObject({ workouts: [{ studentId: user.id }] });
    expect((await browser.request(`/api/gym/workouts/templates/${template.id}?workspaceId=${workspace.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await send("/api/gym/workouts/assign", "POST", { ...input, idempotencyKey: randomUUID() })).status).toBe(404);
    expect(await prisma.workout.count({ where: { workspaceId: workspace.id, studentId: user.id, isActive: true } })).toBe(1);
  });
  it("seleção inicial e action mantêm papel local; CSV só exporta alunos atribuídos e nega financeiro", async () => {
    const owner = await account(), trainer = await account();
    const workspace = await academy(owner);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: trainer.user.id, role: "MANAGER", unitId: unit.id, roleGrants: { create: { role: "TRAINER", unitId: unit.id, grantedBy: owner.user.id } } } });
    for (const assigned of [true, false]) {
      const user = await prisma.user.create({ data: { name: assigned ? "CSVAlunoAtribuido" : "CSVAlunoNaoAtribuido" } });
      await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", unitId: unit.id, assignedStaffId: assigned ? member.id : null, studentProfile: { create: {} } } });
    }
    const browser = await authenticated(trainer);
    expect((await browser.request("/select-workspace")).status).toBe(200);
    const selected = await browser.serverAction("selectActiveWorkspace", [workspace.id]);
    expect(selected.result).toMatchObject({ success: true, workspace: { roles: ["TRAINER"] } });
    const request = (exportType: string) => browser.request("/api/gym/analytics/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.id, unitId: unit.id, exportType }) });
    const csv = await request("STUDENTS");
    expect(csv.status).toBe(200); expect(csv.headers.get("x-row-count")).toBe("1");
    const body = await csv.text(); expect(body).toContain("CSVAlunoAtribuido"); expect(body).not.toContain("CSVAlunoNaoAtribuido");
    expect((await request("PAYMENTS")).status).toBe(403);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: member.id }, data: { revokedAt: new Date() } });
    expect((await request("STUDENTS")).status).toBe(403);
    expect((await browser.serverAction("selectActiveWorkspace", [workspace.id])).result).toMatchObject({ error: expect.any(String) });
  });
  it("instrutor de unidade só consulta e prescreve seus alunos; boolean de gestor não eleva autoridade", async () => {
    const owner = await account(); const trainer = await account(); const workspace = await academy(owner);
    const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } }); const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Restrita" } });
    const instructor = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: trainer.user.id, role: "MANAGER", unitId: a.id } });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: instructor.id, unitId: a.id, role: "TRAINER", grantedBy: owner.user.id } });
    const targets = [];
    for (const unitId of [a.id, b.id]) { const user = await prisma.user.create({ data: { name: randomUUID() } }); targets.push(await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId, userId: user.id, role: "STUDENT", assignedStaffId: instructor.id, studentProfile: { create: {} } } })); }
    const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
    const exercise = await prisma.exercise.create({ data: { name: "Exercício público HTTP", muscleGroupId: muscle.id, status: "APPROVED" } });
    const template = await prisma.workout.create({ data: { workspaceId: workspace.id, creatorId: owner.user.id, name: `BibliotecaLocalHTTP-${randomUUID()}`, goal: "Força", difficulty: "Iniciante", duration: "30 min", exercises: { create: { exerciseId: exercise.id, sets: 3, reps: "10", rest: "60s" } } } });
    const browser = await authenticated(trainer); browser.setWorkspaceCookie(workspace.id);
    const html = await browser.request(`/gym/workouts?search=${encodeURIComponent(template.name)}`); expect(html.status).toBe(200); expect(await html.text()).toContain(template.name);
    const options = await browser.request(`/api/gym/workouts/students?workspaceId=${workspace.id}`); expect(options.status).toBe(200); expect(await options.json()).toMatchObject({ data: [{ memberId: targets[0].id }] });
    const post = (body: object) => browser.request("/api/gym/workouts/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const input = { workspaceId: workspace.id, studentMemberId: targets[1].id, templateWorkoutId: template.id, idempotencyKey: randomUUID() };
    expect((await post({ ...input, isManagerOrOwner: true })).status).toBe(400); expect((await post(input)).status).toBe(403);
    expect((await browser.request(`/api/gym/students/${targets[1].id}/workouts?workspaceId=${workspace.id}`)).status).toBe(403);
    expect((await post({ ...input, studentMemberId: targets[0].id })).status).toBe(201);
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    expect((await browser.request(`/api/gym/students/${targets[0].id}/workouts?workspaceId=${workspace.id}`)).status).toBe(403);
  });
  it("SSR da recepção mostra apenas alunos da unidade autorizada e recusa unidade estrangeira", async () => {
    const owner = await account(); const operator = await account(); const workspace = await academy(owner);
    const a = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } }); const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade B restrita" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.user.id, role: "MANAGER", unitId: a.id } });
    const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "RECEPTIONIST", unitId: a.id, grantedBy: owner.user.id } });
    const visibleName = `RecepcaoLocal-${randomUUID()}`; const privateName = `RecepcaoOutra-${randomUUID()}`;
    for (const [name, unitId] of [[visibleName, a.id], [privateName, b.id]]) {
      const student = await prisma.user.create({ data: { name } });
      await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, unitId, role: "STUDENT", studentProfile: { create: {} } } });
    }
    const browser = await authenticated(operator); browser.setWorkspaceCookie(workspace.id);
    const response = await browser.request(`/gym/reception?unitId=${a.id}`); expect(response.status).toBe(200);
    const html = await response.text(); expect(html).toContain(visibleName); expect(html).not.toContain(privateName);
    expect(html).toContain("Sem matrícula"); expect(html).toContain("Sem mensalidade");
    const denied = await browser.request(`/gym/reception?unitId=${b.id}`); expect(denied.status).toBe(200);
    const deniedHtml = await denied.text(); expect(deniedHtml).toContain("Recepção indisponível neste contexto"); expect(deniedHtml).not.toContain(privateName); expect(deniedHtml).not.toContain(visibleName);
    await prisma.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    const revoked = await browser.request(`/gym/reception?unitId=${a.id}`); expect(await revoked.text()).not.toContain(visibleName);
  });
  it("dashboard e treinos seguem o vínculo selecionado; modelos GYM e prescrições alheias não são executáveis", async () => {
    const owner = await account(); const subject = await account(); const other = await account();
    const gym = await academy(owner);
    const member = await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: subject.user.id, role: "STUDENT", canDoAnyWorkoutDay: true } });
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: owner.user.id, name: "Personal selecionado", slug: `student-context-${randomUUID()}`, members: { create: [{ userId: owner.user.id, role: "OWNER" }, { userId: subject.user.id, role: "STUDENT", canDoAnyWorkoutDay: true }] } } });
    const create = (workspaceId: string, name: string, studentId?: string) => prisma.workout.create({ data: { workspaceId, creatorId: owner.user.id, name, studentId, goal: "Força", difficulty: "Iniciante", duration: "30 minutos" } });
    const assigned = await create(gym.id, "Prescrição GYM própria", subject.user.id); const template = await create(gym.id, "Modelo GYM privado"); const alien = await create(gym.id, "Prescrição de outro aluno", other.user.id); const personalShared = await create(personal.id, "Treino PERSONAL compartilhado");
    const inactive = await create(gym.id, "Prescrição GYM desativada", subject.user.id); await prisma.workout.update({ where: { id: inactive.id }, data: { isActive: false } });
    await prisma.gymInvoice.create({ data: { workspaceId: gym.id, studentMemberId: member.id, studentUserId: subject.user.id, invoiceNumber: randomUUID(), title: "Obrigação GYM exata", dueDate: new Date(Date.now() - 86400000), subtotalInCents: BigInt("9007199254740993"), totalInCents: BigInt("9007199254740993"), balanceRemainingInCents: BigInt("9007199254740993"), payerName: "Aluno sintético", createdByUserId: owner.user.id } });
    const browser = await authenticated(subject); browser.setWorkspaceCookie(gym.id);
    const listed = await browser.request("/api/student/workouts"); expect(listed.status).toBe(200); const content = await listed.text(); expect(content).toContain(assigned.id); for (const hidden of [template, alien, personalShared, inactive]) expect(content).not.toContain(hidden.id);
    const dashboard = await browser.request("/api/student/dashboard"); expect(dashboard.status).toBe(200); const summary: unknown = await dashboard.json(); expect(summary).toMatchObject({ workspace: { id: gym.id }, finance: { kind: "GYM_MANUAL", status: "Atrasado", pendingAmountInCents: "9007199254740993", pendingAmount: "90071992547409,93" } }); expect(JSON.stringify(summary)).not.toContain(personalShared.id);
    const post = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    for (const unavailable of [template, alien, personalShared, inactive]) expect((await browser.request("/api/student/workouts", post({ workoutId: unavailable.id }))).status).toBe(404);
    expect((await browser.request("/api/student/workouts", post({ workoutId: assigned.id, loads: { "exercise-outside-prescription": ["10"] } }))).status).toBe(400);
    expect((await browser.request("/api/student/workouts", post({ workoutId: assigned.id, effortScore: "5" }))).status).toBe(400);
    expect(await prisma.workoutLog.count({ where: { studentId: subject.user.id } })).toBe(0);
    await prisma.notificationPreference.create({ data: { userId: owner.user.id, settings: { TRAINING: { inApp: false, push: false, email: false } } } });
    expect((await browser.request("/api/student/workouts", post({ workoutId: assigned.id, effortScore: 3, feedback: "Execução sintética", loads: {}, reps: {}, restTimes: {}, skippedExercises: {} }))).status).toBe(200);
    browser.setWorkspaceCookie(personal.id);
    const personalList = await browser.request("/api/student/workouts"); expect(personalList.status).toBe(200); const personalContent = await personalList.text(); expect(personalContent).toContain(personalShared.id); expect(personalContent).not.toContain(assigned.id);
    expect((await browser.request("/api/student/workouts", post({ workoutId: personalShared.id, effortScore: 3 }))).status).toBe(200);
    expect(await prisma.workoutLog.count({ where: { studentId: subject.user.id, workspaceId: gym.id, workoutId: assigned.id } })).toBe(1); expect(await prisma.workoutLog.count({ where: { studentId: subject.user.id, workspaceId: personal.id, workoutId: personalShared.id } })).toBe(1);
    browser.setWorkspaceCookie(randomUUID()); expect((await browser.request("/api/student/dashboard")).status).toBe(409); expect((await browser.request("/api/student/workouts")).status).toBe(409);
  });
  it("bloqueio PERSONAL e cobranças legadas permanecem locais; GYM nunca usa essa wallet para bloquear treinos", async () => {
    const owner = await account(); const anotherOwner = await account(); const subject = await account(); const gym = await academy(owner);
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: subject.user.id, role: "STUDENT" } });
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: owner.user.id, name: "Assessoria com cobrança", slug: `local-billing-${randomUUID()}`, members: { create: { userId: subject.user.id, role: "STUDENT" } } } });
    const remote = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: anotherOwner.user.id, name: "Outra assessoria", slug: `remote-billing-${randomUUID()}`, members: { create: { userId: subject.user.id, role: "STUDENT" } } } });
    const localAccount = await prisma.paymentProviderAccount.create({ data: { personalUserId: owner.user.id, provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID() } }); const remoteAccount = await prisma.paymentProviderAccount.create({ data: { personalUserId: anotherOwner.user.id, provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID() } }); const gymAccount = await prisma.paymentProviderAccount.create({ data: { workspaceId: gym.id, profileType: "WORKSPACE", provider: "ASAAS", environment: "SANDBOX", providerAccountId: randomUUID() } });
    const billing = (providerAccountId: string, title: string, days: number, workspaceId?: string) => prisma.studentBilling.create({ data: { providerAccountId, workspaceId, studentUserId: subject.user.id, title, idempotencyKey: randomUUID(), billingReference: randomUUID(), grossAmountInCents: BigInt(12345), personalNetEstimatedInCents: BigInt(12345), feeRuleVersionId: "synthetic-no-fk", paymentMethod: "PIX", status: "PENDING", dueDate: new Date(Date.now() + days * 86400000), pixPayloadEncrypted: "pix-synthetic-plain-provider-contract" } });
    const localBilling = await billing(localAccount.id, "Cobrança PERSONAL correta", -8); const foreignBilling = await billing(remoteAccount.id, "Cobrança PERSONAL de outro vínculo", -30, remote.id); const historical = await billing(gymAccount.id, "Cobrança GYM externa histórica", -40, gym.id);
    const browser = await authenticated(subject); browser.setWorkspaceCookie(personal.id);
    const status = await browser.request("/api/student/lock-status"); expect(status.status).toBe(200); expect(await status.json()).toMatchObject({ status: "LOCKED", overdueBilling: { id: localBilling.id, grossAmountInCents: "12345", pixCopyPaste: "pix-synthetic-plain-provider-contract" } });
    const finance = await browser.request("/api/student/finance"); expect(finance.status).toBe(200); const localContent = await finance.text(); expect(localContent).toContain(localBilling.id); expect(localContent).not.toContain(foreignBilling.id); expect(localContent).not.toContain(historical.id);
    browser.setWorkspaceCookie(gym.id); const manualLock = await browser.request("/api/student/lock-status"); expect(manualLock.status).toBe(200); expect(await manualLock.json()).toEqual({ kind: "GYM_MANUAL", workspaceId: gym.id, status: "OK", daysUntilLock: null, overdueBilling: null });
    const manualFinance = await browser.request("/api/student/finance"); expect(manualFinance.status).toBe(200); expect(await manualFinance.text()).not.toContain(historical.id);
    expect(await prisma.walletLedgerEntry.count({ where: { providerAccountId: gymAccount.id } })).toBe(0); expect(await prisma.studentBilling.findUnique({ where: { id: historical.id } })).toMatchObject({ status: "PENDING" });
  });
  it("perfil do aluno persistido não restaura papel estudantil revogado na sessão existente", async () => {
    const owner = await account(); const subject = await account(); const workspace = await academy(owner);
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: subject.user.id, role: "STUDENT", studentProfile: { create: {} }, roleGrants: { create: { role: "STUDENT", grantedBy: owner.user.id } } } });
    const browser = await authenticated(subject); browser.setWorkspaceCookie(workspace.id); expect((await browser.request("/api/student/finance")).status).toBe(200);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: member.id, role: "STUDENT" }, data: { revokedAt: new Date() } });
    for (const path of ["/api/student/finance", "/api/student/lock-status", "/api/student/dashboard", "/api/student/workouts"]) expect((await browser.request(path)).status).toBe(409);
    expect(await prisma.gymStudentProfile.findUnique({ where: { memberId: member.id } })).not.toBeNull(); expect(await browser.userId()).toBe(subject.user.id);
  });
  it("aluno USER confirma contrato próprio e consulta financeiro interno; contexto PERSONAL preserva sua resposta", async () => {
    const owner = await account(); const subject = await account(); const outsider = await account();
    await prisma.user.update({ where: { id: subject.user.id }, data: { birthDate: new Date("1990-01-15T00:00:00Z") } });
    const workspace = await academy(owner); const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: subject.user.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano contrato HTTP" } }); const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), termsText: "Contrato sintético apresentado por HTTP." } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, unitId: unit.id, planVersionId: version.id, priceInCents: version.priceInCents } });
    await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, studentUserId: subject.user.id, enrollmentId: enrollment.id, invoiceNumber: randomUUID(), title: "Mensalidade interna HTTP", totalInCents: BigInt(10000), subtotalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), dueDate: new Date(), payerName: "Aluno HTTP", createdByUserId: owner.user.id } });
    const browser = await authenticated(subject); browser.setWorkspaceCookie(workspace.id); const foreign = await authenticated(outsider);
    const contractPath = `/api/gym/enrollments/${enrollment.id}/accept`;
    expect((await foreign.request(`${contractPath}?workspaceId=${workspace.id}`)).status).toBe(403);
    const shownResponse = await browser.request(`${contractPath}?workspaceId=${workspace.id}`); expect(shownResponse.status).toBe(200); const shown: unknown = await shownResponse.json();
    if (typeof shown !== "object" || !shown || !("contractDigest" in shown) || typeof shown.contractDigest !== "string") throw new Error("Contrato para signatário inválido.");
    const post = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await browser.request(contractPath, post({ workspaceId: workspace.id, accepted: false, contractDigest: shown.contractDigest }))).status).toBe(400);
    expect((await browser.request(contractPath, post({ workspaceId: workspace.id, accepted: true, contractDigest: shown.contractDigest }))).status).toBe(200);
    expect((await browser.request(contractPath, post({ workspaceId: workspace.id, accepted: true, contractDigest: shown.contractDigest }))).status).toBe(200);
    const statement = await browser.request("/api/student/finance"); expect(statement.status).toBe(200); expect(await statement.json()).toMatchObject({ kind: "GYM_MANUAL", workspaceId: workspace.id, totals: { outstandingInCents: "10000", receivedInCents: "0" }, invoices: [{ title: "Mensalidade interna HTTP" }] });
    expect((await browser.request("/api/student/finance/recurrence", { method: "DELETE" })).status).toBe(410);
    expect((await browser.request("/api/student/finance?page=1lixo")).status).toBe(400);
    expect((await browser.request("/student/contracts")).status).toBe(200);
    const personal = await prisma.workspace.create({ data: { ownerId: owner.user.id, type: "PERSONAL", name: "Assessoria HTTP financeira", slug: `finance-personal-${randomUUID()}`, members: { create: [{ userId: owner.user.id, role: "OWNER" }, { userId: subject.user.id, role: "STUDENT" }] } } });
    browser.setWorkspaceCookie(personal.id); const legacy = await browser.request("/api/student/finance"); expect(legacy.status).toBe(200); const response: unknown = await legacy.json(); expect(response).toHaveProperty("pendingBillings"); expect(response).not.toHaveProperty("kind"); expect(JSON.stringify(response)).not.toContain("Mensalidade interna HTTP");
    expect(await prisma.gymContractAcceptance.count({ where: { enrollmentId: enrollment.id } })).toBe(1); expect(await prisma.paymentProviderAccount.count({ where: { workspaceId: workspace.id } })).toBe(0);
  });
  it("responsável exige conta correspondente, conferência registrada e autorização atual por unidade", async () => {
    const owner = await account(); const parent = await account(); const other = await account(); const student = await account();
    await prisma.user.update({ where: { id: parent.user.id }, data: { cpfCnpj: "12345678909", birthDate: new Date("1990-01-15T00:00:00Z") } });
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("2013-01-15T00:00:00Z") } });
    const workspace = await academy(owner); const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const alienUnit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade sem alcance HTTP" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.user.id, role: "STUDENT", unitId: unit.id, isMinor: true, studentProfile: { create: {} } } });
    const browser = await authenticated(owner); browser.setWorkspaceCookie(workspace.id);
    const parentBrowser = await authenticated(parent);
    const request = (body: object, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const path = `/api/gym/students/${member.id}/guardians`;
    const input = { workspaceId: workspace.id, guardianUserId: parent.user.id, name: "Responsável HTTP verificado", cpf: "12345678909", phone: "11900000000", relationship: "TUTOR_LEGAL", isLegalRepresentative: true };
    expect((await browser.request(path, request({ ...input, guardianUserId: other.user.id }))).status).toBe(403);
    const response = await browser.request(path, request(input)); expect(response.status).toBe(201);
    const guardian: unknown = await response.json();
    if (typeof guardian !== "object" || !guardian || !("id" in guardian) || typeof guardian.id !== "string") throw new Error("Contrato de responsável inválido.");
    expect(guardian).not.toHaveProperty("cpf"); expect(guardian).not.toHaveProperty("guardianUserId");
    expect(await (await parentBrowser.request("/api/guardian/dependents")).json()).toEqual([]);
    const verifyPath = `/api/gym/guardians/${guardian.id}/verify`;
    expect((await browser.request(verifyPath, request({ workspaceId: workspace.id }))).status).toBe(400);
    expect((await browser.request(verifyPath, request({ workspaceId: workspace.id, notes: "Conferência sintética declarada pelo operador HTTP." }))).status).toBe(200);
    expect(JSON.stringify(await (await parentBrowser.request("/api/guardian/dependents")).json())).toContain(member.id);
    const content = "Documento sintético apresentado ao responsável no teste HTTP.";
    const document = await prisma.legalDocument.create({ data: { type: "TERMS", version: randomUUID(), title: "Termos HTTP", content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } });
    const acceptPath = `/api/guardian/dependents/${guardian.id}/accept-terms`;
    const shown = await parentBrowser.request(`${acceptPath}?workspaceId=${workspace.id}&documentType=TERMS`); expect(shown.status).toBe(200); expect(await shown.json()).toMatchObject({ id: document.id, content });
    const acceptanceInput = { workspaceId: workspace.id, documentType: "TERMS", documentId: document.id, documentHash: document.contentHash, accepted: true };
    expect((await parentBrowser.request(acceptPath, request({ ...acceptanceInput, accepted: false }))).status).toBe(400);
    expect((await parentBrowser.request(acceptPath, request({ ...acceptanceInput, documentId: randomUUID() }))).status).toBe(409);
    expect((await parentBrowser.request(acceptPath, request(acceptanceInput))).status).toBe(201);
    expect((await parentBrowser.request(acceptPath, request(acceptanceInput))).status).toBe(201);
    expect(await prisma.legalAcceptance.count({ where: { workspaceId: workspace.id, representedUserId: student.user.id } })).toBe(1);
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano menor HTTP" } });
    const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), termsText: "Contrato de academia sintético para responsável." } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, unitId: unit.id, planVersionId: version.id, priceInCents: version.priceInCents } });
    const contractPath = `/api/gym/enrollments/${enrollment.id}/accept`;
    const contractResponse = await parentBrowser.request(`${contractPath}?workspaceId=${workspace.id}`); expect(contractResponse.status).toBe(200); const contract: unknown = await contractResponse.json();
    if (typeof contract !== "object" || !contract || !("contractDigest" in contract) || typeof contract.contractDigest !== "string") throw new Error("Contrato representado inválido.");
    expect((await parentBrowser.request(contractPath, request({ workspaceId: workspace.id, accepted: true, contractDigest: contract.contractDigest }))).status).toBe(200);
    expect(await prisma.gymContractAcceptance.findUnique({ where: { enrollmentId: enrollment.id } })).toMatchObject({ signerUserId: parent.user.id, representedUserId: student.user.id, representationRole: "TUTOR_LEGAL" });
    expect(JSON.stringify(await (await parentBrowser.request("/api/guardian/dependents")).json())).toContain(enrollment.id);
    const patchPath = `/api/gym/guardians/${guardian.id}`;
    expect((await browser.request(patchPath, request({ workspaceId: workspace.id, relationship: "MAE" }, "PATCH"))).status).toBe(200);
    expect(await (await parentBrowser.request("/api/guardian/dependents")).json()).toEqual([]);
    const scoped = await account(); await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: scoped.user.id, role: "RECEPTIONIST", roleGrants: { create: { role: "RECEPTIONIST", unitId: alienUnit.id, grantedBy: owner.user.id } } } });
    const scopedBrowser = await authenticated(scoped); scopedBrowser.setWorkspaceCookie(workspace.id);
    expect((await scopedBrowser.request(verifyPath, request({ workspaceId: workspace.id, notes: "Conferência sintética fora da unidade." }))).status).toBe(403);
    const reception = await account(); await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: reception.user.id, role: "RECEPTIONIST", roleGrants: { create: { role: "RECEPTIONIST", unitId: unit.id, grantedBy: owner.user.id } } } });
    const receptionBrowser = await authenticated(reception); receptionBrowser.setWorkspaceCookie(workspace.id);
    expect((await receptionBrowser.request(patchPath, request({ workspaceId: workspace.id, hasHealthAccess: true }, "PATCH"))).status).toBe(403);
    expect((await browser.request(verifyPath, request({ workspaceId: workspace.id, notes: "Conferência sintética renovada pelo operador HTTP." }))).status).toBe(200);
    expect((await browser.request(`${patchPath}?workspaceId=${workspace.id}`, { method: "DELETE" })).status).toBe(400);
    expect((await browser.request(`${patchPath}?workspaceId=${workspace.id}&reason=Revogação%20sintética%20HTTP`, { method: "DELETE" })).status).toBe(200);
    expect(await (await parentBrowser.request("/api/guardian/dependents")).json()).toEqual([]);
    expect(await prisma.workspaceMember.count({ where: { userId: parent.user.id } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: parent.user.id } })).not.toBeNull();
  });
  it("cadastro HTTP valida entrada, não duplica retry e ficha nega escrita de leitura, identidade global e unidade alheia", async () => {
    const subject = await account(); const workspace = await academy(subject); const browser = await authenticated(subject); browser.setWorkspaceCookie(workspace.id);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } }); const otherUnit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Outra unidade HTTP" } });
    const request = (body: object, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const input = { workspaceId: workspace.id, unitId: unit.id, email: `registered-http-${randomUUID()}@example.invalid`, name: "Aluno HTTP", birthDate: "1990-01-15", idempotencyKey: randomUUID(), notes: "Saúde sintética local" };
    expect((await browser.request("/api/gym/students", request({ ...input, birthDate: "2026-02-31" }))).status).toBe(400);
    expect((await browser.request("/api/gym/students", request({ ...input, actorUserId: subject.user.id }))).status).toBe(400);
    const created = await browser.request("/api/gym/students", request(input)); expect(created.status).toBe(201); const registered: unknown = await created.json(); expect(JSON.stringify(registered)).not.toMatch(/setupToken|password|mfa|Fingerprint/);
    expect((await browser.request("/api/gym/students", request(input))).status).toBe(201);
    const member = await prisma.workspaceMember.findFirstOrThrow({ where: { workspaceId: workspace.id, user: { email: input.email } } }); expect(await prisma.workspaceMember.count({ where: { workspaceId: workspace.id, user: { email: input.email } } })).toBe(1);
    const patchPath = `/api/gym/students/${member.id}`;
    expect((await browser.request(patchPath, request({ workspaceId: workspace.id, name: "Identidade adulterada" }, "PATCH"))).status).toBe(400);
    expect((await browser.request(patchPath, request({ workspaceId: workspace.id, medicalClearance: "false" }, "PATCH"))).status).toBe(400);
    const updated = await browser.request(patchPath, request({ workspaceId: workspace.id, emergencyContactName: "Contato local" }, "PATCH")); expect(updated.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: member.userId } })).toMatchObject({ name: input.name, birthDate: new Date("1990-01-15T00:00:00Z") });
    expect((await browser.request(`/api/gym/students?workspaceId=${workspace.id}&page=1lixo`)).status).toBe(400);
    const finance = await account(); await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: finance.user.id, role: "FINANCE", roleGrants: { create: { role: "FINANCE", unitId: unit.id, grantedBy: subject.user.id } } } });
    const financeBrowser = await authenticated(finance); financeBrowser.setWorkspaceCookie(workspace.id);
    const detail = await financeBrowser.request(`${patchPath}?workspaceId=${workspace.id}`); expect(detail.status).toBe(200); const detailBody: unknown = await detail.json(); expect(JSON.stringify(detailBody)).not.toMatch(/notes|medicalClearance|setupToken|password/);
    expect((await financeBrowser.request(patchPath, request({ workspaceId: workspace.id, isActive: false }, "PATCH"))).status).toBe(403);
    expect((await financeBrowser.request("/api/gym/students/check-duplicate", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify({ workspaceId: workspace.id, unitId: unit.id, email: input.email }) })).status).toBe(403);
    const receptionist = await account(); await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: receptionist.user.id, role: "RECEPTIONIST", roleGrants: { create: { role: "RECEPTIONIST", unitId: unit.id, grantedBy: subject.user.id } } } });
    const receptionBrowser = await authenticated(receptionist); receptionBrowser.setWorkspaceCookie(workspace.id);
    expect((await receptionBrowser.request("/api/gym/students", request({ ...input, unitId: otherUnit.id, idempotencyKey: randomUUID() }))).status).toBe(403);
    const list = await receptionBrowser.request(`/api/gym/students?workspaceId=${workspace.id}&unitId=${unit.id}`); expect(list.status).toBe(200);
    expect(await list.json()).toMatchObject({ pagination: { total: 1 }, students: [{ id: member.id }] });
    expect(await prisma.workspaceMember.findUnique({ where: { id: member.id } })).toMatchObject({ isActive: true });
  });
  it("conta própria de menor é recusada em Credentials e sessão antiga é invalidada", async () => {
    const subject = await account(); const browser = await authenticated(subject);
    await prisma.user.update({ where: { id: subject.user.id }, data: { birthDate: new Date("2013-01-15T00:00:00Z") } });
    expect(await browser.userId()).toBeNull();
    const fresh = new BrowserSession(); await fresh.login(subject.email, subject.password); expect(await fresh.userId()).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: subject.user.id } })).toMatchObject({ password: subject.user.password, sessionVersion: 0 });
  });
  it("importação HTTP usa prévia persistida; payload adulterado é recusado e retry não duplica", async () => {
    const subject = await account(); const workspace = await academy(subject); const browser = await authenticated(subject); browser.setWorkspaceCookie(workspace.id);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano HTTP import" } });
    await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), termsText: "Condições sintéticas" } });
    const email = `import-http-${randomUUID()}@example.invalid`; const csvContent = `Nome;Email;Data_Nascimento;Plano\nAluno HTTP;${email};1990-01-15;${plan.name}`;
    const request = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const previewResponse = await browser.request("/api/gym/import/preview", request({ workspaceId: workspace.id, unitId: unit.id, csvContent })); expect(previewResponse.status).toBe(200);
    const body: unknown = await previewResponse.json();
    if (typeof body !== "object" || !body || !("data" in body) || typeof body.data !== "object" || !body.data || !("previewId" in body.data) || typeof body.data.previewId !== "string" || !("importBatchHash" in body.data) || typeof body.data.importBatchHash !== "string") throw new Error("Contrato da prévia inválido.");
    const input = { workspaceId: workspace.id, unitId: unit.id, previewId: body.data.previewId, importBatchHash: body.data.importBatchHash };
    const record = await prisma.importRecord.findFirstOrThrow({ where: { importJobId: input.previewId } });
    // A shared ImportJob cannot be edited, cancelled or processed through the older PERSONAL namespace.
    for (const [path, options] of [
      [`/api/personal/migration?workspaceId=${workspace.id}`, {}],
      ["/api/personal/migration", request({ workspaceId: workspace.id, rawText: "Texto sintético" })],
      [`/api/personal/migration/${input.previewId}`, {}],
      [`/api/personal/migration/${input.previewId}`, { method: "DELETE" }],
      [`/api/personal/migration/${input.previewId}/records`, {}],
      [`/api/personal/migration/${input.previewId}/records/${record.id}`, { ...request({ normalizedData: { rowsHash: "adulterado" } }), method: "PATCH" }],
      [`/api/personal/migration/${input.previewId}/records/${record.id}`, { method: "DELETE" }],
      [`/api/personal/migration/${input.previewId}/preview`, { method: "POST" }],
      [`/api/personal/migration/${input.previewId}/process`, { method: "POST" }],
      [`/api/personal/migration/${input.previewId}/commit`, request({})],
      [`/api/personal/migration/${input.previewId}/upload`, request({})],
    ] satisfies [string, RequestInit][]) expect((await browser.request(path, options)).status).toBe(403);
    expect(await prisma.importJob.findUnique({ where: { id: input.previewId } })).toMatchObject({ status: "READY", previewValidated: true });
    expect(await prisma.importRecord.findUnique({ where: { id: record.id } })).toMatchObject({ normalizedData: record.normalizedData });
    expect((await browser.request("/api/gym/import/commit", request({ ...input, rows: [{ isMinor: false, status: "VALID", planPriceInCents: 1 }] }))).status).toBe(400);
    const committed = await browser.request("/api/gym/import/commit", request(input)); expect(committed.status).toBe(200); expect(await committed.json()).toMatchObject({ data: { createdStudentsCount: 1, alreadyCommitted: false } });
    const retry = await browser.request("/api/gym/import/commit", request(input)); expect(retry.status).toBe(200); expect(await retry.json()).toMatchObject({ data: { createdStudentsCount: 1, alreadyCommitted: true } });
    expect(await prisma.gymEnrollment.findFirst({ where: { workspaceId: workspace.id } })).toMatchObject({ status: "PENDING_ACCEPTANCE", accessGranted: false });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: workspace.id, role: "STUDENT" } })).toBe(1);
  });
  it("migração PERSONAL recusa job e registro alheios; leitura legítima permanece disponível", async () => {
    const subject = await account(); const other = await account(); const browser = await authenticated(subject);
    const createWorkspace = (ownerId: string) => prisma.workspace.create({ data: { ownerId, name: "Assessoria import", slug: `personal-import-${randomUUID()}`, type: "PERSONAL", members: { create: { userId: ownerId, role: "OWNER" } } } });
    const own = await createWorkspace(subject.user.id); const foreign = await createWorkspace(other.user.id);
    await entitlePersonalForTest(browser, subject.user.id, own.id);
    const job = await prisma.importJob.create({ data: { workspaceId: own.id, createdByUserId: subject.user.id, status: "REVIEW" } });
    const alienJob = await prisma.importJob.create({ data: { workspaceId: foreign.id, createdByUserId: other.user.id, status: "REVIEW", records: { create: { entityType: "STUDENT", temporaryEntityId: "FOREIGN", normalizedData: { name: "Aluno sintético" } } } } });
    const alienRecord = await prisma.importRecord.findFirstOrThrow({ where: { importJobId: alienJob.id } });
    expect((await browser.request(`/api/personal/migration/${job.id}`)).status).toBe(200);
    expect((await browser.request(`/api/personal/migration/${alienJob.id}`)).status).toBe(409);
    expect((await browser.request(`/api/personal/migration/${alienJob.id}`, { method: "DELETE" })).status).toBe(409);
    expect((await browser.request(`/api/personal/migration/${job.id}/records/${alienRecord.id}`, { method: "DELETE" })).status).toBe(404);
    expect(await prisma.importJob.findUnique({ where: { id: alienJob.id } })).toMatchObject({ status: "REVIEW" });
    expect(await prisma.importRecord.count({ where: { id: alienRecord.id } })).toBe(1);
  });
  it("Server Actions de setup vinculam aceite aos documentos exibidos e não reaproveitam o convite", async () => {
    const page = await fetch(`${origin}/auth/setup-password`, { signal: AbortSignal.timeout(60000) }); expect(page.status).toBe(200); await page.text();
    const content = "Conteúdo sintético de teste HTTP, sem validade como documento legal real.";
    for (const type of ["TERMS", "PRIVACY"] as const) await prisma.legalDocument.create({ data: { type, version: `HTTP-${randomUUID()}`, title: "Documento HTTP sintético", content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(Date.now() - 1000), publishedAt: new Date(Date.now() - 1000) } });
    const token = randomUUID(); const user = await prisma.user.create({ data: { email: `setup-http-${randomUUID()}@example.invalid`, cpfCnpj: "12345678909", birthDate: new Date("1990-01-15T00:00:00Z"), setupToken: token, setupTokenExpiresAt: new Date(Date.now() + 3600000) } });
    const browser = new BrowserSession(); const info = await browser.serverAction("getSetupInfo", [token]); expect(info.status).toBe(200);
    const data = info.result;
    if (typeof data !== "object" || !data || !("termsDocumentId" in data) || typeof data.termsDocumentId !== "string" || !("privacyDocumentId" in data) || typeof data.privacyDocumentId !== "string") throw new Error("Documentos da action não retornados.");
    expect(JSON.stringify(data)).not.toContain(token); expect(JSON.stringify(data)).not.toContain(user.cpfCnpj || "missing");
    const args = [token, "senha-http-setup-sintetica", null, null, true, true, data.termsDocumentId, data.privacyDocumentId, "$undefined", (data as Record<string, unknown>).termsDocumentHash, (data as Record<string, unknown>).privacyDocumentHash];
    // Optional positional arguments are encoded by Flight as undefined, not null.
    args[2] = "$undefined"; args[3] = "$undefined";
    const refused = await browser.serverAction("setupPassword", [token, "senha-http-setup-sintetica", "$undefined", "$undefined", false, true, data.termsDocumentId, data.privacyDocumentId]);
    expect(refused.result).toHaveProperty("error");
    const accepted = await browser.serverAction("setupPassword", args); expect(accepted.result).toEqual({ success: true });
    const replay = await browser.serverAction("setupPassword", args); expect(replay.result).toHaveProperty("error");
    expect(await prisma.legalAcceptance.count({ where: { userId: user.id } })).toBe(2);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ setupToken: null, setupTokenExpiresAt: null, sessionVersion: 1 });
  });
  it("rotas PERSONAL de alunos/equipe/financeiro/pré-cadastro recusam contexto GYM, inclusive para proprietário", async () => {
    const subject = await account(); const workspace = await academy(subject); const browser = await authenticated(subject);
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: subject.user.id, name: "Assessoria fronteira", slug: `personal-boundary-${randomUUID()}`, members: { create: { userId: subject.user.id, role: "OWNER" } } } });
    for (const route of ["/api/personal/clients", "/api/personal/organization", "/api/personal/finance", "/api/personal/clients/pending"]) expect((await browser.request(`${route}?workspaceId=${workspace.id}`)).status).toBe(403);
    await entitlePersonalForTest(browser, subject.user.id, personal.id);
    expect((await browser.request(`/api/personal/clients?workspaceId=${personal.id}`)).status).toBe(200);
    expect((await browser.request(`/api/personal/clients/pending?workspaceId=${personal.id}`)).status).toBe(200);
    const student = await account();
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.user.id, role: "STUDENT" } });
    browser.setWorkspaceCookie(workspace.id);
    expect((await browser.request(`/api/personal/clients/${student.user.id}?workspaceId=${workspace.id}`)).status).toBe(403);
    expect((await browser.request(`/api/personal/clients/${student.user.id}/finance?workspaceId=${workspace.id}`)).status).toBe(403);
    expect((await browser.request(`/api/personal/clients/${student.user.id}/resend-invite?workspaceId=${workspace.id}`, { method: "POST" })).status).toBe(403);
  });
  it("despesa manual percorre criação, retry, baixa parcial, histórico e reversão sem gateway", async () => {
    const subject = await account(); const workspace = await academy(subject); const browser = await authenticated(subject);
    const bank = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, name: "Banco interno HTTP", accountType: "BANK_ACCOUNT", balanceInCents: BigInt(10000) } });
    const category = await prisma.gymExpenseCategory.create({ data: { workspaceId: workspace.id, name: "Categoria HTTP" } });
    const request = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const createBody = { workspaceId: workspace.id, title: "Despesa HTTP", categoryId: category.id, amountInCents: 1000, dueDate: "2026-10-01T12:00:00.000Z", idempotencyKey: randomUUID() };
    const created = await browser.request("/api/gym/finance/expenses", request(createBody)); expect(created.status).toBe(201);
    const expense: unknown = await created.json();
    if (typeof expense !== "object" || !expense || !("id" in expense) || typeof expense.id !== "string") throw new Error("Contrato de despesa inválido.");
    const repeated = await browser.request("/api/gym/finance/expenses", request(createBody)); expect(repeated.status).toBe(201); expect(await repeated.json()).toMatchObject({ id: expense.id });
    const paymentBody = { workspaceId: workspace.id, financialAccountId: bank.id, paidAmountInCents: 300, paymentMethod: "PIX", idempotencyKey: randomUUID() };
    const paid = await browser.request(`/api/gym/finance/expenses/${expense.id}/pay`, request(paymentBody)); expect(paid.status).toBe(200);
    const payment: unknown = await paid.json();
    if (typeof payment !== "object" || !payment || !("paymentId" in payment) || typeof payment.paymentId !== "string") throw new Error("Contrato de pagamento inválido.");
    expect(payment).toMatchObject({ paidAmountInCents: 300, balanceRemainingInCents: 700 });
    const retry = await browser.request(`/api/gym/finance/expenses/${expense.id}/pay`, request(paymentBody)); expect(retry.status).toBe(200); expect(await retry.json()).toMatchObject({ paymentId: payment.paymentId });
    expect((await browser.request(`/api/gym/finance/expenses/${expense.id}/pay`, request({ ...paymentBody, paidAmountInCents: 301 }))).status).toBe(409);
    const listed = await browser.request(`/api/gym/finance/expenses?workspaceId=${workspace.id}`); expect(listed.status).toBe(200); expect(await listed.text()).toContain(payment.paymentId);
    const other = await academy(subject);
    expect((await browser.request(`/api/gym/finance/expenses/${expense.id}/payments/${payment.paymentId}/reverse`, request({ workspaceId: other.id, reversalReason: "Correção HTTP" }))).status).toBe(404);
    expect(await prisma.gymExpensePayment.findUnique({ where: { id: payment.paymentId }, include: { expense: { select: { workspaceId: true } } } })).toMatchObject({ expense: { workspaceId: workspace.id }, expenseId: expense.id, reversedAt: null });
    const reversed = await browser.request(`/api/gym/finance/expenses/${expense.id}/payments/${payment.paymentId}/reverse`, request({ workspaceId: workspace.id, reversalReason: "Correção HTTP sintética" })); expect(reversed.status, await reversed.clone().text()).toBe(200);
    expect((await prisma.gymFinancialAccount.findUniqueOrThrow({ where: { id: bank.id } })).balanceInCents).toBe(BigInt(10000));
    expect((await prisma.gymExpense.findUniqueOrThrow({ where: { id: expense.id } })).paidAmountInCents).toBe(BigInt(0));
    expect(await prisma.gymExpensePayment.count({ where: { expenseId: expense.id } })).toBe(1);
    expect((await browser.request(`/api/gym/finance/expenses?workspaceId=${workspace.id}&limit=10000000`)).status).toBe(400);
  });
  it("biblioteca PERSONAL não expõe nem altera modelos GYM; criação, duplicação de modelo e exclusão PERSONAL são preservadas", async () => {
    const subject = await account(); const academyWorkspace = await academy(subject); const browser = await authenticated(subject);
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: subject.user.id, name: "Assessoria treinos HTTP", slug: `workouts-personal-${randomUUID()}`, members: { create: { userId: subject.user.id, role: "OWNER" } } } });
    await entitlePersonalForTest(browser, subject.user.id, personal.id);
    const gymTemplate = await prisma.workout.create({ data: { workspaceId: academyWorkspace.id, creatorId: subject.user.id, name: "Modelo exclusivo GYM", goal: "Força", difficulty: "Iniciante", duration: "30 minutos" } });
    const post = (body: object, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const body = { workspaceId: personal.id, name: "Modelo PERSONAL HTTP", goal: "Força", difficulty: "Iniciante", duration: "30 minutos", exercises: [] };
    const response = await browser.request("/api/personal/workouts", post(body)); expect(response.status).toBe(201);
    const model: unknown = await response.json();
    if (typeof model !== "object" || !model || !("id" in model) || typeof model.id !== "string") throw new Error("Contrato de modelo inválido.");
    const listed = await browser.request("/api/personal/workouts"); expect(listed.status).toBe(200);
    expect(await listed.text()).not.toContain(gymTemplate.id);
    expect((await browser.request(`/api/personal/workouts/${model.id}`)).status).toBe(200);
    expect((await browser.request(`/api/personal/workouts/${model.id}`, post({ ...body, name: "Modelo atualizado" }, "PUT"))).status).toBe(200);
    const duplicate = await browser.request(`/api/personal/workouts/${model.id}/duplicate`, post({ targetType: "TEMPLATE" })); expect(duplicate.status).toBe(201);
    expect((await browser.request(`/api/personal/workouts/${gymTemplate.id}`)).status).toBe(409);
    expect((await browser.request(`/api/personal/workouts/${gymTemplate.id}`, post(body, "PUT"))).status).toBe(409);
    expect((await browser.request(`/api/personal/workouts/${gymTemplate.id}/duplicate`, post({ targetType: "TEMPLATE" }))).status).toBe(409);
    expect((await browser.request(`/api/personal/workouts/${gymTemplate.id}`, { method: "DELETE" })).status).toBe(409);
    expect((await browser.request(`/api/personal/workouts/${model.id}`, { method: "DELETE" })).status).toBe(204);
    expect(await prisma.workout.findUnique({ where: { id: gymTemplate.id } })).not.toBeNull();
  });
  it("guard GYM vincula o contexto HTTP ao cookie e recusa workspace PERSONAL mesmo para seu proprietário", async () => {
    const subject = await account(); const [a, b] = await Promise.all([academy(subject), academy(subject)]);
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", name: "Assessoria contexto HTTP", slug: `context-personal-${randomUUID()}`, ownerId: subject.user.id, members: { create: { userId: subject.user.id, role: "OWNER" } } } });
    const browser = await authenticated(subject);
    browser.setWorkspaceCookie(a.id);
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${a.id}`)).status).toBe(200);
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${b.id}`)).status).toBe(409);
    browser.setWorkspaceCookie(b.id);
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${b.id}`)).status).toBe(200);
    browser.setWorkspaceCookie(personal.id);
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${personal.id}`)).status).toBe(403);
  });
  it("endpoints PERSONAL de arquivos, saúde, fotos e treinos recusam GYM; leitura e cadastro de arquivo PERSONAL permanecem funcionais", async () => {
    const subject = await account(); const student = await account(); const workspace = await academy(subject);
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.user.id, role: "STUDENT", studentProfile: { create: {} } } });
    const browser = await authenticated(subject);
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: subject.user.id, name: "Assessoria HTTP", slug: `http-personal-${randomUUID()}`, members: { create: [{ userId: subject.user.id, role: "OWNER" }, { userId: student.user.id, role: "STUDENT" }] } } });
    const assistant = await account(); const assistantBrowser = await authenticated(assistant);
    await prisma.workspaceMember.create({ data: { workspaceId: personal.id, userId: assistant.user.id, role: "ASSISTANT" } });
    await entitlePersonalForTest(browser, subject.user.id, personal.id);
    assistantBrowser.setWorkspaceCookie(personal.id);
    for (const resource of ["files", "evaluations", "progress/photos", "workouts"]) {
      expect((await browser.request(`/api/personal/clients/${student.user.id}/${resource}?workspaceId=${workspace.id}`)).status).toBe(403);
      expect((await browser.request(`/api/personal/clients/${student.user.id}/${resource}?workspaceId=${personal.id}`)).status).toBe(200);
    }
    const input = { workspaceId: personal.id, name: "Arquivo PERSONAL HTTP", category: "outros", type: "link", url: "https://example.invalid/document" };
    const post = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const created = await browser.request(`/api/personal/clients/${student.user.id}/files`, post(input)); expect(created.status).toBe(200);
    const result: unknown = await created.json();
    if (typeof result !== "object" || !result || !("id" in result) || typeof result.id !== "string") throw new Error("Contrato PERSONAL inválido.");
    expect((await assistantBrowser.request(`/api/personal/clients/${student.user.id}/files?workspaceId=${personal.id}`)).status).toBe(200);
    expect((await assistantBrowser.request(`/api/personal/clients/${student.user.id}/evaluations?workspaceId=${personal.id}`)).status).toBe(403);
    expect((await assistantBrowser.request(`/api/personal/clients/${student.user.id}/files`, post(input))).status).toBe(403);
    const deleted = await browser.request(`/api/personal/clients/${student.user.id}/files/${result.id}`, { method: "DELETE" }); expect(deleted.status).toBe(204);
    expect((await browser.request(`/api/personal/clients/${student.user.id}/files`, post({ ...input, workspaceId: workspace.id }))).status).toBe(403);
    const privateFile = await prisma.studentFile.create({ data: { workspaceId: workspace.id, studentId: student.user.id, name: "Documento GYM", category: "exames", type: "link", url: "https://example.invalid/document" } });
    expect((await browser.request(`/api/personal/clients/${student.user.id}/files/${privateFile.id}`, { method: "DELETE" })).status).toBe(403);
    expect(await prisma.studentFile.findUnique({ where: { id: privateFile.id } })).not.toBeNull();
  });
  it("armazenamento nega leitura privada e uploads adulterados antes de contactar serviços externos", async () => {
    const subject = await account(); const outsider = await account(); const workspace = await academy(subject);
    const local = await authenticated(subject); const foreign = await authenticated(outsider);
    const unknown = `/api/storage/file?key=${encodeURIComponent(`workspace/${workspace.id}/files/unknown.pdf`)}`;
    expect((await new BrowserSession().request(unknown)).status).toBe(401);
    expect((await local.request(unknown)).status).toBe(404);
    expect((await foreign.request(`/api/storage/file?key=${encodeURIComponent(`workspace/${workspace.id}/chat/${subject.user.id}/attachment-private.pdf`)}`)).status).toBe(403);
    expect((await local.request(`/api/storage/file?key=${encodeURIComponent(`workspace/${workspace.id}/files/../logos/private.pdf`)}`)).status).toBe(400);
    const payload = { workspaceId: workspace.id, fileName: "brand.png", contentType: "image/png", fileSize: 1024, targetType: "logo" };
    const upload = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await foreign.request("/api/storage/presigned", upload(payload))).status).toBe(403);
    expect((await local.request("/api/storage/presigned", upload({ ...payload, fileSize: -1 }))).status).toBe(400);
    expect((await local.request("/api/storage/presigned", upload({ ...payload, fileSize: "1024" }))).status).toBe(400);
    expect((await local.request("/api/storage/presigned", upload({ ...payload, targetType: "campaign_banner" }))).status).toBe(403);
    expect((await local.request("/api/storage/presigned", upload({ ...payload, targetType: "unknown" }))).status).toBe(400);
    expect((await local.request("/api/storage/presigned", upload({ ...payload, contentType: "text/html" }))).status).toBe(400);
  });
  it("Credentials sem prova não contorna MFA; prova é única e sessão revoga após mudança de versão", async () => {
    const subject = await account("USER", true); const unauthorized = new BrowserSession();
    await unauthorized.login(subject.email, subject.password);
    expect(await unauthorized.userId()).toBeNull();
    const policy = await resolveAuthenticationPolicy(subject.user.id); if (!policy) throw new Error("Sem política.");
    const proof = await issueCredentialProof(subject.user.id, policy.user.password || "", authenticationPolicyKey(policy));
    const legitimate = new BrowserSession(); await legitimate.login(subject.email, subject.password, proof);
    expect(await legitimate.userId()).toBe(subject.user.id);
    const replay = new BrowserSession(); await replay.login(subject.email, subject.password, proof);
    expect(await replay.userId()).toBeNull();
    await prisma.user.update({ where: { id: subject.user.id }, data: { sessionVersion: { increment: 1 } } });
    expect(await legitimate.userId()).toBeNull();
  });
  it("API rejeita academia alheia e suspensão, e wallet não oferece operação ativa", async () => {
    const subject = await account(); const foreignOwner = await account();
    const local = await academy(subject); const foreign = await academy(foreignOwner);
    const browser = await authenticated(subject);
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${foreign.id}`)).status).toBe(403);
    const response = await browser.request(`/api/gym/finance/invoices?workspaceId=${local.id}`);
    expect(response.status).toBe(200);
    expect((await browser.request(`/api/gym/finance/wallet?workspaceId=${local.id}`)).status).toBe(410);
    await prisma.workspace.update({ where: { id: local.id }, data: { isActive: false } });
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${local.id}`)).status).toBe(403);
    expect((await new BrowserSession().request(`/api/gym/finance/invoices?workspaceId=${local.id}`)).status).toBe(401);
  });
  it("admin GET/PATCH não devolvem segredos; MFA estrito revoga a sessão efetiva", async () => {
    const admin = await account("SUPERADMIN"); const target = await account(); const browser = await authenticated(admin);
    await prisma.user.update({ where: { id: target.user.id }, data: { twoFactorSecret: "segredo-http-sintetico", twoFactorBackupCodes: ["backup-http-sintetico"], setupToken: randomUUID() } });
    const response = await browser.request(`/api/superadmin/users/${target.user.id}`); expect(response.status).toBe(200);
    const body: unknown = await response.json();
    for (const field of ["password", "setupToken", "twoFactorSecret", "twoFactorBackupCodes", "sessionVersion"]) expect(body).not.toHaveProperty(field);
    const change = await browser.request(`/api/superadmin/users/${target.user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "TRAINER" }) });
    expect(change.status).toBe(200); expect(await change.json()).not.toHaveProperty("password");
    const invalid = await browser.request("/api/superadmin/security/totp/toggle-3fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: "false" }) });
    expect(invalid.status).toBe(400);
    const confirmed = await browser.request("/api/superadmin/security/reauthenticate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: admin.password }) });
    expect(confirmed.status).toBe(200); const confirmation = await confirmed.json();
    const valid = await browser.request("/api/superadmin/security/totp/toggle-3fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: false, reauthenticationProof: confirmation.reauthenticationProof }) });
    expect(valid.status).toBe(200); expect(await browser.userId()).toBeNull();
  });
});

describe("HTTP ciclo local por unidade", () => {
  it("valida contratos reais das rotas, avulsa local, retry revogado e pausa futura sem efeito antecipado", async () => {
    const owner = await account(); const workspace = await academy(owner);
    const unitA = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const unitB = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade B HTTP" } });
    const operator = await account();
    const staff = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.user.id, role: "MANAGER", unitId: unitA.id, roleGrants: { create: { role: "MANAGER", unitId: unitA.id } } } });
    const students = await Promise.all([unitA, unitB].map(async unit => {
      const user = await prisma.user.create({ data: { name: `Aluno ${unit.name} sintético`, birthDate: new Date("1990-01-01T00:00:00Z") } });
      return prisma.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
    }));
    const accountA = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unitA.id, name: "Banco A HTTP", accountType: "BANK_ACCOUNT" } });
    const browser = await authenticated(operator); browser.setWorkspaceCookie(workspace.id);
    const ownerBrowser = await authenticated(owner); ownerBrowser.setWorkspaceCookie(workspace.id);
    const post = (session: BrowserSession, route: string, body: unknown) => session.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const invoiceBody = { idempotencyKey: randomUUID(), workspaceId: workspace.id, studentMemberId: students[0].id, title: "Mensalidade HTTP", dueDate: "2026-11-01", items: [{ itemType: "PLAN_SUBSCRIPTION", description: "Mensalidade", unitPriceInCents: "10000" }] };
    expect((await post(browser, "/api/gym/finance/invoices", { ...invoiceBody, studentMemberId: students[1].id })).status).toBe(403);
    expect((await post(browser, "/api/gym/finance/invoices", { ...invoiceBody, discountPercentage: -1 })).status).toBe(400);
    const invoiceResponse = await post(browser, "/api/gym/finance/invoices", invoiceBody);
    expect(invoiceResponse.status).toBe(201); const invoice = await invoiceResponse.json();
    expect(invoice).toMatchObject({ dueDate: "2026-11-01T03:00:00.000Z", totalInCents: 10000 });
    expect((await post(ownerBrowser, "/api/gym/finance/invoices", { ...invoiceBody, idempotencyKey: randomUUID(), studentMemberId: students[1].id })).status).toBe(201);
    const invoices = await browser.request(`/api/gym/finance/invoices?workspaceId=${workspace.id}`);
    expect(invoices.status).toBe(200); const listed = await invoices.json();
    expect(listed.invoices.map((item: { id: string }) => item.id)).toEqual([invoice.id]);
    expect((await browser.request(`/api/gym/finance/invoices?workspaceId=${workspace.id}&limit=garbage`)).status).toBe(400);
    const paymentBody = { workspaceId: workspace.id, financialAccountId: accountA.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: "3000", allocations: [{ invoiceId: invoice.id, amountInCents: "3000" }], idempotencyKey: randomUUID() };
    const paymentResponse = await post(browser, "/api/gym/finance/payments", paymentBody);
    expect(paymentResponse.status).toBe(201); const payment = await paymentResponse.json();
    expect((await prisma.gymInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).balanceRemainingInCents).toBe(BigInt(7000));
    expect((await browser.request(`/api/gym/finance/payments/${payment.id}/receipt?workspaceId=${workspace.id}`)).status).toBe(200);
    const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano HTTP pausa", versions: { create: { name: "Versão", priceInCents: BigInt(10000), termsText: "Termos sintéticos" } } }, include: { versions: true } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: students[0].id, unitId: unitA.id, planVersionId: plan.versions[0].id, priceInCents: BigInt(10000), startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 30 * 86400000), activatedAt: new Date(), accessGranted: true, status: "ACTIVE", acceptance: { create: { workspaceId: workspace.id, signerUserId: students[0].userId, termsSnapshot: "Aceite sintético", termsVersion: "1" } } } });
    const pauseBody = { workspaceId: workspace.id, startDate: new Date(Date.now() + 86400000).toISOString(), endDate: new Date(Date.now() + 2 * 86400000).toISOString(), reason: "Programação HTTP", extendEndDate: true };
    expect((await post(browser, `/api/gym/enrollments/${enrollment.id}/pause`, { ...pauseBody, extendEndDate: "false" })).status).toBe(400);
    const pauseResponse = await post(browser, `/api/gym/enrollments/${enrollment.id}/pause`, pauseBody);
    expect(pauseResponse.status).toBe(200); expect(await pauseResponse.json()).toMatchObject({ status: "ACTIVE", accessGranted: true });
    expect((await post(browser, "/api/gym/enrollments/cron-expire", { workspaceId: workspace.id })).status).toBe(403);
    expect((await post(browser, `/api/gym/enrollments/${enrollment.id}/resume`, { workspaceId: workspace.id })).status).toBe(200);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: staff.id }, data: { revokedAt: new Date() } });
    expect((await post(browser, "/api/gym/finance/payments", paymentBody)).status).toBe(403);
    expect(await prisma.gymPayment.count({ where: { workspaceId: workspace.id } })).toBe(1);
  });
});

describe("HTTP revisão contratual manual", () => {
  it("aprovação, novo aceite, recebimento e ativação usam contratos reais sem crédito fictício", async () => {
    const owner = await account(); const gym = await academy(owner); const student = await account();
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("1990-01-01T00:00:00Z") } });
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: gym.id } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: student.user.id, unitId: unit.id, role: "STUDENT", studentProfile: { create: {} } } });
    const plan = await prisma.gymPlan.create({ data: { workspaceId: gym.id, name: "Plano HTTP revisão", versions: { create: [{ name: "Original", version: 1, priceInCents: BigInt(10000), termsText: "Termos anteriores sintéticos" }, { name: "Novo", version: 2, priceInCents: BigInt(15000), termsText: "Novos termos sintéticos" }] } }, include: { versions: { orderBy: { version: "asc" } } } });
    const original = await prisma.gymEnrollment.create({ data: { workspaceId: gym.id, studentMemberId: member.id, unitId: unit.id, planVersionId: plan.versions[0].id, priceInCents: BigInt(10000), startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 30 * 86400000), activatedAt: new Date(), accessGranted: true, status: "ACTIVE", acceptance: { create: { workspaceId: gym.id, signerUserId: student.user.id, termsSnapshot: "Aceite HTTP preservado", termsVersion: "1" } } } });
    const bank = await prisma.gymFinancialAccount.create({ data: { workspaceId: gym.id, unitId: unit.id, name: "Banco HTTP revisão", accountType: "BANK_ACCOUNT" } });
    const manager = await account();
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: manager.user.id, role: "MANAGER", unitId: unit.id, roleGrants: { create: { role: "MANAGER", unitId: unit.id } } } });
    const operator = await authenticated(manager); operator.setWorkspaceCookie(gym.id);
    const signer = await authenticated(student); signer.setWorkspaceCookie(gym.id);
    const post = (browser: BrowserSession, path: string, body: unknown) => browser.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const listing = await operator.request(`/api/gym/enrollments?workspaceId=${gym.id}`); expect(listing.status).toBe(200); expect((await listing.json()).enrollments.map((item: { id: string }) => item.id)).toEqual([original.id]);
    expect((await operator.request(`/api/gym/enrollments/${original.id}?workspaceId=${gym.id}`)).status).toBe(200);
    const path = `/api/gym/enrollments/${original.id}/change-plan`;
    const request = { workspaceId: gym.id, newPlanVersionId: plan.versions[1].id, mode: "IMMEDIATE", reason: "Ajuste HTTP autorizado", initialChargeInCents: 5000, financialAdjustmentApproved: true, requestKey: randomUUID() };
    expect((await post(operator, path, { ...request, financialAdjustmentApproved: "true" })).status).toBe(400);
    expect((await post(signer, path, request)).status).toBe(403);
    expect((await post(operator, `/api/gym/enrollments/${original.id}/renew`, { workspaceId: gym.id, durationDays: 1, useScheduledPlanVersion: true })).status).toBe(400);
    const preview = await post(operator, `/api/gym/enrollments/${original.id}/simulate-change-plan`, { workspaceId: gym.id, newPlanVersionId: plan.versions[1].id, mode: "IMMEDIATE" });
    expect(preview.status).toBe(200); expect(await preview.json()).toMatchObject({ automaticCreditInCents: 0, receivedInCents: "0" });
    const proposed = await post(operator, path, request); expect(proposed.status).toBe(200); const next = await proposed.json();
    expect(next).toMatchObject({ status: "PENDING_ACCEPTANCE", initialChargeInCents: 5000 });
    expect(next).not.toHaveProperty("changeRequestFingerprint");
    const agreementPath = `/api/gym/enrollments/${next.id}/accept`;
    const shown = await signer.request(`${agreementPath}?workspaceId=${gym.id}`); expect(shown.status).toBe(200); const contract = await shown.json();
    expect(contract.content).toContain(original.id);
    const admin = await account("SUPERADMIN"); const { token: impersonateToken } = await issueImpersonationStart(admin.user, { targetUserId: student.user.id, reason: "Ensaio sintético de aluno" });
    const support = new BrowserSession(); await support.login(student.email, "", undefined, impersonateToken); expect(await support.userId()).toBe(student.user.id);
    expect((await post(support, agreementPath, { workspaceId: gym.id, accepted: true, contractDigest: contract.contractDigest })).status).toBe(403);
    expect(await prisma.gymContractAcceptance.count({ where: { enrollmentId: next.id } })).toBe(0);
    const confirmed = await post(signer, agreementPath, { workspaceId: gym.id, accepted: true, contractDigest: contract.contractDigest });
    expect(confirmed.status).toBe(200); expect(await confirmed.json()).toMatchObject({ status: "PENDING_ACTIVATION" });
    const invoice = await prisma.gymInvoice.findFirstOrThrow({ where: { enrollmentId: next.id } });
    expect(invoice.totalInCents).toBe(BigInt(5000));
    const activatePath = `/api/gym/enrollments/${next.id}/activate`;
    expect((await post(operator, activatePath, { workspaceId: gym.id, paymentVerified: true })).status).toBe(409);
    const payment = await post(operator, "/api/gym/finance/payments", { workspaceId: gym.id, financialAccountId: bank.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 5000, allocations: [{ invoiceId: invoice.id, amountInCents: 5000 }], idempotencyKey: randomUUID() });
    expect(payment.status).toBe(201);
    const activated = await post(operator, activatePath, { workspaceId: gym.id }); expect(activated.status).toBe(200); expect(await activated.json()).toMatchObject({ status: "ACTIVE", accessGranted: true });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: original.id } })).toMatchObject({ status: "CANCELLED", accessGranted: false });
    expect(await prisma.gymContractAcceptance.findUnique({ where: { enrollmentId: original.id } })).toMatchObject({ termsSnapshot: "Aceite HTTP preservado" });
    const retry = await post(operator, path, request); expect(retry.status).toBe(200); expect(await retry.json()).toMatchObject({ id: next.id });
    expect(await prisma.gymPayment.count({ where: { workspaceId: gym.id } })).toBe(1);
  });
});

describe("HTTP ingresso do responsável", () => {
  async function fixture() {
    const owner = await account(); const workspace = await academy(owner);
    const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const student = await prisma.user.create({ data: { birthDate: new Date("2013-01-15") } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, roleGrants: { create: { role: "STUDENT", unitId: unit.id } }, studentProfile: { create: {} } } });
    const digits = Array.from({ length: 9 }, () => randomInt(10));
    for (const length of [9, 10]) { const digit = digits.reduce((sum, value, i) => sum + value * (length + 1 - i), 0) * 10 % 11; digits.push(digit === 10 ? 0 : digit); }
    const guardian = await prisma.gymGuardian.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, name: "Responsável de ingresso HTTP", cpf: digits.join(""), email: `ingress-${randomUUID()}@example.invalid`, phone: "11900000000", relationship: "MAE" } });
    for (const type of ["TERMS", "PRIVACY"] as const) {
      const content = `Documento ${type} apenas sintético para ingresso HTTP.`;
      await prisma.legalDocument.create({ data: { type, title: "Documento HTTP sintético", version: randomUUID(), content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } });
    }
    const operator = await authenticated(owner);
    const post = (browser: BrowserSession, path: string, body: object) => browser.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const route = `/api/gym/guardians/${guardian.id}/invite`;
    return { owner, workspace, unit, student, member, guardian, operator, post, route };
  }
  async function invite(f: Awaited<ReturnType<typeof fixture>>) {
    const response = await f.post(f.operator, f.route, { workspaceId: f.workspace.id, confirmed: true }); expect(response.status).toBe(201); expect(response.headers.get("cache-control")).toBe("no-store");
    const issued = guardianInvitationIssuedSchema.parse(await response.json());
    const token = new URL(issued.invitationPath, origin).searchParams.get("token")!;
    const anonymous = new BrowserSession(); const loaded = await anonymous.request(`/api/guardian/ingress?token=${token}`); expect(loaded.status).toBe(200);
    const info = guardianInvitationInfoSchema.parse(await loaded.json());
    return { token, issued, anonymous, info, input: { token, mode: "CREATE", cpf: f.guardian.cpf, birthDate: "1990-01-15", password: "senha-sintetica-ingresso-http", acceptedTerms: true, acceptedPrivacy: true, termsId: info.terms.id, termsHash: info.terms.hash, privacyId: info.privacy.id, privacyHash: info.privacy.hash } };
  }
  it("conferência explícita emite convite de uso único; conta nova entra com senha real no portal sem ingressar na equipe", async () => {
    const f = await fixture(); const anonymous = new BrowserSession();
    expect((await f.post(anonymous, f.route, { workspaceId: f.workspace.id, confirmed: true })).status).toBe(401);
    expect((await f.post(f.operator, f.route, { workspaceId: f.workspace.id, confirmed: true })).status).toBe(409);
    expect((await f.post(f.operator, `/api/gym/guardians/${f.guardian.id}/verify`, { workspaceId: f.workspace.id, notes: "Conferência sintética de identidade e representação registrada no teste HTTP." })).status).toBe(200);
    expect((await f.post(f.operator, f.route, { workspaceId: f.workspace.id })).status).toBe(400);
    const other = await academy(f.owner);
    expect((await f.post(f.operator, f.route, { workspaceId: other.id, confirmed: true })).status).toBe(409);
    const invitation = await invite(f);
    expect((await anonymous.request("/api/guardian/ingress", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(invitation.input) })).status).toBe(415);
    expect((await anonymous.request("/api/guardian/ingress", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://external.invalid" }, body: JSON.stringify(invitation.input) })).status).toBe(403);
    expect(await prisma.verificationToken.count({ where: { token: invitation.token } })).toBe(0);
    expect(await prisma.verificationToken.count({ where: { token: createHash("sha256").update(invitation.token).digest("hex") } })).toBe(1);
    const screen = await anonymous.request(invitation.issued.invitationPath); expect(screen.status).toBe(200); const html = await screen.text(); expect(html).toContain("data-slot=\"skeleton\""); expect(html).toContain("no-referrer");
    expect((await f.post(anonymous, "/api/guardian/ingress", { ...invitation.input, userId: f.owner.user.id })).status).toBe(400);
    const claimed = await f.post(anonymous, "/api/guardian/ingress", invitation.input); expect(claimed.status).toBe(200); expect(await claimed.json()).toMatchObject({ success: true, destination: "/guardian/dependents" });
    expect((await f.post(anonymous, "/api/guardian/ingress", invitation.input)).status).toBe(409);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.guardian.email! } });
    await anonymous.login(user.email!, invitation.input.password); expect(await anonymous.userId()).toBe(user.id);
    const dependents = await anonymous.request("/api/guardian/dependents"); expect(dependents.status).toBe(200);
    const rows = await dependents.json(); expect(rows).toHaveLength(1); expect(guardianDependentSchema.parse(rows[0])).toMatchObject({ guardianId: f.guardian.id });
    expect(await prisma.workspaceMember.count({ where: { userId: user.id } })).toBe(0);
    const legal = await prisma.legalAcceptance.findMany({ where: { userId: user.id } }); expect(legal).toHaveLength(2); expect(legal.every(row => row.representedUserId === null && row.source === "GUARDIAN_INGRESS")).toBe(true);
    expect((await anonymous.request("/guardian/dependents")).status).toBe(200);
    f.operator.setWorkspaceCookie(f.workspace.id);
    const management = await f.operator.request(`/gym/students?workspaceId=${f.workspace.id}`); expect(management.status).toBe(200);
  });
  it("conta existente exige login próprio e preserva senha; documento alterado, reemissão e revogação bloqueiam consumo", async () => {
    const f = await fixture();
    await f.post(f.operator, `/api/gym/guardians/${f.guardian.id}/verify`, { workspaceId: f.workspace.id, notes: "Conferência HTTP sintética de documentos realizada." });
    const first = await invite(f); const current = await invite(f);
    expect((await first.anonymous.request(`/api/guardian/ingress?token=${first.token}`)).status).toBe(409);
    const existing = await account(); const updated = await prisma.user.update({ where: { id: existing.user.id }, data: { email: f.guardian.email, cpfCnpj: f.guardian.cpf, birthDate: new Date("1990-01-15") } });
    expect((await f.post(current.anonymous, "/api/guardian/ingress", current.input)).status).toBe(409);
    const { password: _password, cpf: _cpf, birthDate: _birth, ...base } = current.input; const link = { ...base, mode: "LINK" };
    expect((await f.post(current.anonymous, "/api/guardian/ingress", link)).status).toBe(401);
    expect((await f.post(f.operator, "/api/guardian/ingress", link)).status).toBe(403);
    const parent = await authenticated({ ...existing, user: updated, email: updated.email! });
    const admin = await account("SUPERADMIN"); const { token: impersonateToken } = await issueImpersonationStart(admin.user, { targetUserId: updated.id, reason: "Ensaio sintético de ingresso" });
    const support = new BrowserSession(); await support.login(updated.email!, "", undefined, impersonateToken);
    expect(await support.userId()).toBe(updated.id); expect((await f.post(support, "/api/guardian/ingress", link)).status).toBe(403);
    const doc = await prisma.legalDocument.findUniqueOrThrow({ where: { id: current.info.privacy.id } }); const content = doc.content + " Revisão HTTP sintética.";
    await prisma.legalDocument.update({ where: { id: doc.id }, data: { content, contentHash: calculateDocumentHash(content) } });
    expect((await f.post(parent, "/api/guardian/ingress", link)).status).toBe(409);
    const info = guardianInvitationInfoSchema.parse(await (await parent.request(`/api/guardian/ingress?token=${current.token}`)).json());
    expect((await f.post(parent, "/api/guardian/ingress", { ...link, privacyHash: info.privacy.hash })).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: updated.id } })).password).toBe(existing.user.password);
    const next = await invite(f);
    await prisma.gymGuardian.update({ where: { id: f.guardian.id }, data: { revokedAt: new Date() } });
    expect((await f.post(parent, "/api/guardian/ingress", { ...link, token: next.token, privacyHash: info.privacy.hash })).status).toBe(409);
    expect(await prisma.legalAcceptance.count({ where: { userId: updated.id } })).toBe(2);
  });
});

describe("HTTP personal afiliado", () => {
  async function fixture() {
    const owner = await account(), personal = await account();
    await prisma.user.update({ where: { id: personal.user.id }, data: { birthDate: new Date("1990-01-15") } });
    const workspace = await academy(owner), unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    const member = await prisma.workspaceMember.create({ data: { userId: personal.user.id, workspaceId: workspace.id, role: "TRAINER", unitId: unit.id, roleGrants: { create: { role: "TRAINER", unitId: unit.id } } } });
    const browser = await authenticated(personal); browser.setWorkspaceCookie(workspace.id);
    return { owner, personal, workspace, unit, member, browser };
  }
  it("USER opera a mesma área PERSONAL com papel local e não recebe superfícies comerciais", async () => {
    const f = await fixture();
    const page = await f.browser.request("/personal/academy"); expect(page.status).toBe(200);
    const html = await page.text(); expect(html).toContain("Alunos"); expect(html).not.toContain("Carteira Atlas Pay"); expect(html).not.toContain("Funil CRM");
    const direct = await f.browser.request("/personal/finance"); expect(direct.status).toBe(307); expect(direct.headers.get("location")).toContain("/personal/academy");
    for (const path of ["/api/personal/subscription", "/api/personal/dashboard?workspaceId=" + f.workspace.id, "/api/personal/organization?workspaceId=" + f.workspace.id, "/api/personal/crm?workspaceId=" + f.workspace.id]) expect((await f.browser.request(path)).status).toBe(403);
    expect((await f.browser.request("/api/personal/wallet/onboarding", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin! }, body: "{}" })).status).toBe(403);
    expect(await prisma.paymentProviderAccount.count({ where: { personalUserId: f.personal.user.id } })).toBe(0);
    expect(await prisma.freeTrial.findUnique({ where: { userId: f.personal.user.id } })).toBeNull();
  });
  it("cria assessoria própria privada, troca contexto por action e conserva paywall sem bloquear academia", async () => {
    const f = await fixture(); await f.browser.request("/personal/academy");
    const created = (await f.browser.serverAction("createWorkspace", [{ name: "Assessoria HTTP privada", slug: "affiliated-" + randomUUID() }])).result;
    const { workspace: { id: privateId } } = z.object({ success: z.literal(true), workspace: z.object({ id: z.string() }) }).parse(created);
    expect((await f.browser.serverAction("selectActiveWorkspace", [privateId])).result).toHaveProperty("success", true);
    expect((await f.browser.request("/personal/dashboard")).status).toBe(200);
    expect((await f.browser.request("/api/personal/dashboard?workspaceId=" + privateId)).status).toBe(200);
    expect(await prisma.workspaceMember.count({ where: { workspaceId: privateId } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.personal.user.id } })).role).toBe("USER");
    await prisma.freeTrial.update({ where: { userId: f.personal.user.id }, data: { isActive: false } });
    expect((await f.browser.request("/api/personal/dashboard?workspaceId=" + privateId)).status).toBe(402);
    const expired = await f.browser.request("/personal/dashboard"); expect(expired.status).toBe(307); expect(expired.headers.get("location")).toContain("/subscription-expired");
    expect((await f.browser.request("/api/personal/subscription")).status).toBe(200);
    const landing = await f.browser.request("/dashboard"); expect(landing.status).toBe(307); expect(landing.headers.get("location")).toContain("/select-workspace?academy=1");
    expect((await f.browser.serverAction("selectActiveWorkspace", [f.workspace.id])).result).toHaveProperty("success", true);
    expect((await f.browser.request("/personal/academy")).status).toBe(200);
    expect(await prisma.freeTrial.count({ where: { userId: f.personal.user.id } })).toBe(1);
  });
  it("agenda HTTP mantém autor, recusa origem e campos adulterados e revogação bloqueia sessão existente", async () => {
    const f = await fixture(), route = "/api/gym/agenda";
    const input = { workspaceId: f.workspace.id, title: "Agenda HTTP privada", time: "09:00", type: "lembrete", date: "2026-10-12" };
    const post = (body: object, value = origin!) => f.browser.request(route, { method: "POST", headers: { "Content-Type": "application/json", Origin: value }, body: JSON.stringify(body) });
    expect((await post(input, "https://external.invalid")).status).toBe(403);
    expect((await post({ ...input, authorId: f.owner.user.id })).status).toBe(400);
    expect((await post({ ...input, type: "financeiro" })).status).toBe(400);
    const created = await post(input); expect(created.status).toBe(201); const task = await created.json();
    const list = await f.browser.request(route + "?workspaceId=" + f.workspace.id + "&date=2026-10-12"); expect(list.status).toBe(200); expect(await list.json()).toMatchObject({ dailyAgenda: [{ id: task.id }] });
    const changed = await f.browser.request(route, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin! }, body: JSON.stringify({ workspaceId: f.workspace.id, taskId: task.id, completed: true }) }); expect(changed.status).toBe(200);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.member.id }, data: { revokedAt: new Date() } });
    expect((await post(input)).status).toBe(403);
    const page = await f.browser.request("/personal/academy"); expect(page.status).toBe(307); expect(page.headers.get("location")).toContain("/select-workspace");
  });
  it("checkout exige identidade válida e gateway; configuração ausente nunca aprova assinatura", async () => {
    const f = await fixture(); await f.browser.request("/personal/academy");
    const created = (await f.browser.serverAction("createWorkspace", [{ name: "Assessoria HTTP cobrança", slug: "billing-" + randomUUID() }])).result;
    const { workspace: { id } } = z.object({ success: z.literal(true), workspace: z.object({ id: z.string() }) }).parse(created);
    await f.browser.serverAction("selectActiveWorkspace", [id]);
    const plan = await prisma.plan.create({ data: { name: "Plano de cobrança sintético", price: 49, interval: "month", maxStudents: 10, maxWorkspaces: 1 } });
    const post = (body: unknown, requestOrigin = origin!) => f.browser.request("/api/personal/subscription", { method: "POST", headers: { "Content-Type": "application/json", Origin: requestOrigin }, body: JSON.stringify(body) });
    const valid = { planId: plan.id, billing: { taxId: "52998224725", cellphone: "11900000000" } };
    expect((await post(valid, "https://external.invalid")).status).toBe(403);
    expect((await post({ planId: plan.id })).status).toBe(400);
    expect((await post({ ...valid, billing: { ...valid.billing, taxId: "11111111111" } })).status).toBe(400);
    expect((await post(valid)).status).toBe(503);
    expect(await prisma.transaction.count({ where: { userId: f.personal.user.id } })).toBe(0);
    expect(await prisma.subscription.count({ where: { userId: f.personal.user.id } })).toBe(0);
    await prisma.freeTrial.update({ where: { userId: f.personal.user.id }, data: { isActive: false } });
    await prisma.subscription.create({ data: { userId: f.personal.user.id, planId: plan.id, status: "active", startDate: new Date(Date.now() - 5 * 86400000), endDate: new Date(Date.now() - 86400000) } });
    const expired = await f.browser.request("/api/personal/subscription"); expect(expired.status).toBe(200); expect((await expired.json()).currentSubscription.status).toBe("expired");
  });
});

describe("HTTP notificações compartilhadas", () => {
  it("sino usa só usuário e contexto atual; tenant estrangeiro, notificação privada e vínculo revogado são negados", async () => {
    const subject = await account(), other = await account(), gym = await academy(subject), foreign = await academy(other);
    const personal = await prisma.workspace.create({ data: { ownerId: subject.user.id, type: "PERSONAL", name: "Assessoria notificação sintética", slug: randomUUID(), members: { create: { userId: subject.user.id, role: "OWNER" } } } });
    const create = (workspaceId: string, userId: string) => prisma.notification.create({ data: { workspaceId, userId, type: "SYSTEM_ALERT", title: "Notificação HTTP sintética", description: "Somente deste contexto", category: "SYSTEM" } });
    const current = await create(gym.id, subject.user.id), privateNotice = await create(personal.id, subject.user.id), anotherUser = await create(gym.id, other.user.id);
    const browser = await authenticated(subject); browser.setWorkspaceCookie(gym.id);
    expect((await new BrowserSession().request("/api/notifications")).status).toBe(401);
    const list = await browser.request("/api/notifications?workspaceId=" + gym.id); expect(list.status).toBe(200); expect((await list.json()).map((row: { id: string }) => row.id)).toEqual([current.id]);
    expect((await browser.request("/api/notifications?workspaceId=" + foreign.id)).status).toBe(409);
    const mutate = (id: string) => browser.request("/api/notifications/" + id + "?workspaceId=" + gym.id, { method: "PATCH", headers: { Origin: origin! } });
    expect((await mutate(privateNotice.id)).status).toBe(404); expect((await mutate(anotherUser.id)).status).toBe(404); expect((await mutate(current.id)).status).toBe(200);
    expect((await browser.request("/api/personal/notifications?workspaceId=" + gym.id)).status).toBe(403);
    await prisma.workspaceMember.updateMany({ where: { userId: subject.user.id, workspaceId: gym.id }, data: { isActive: false } });
    expect((await browser.request("/api/notifications?workspaceId=" + gym.id)).status).toBe(403);
    expect(await prisma.notification.findUnique({ where: { id: privateNotice.id } })).toMatchObject({ isRead: false });
  });
});
