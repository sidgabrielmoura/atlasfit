import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const provider = vi.hoisted(() => ({ email: vi.fn(), publish: vi.fn(), push: vi.fn(), messaging: true }));
vi.mock("@/lib/resend", () => ({ resend: { emails: { send: provider.email } } }));
vi.mock("@/lib/ably", () => ({ ablyRest: { channels: { get: () => ({ publish: provider.publish }) } } }));
vi.mock("@/lib/firebase-admin", () => ({ getAdminMessaging: () => provider.messaging ? { send: provider.push } : null }));
vi.mock("@/auth", () => ({ auth: async () => null }));
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";
import { enqueueNotification, notificationDeliveryStatus } from "@/lib/notifications/delivery";
import { processDelivery } from "@/lib/delivery/outbox";
import { deliveryHandler } from "@/lib/delivery/worker";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { processRecurringPaymentsForMember } from "@/lib/recurrence";
import { isCronAuthorized } from "@/lib/cron-authorization";
import { getDeliveryHealth, recordCronResult } from "@/lib/cron-health";
import { GET as recurrence } from "@/app/api/cron/process-recurrence/route";
import { GET as gyms } from "@/app/api/cron/gym-recurrence/route";
import { GET as deliveries } from "@/app/api/cron/deliveries/route";
import { GET as engage } from "@/app/api/cron/engage-push/route";
import { EngagePushService } from "@/lib/engage/push-service";

const db = new URL(process.env.DATABASE_URL || "http://invalid");
const freshSchema = process.env.GYM_FINAL_SCHEMA_TEST === "1" && /^\/atlasfit_completion_tests_[a-f0-9]{32}$/.test(db.pathname);
if (db.hostname !== "127.0.0.1" || db.port !== "56432" || (db.pathname !== "/atlasfit_gym_stabilization_20261001" && !freshSchema)) throw Error("Banco descartável obrigatório.");
process.env.RESEND_API_KEY = "synthetic-provider-stub";
beforeEach(() => { provider.email.mockReset().mockResolvedValue({ data: { id: "email-ack" }, error: null }); provider.publish.mockReset().mockResolvedValue({}); provider.push.mockReset().mockResolvedValue("fcm-ack"); provider.messaging = true; });
afterAll(() => prisma.$disconnect());
async function fixture() {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: "Destinatário sintético" } });
  const input = { userId: user.id, requestKey: randomUUID(), type: "SYSTEM", category: "SYSTEM", title: "Mensagem sintética", description: "Conteúdo <script>seguro</script>", deepLink: "/student/workouts" };
  return { user, input };
}
const jobs = (id: string) => prisma.deliveryOutbox.findMany({ where: { requestKey: { startsWith: `notification-delivery:${id}:` } }, orderBy: { channel: "asc" } });

describe("Notificações duráveis — PostgreSQL e transportes controlados", () => {
  it("concorrência/replay conservam uma mensagem, intenção conflitante é recusada e nenhum envio ocorre antes do commit", async () => {
    const f = await fixture();
    const results = await Promise.all(Array.from({ length: 4 }, () => NotificationService.sendNotification(f.input)));
    expect(new Set(results.map(row => row.dispatchId)).size).toBe(1);
    expect(results[0]).toMatchObject({ pushSent: false, successCount: 0, deliveryStatus: "QUEUED" });
    expect(await prisma.notification.count({ where: { userId: f.user.id } })).toBe(1);
    expect(await jobs(results[0].dispatchId)).toHaveLength(2);
    expect(provider.email).not.toHaveBeenCalled(); expect(provider.publish).not.toHaveBeenCalled();
    await expect(NotificationService.sendNotification({ ...f.input, title: "Outra intenção" })).rejects.toMatchObject({ code: "DELIVERY_IDEMPOTENCY_CONFLICT" });
    await expect(serializableTransaction(async tx => { await enqueueNotification(tx, { ...f.input, requestKey: randomUUID() }); throw Error("rollback"); })).rejects.toThrow("rollback");
    expect(await prisma.notification.count({ where: { userId: f.user.id } })).toBe(1);
    await expect(NotificationService.sendNotification({ ...f.input, requestKey: randomUUID(), deepLink: "https://foreign.example/phishing" })).rejects.toMatchObject({ code: "INVALID_NOTIFICATION_LINK" });
  });
  it("email falha/recupera com mesma renderização/chave; status permanece restrito ao destinatário", async () => {
    const f = await fixture(), receipt = await NotificationService.sendNotification(f.input);
    const list = await jobs(receipt.dispatchId), email = list.find(row => row.channel === "EMAIL")!;
    const now = new Date();
    provider.email.mockResolvedValueOnce({ data: null, error: { name: "internal_server_error" } });
    expect(await processDelivery(email.id, deliveryHandler, now)).toMatchObject({ status: "RETRY" });
    expect(await processDelivery(email.id, deliveryHandler, new Date(now.getTime() + 31000))).toMatchObject({ status: "SENT" });
    expect(provider.email.mock.calls[0]).toEqual(provider.email.mock.calls[1]);
    expect(provider.email.mock.calls[0][0].html).toContain("&lt;script&gt;");
    expect(provider.email.mock.calls[0][0]).not.toHaveProperty("guard");
    expect(await processDelivery(email.id, deliveryHandler)).toMatchObject({ status: "NOT_CLAIMED" });
    expect(await serializableTransaction(tx => notificationDeliveryStatus(tx, randomUUID(), receipt.dispatchId))).toBeNull();
    expect(await serializableTransaction(tx => notificationDeliveryStatus(tx, f.user.id, receipt.dispatchId))).toMatchObject({ channels: expect.arrayContaining([{ channel: "EMAIL", status: "SENT", count: 1 }]) });
    expect(await processDelivery(list.find(row => row.channel === "ABLY")!.id, deliveryHandler)).toMatchObject({ status: "SENT" });
    expect(provider.publish.mock.calls[0][0]).toMatchObject({ name: "notification:new", id: expect.stringMatching(/:0$/) });
  });
  it("push conserva dispositivos do mesmo navegador; aceite não prova exibição e resultado incerto exige revisão", async () => {
    const f = await fixture();
    for (let n = 0; n < 2; n++) await NotificationService.registerDevice({ userId: f.user.id, firebaseToken: randomUUID(), platform: "WEB", browser: "Chrome" });
    const receipt = await NotificationService.sendNotification(f.input), push = (await jobs(receipt.dispatchId)).filter(row => row.channel === "PUSH");
    expect(receipt.devicesCount).toBe(2);
    expect(await processDelivery(push[0].id, deliveryHandler)).toMatchObject({ status: "SENT" });
    expect(await prisma.notification.findUnique({ where: { id: receipt.notificationId } })).toMatchObject({ delivered: false });
    provider.push.mockRejectedValueOnce(Error("network outcome unknown"));
    expect(await processDelivery(push[1].id, deliveryHandler)).toMatchObject({ status: "REVIEW_REQUIRED" });
    expect(await processDelivery(push[1].id, deliveryHandler)).toMatchObject({ status: "NOT_CLAIMED" });
    expect(provider.push).toHaveBeenCalledTimes(2);
  });
  it("revalida preferências, email, dispositivo e acesso antes do envio; não remove token de outra conta", async () => {
    const f = await fixture();
    const device = await prisma.notificationDevice.create({ data: { userId: f.user.id, firebaseToken: randomUUID() } });
    const receipt = await NotificationService.sendNotification(f.input), list = await jobs(receipt.dispatchId);
    const other = await prisma.user.create({ data: {} });
    await prisma.notificationDevice.update({ where: { id: device.id }, data: { userId: other.id } });
    expect(await processDelivery(list.find(row => row.channel === "PUSH")!.id, deliveryHandler)).toMatchObject({ status: "SKIPPED" });
    await prisma.user.update({ where: { id: f.user.id }, data: { email: `${randomUUID()}@example.invalid` } });
    expect(await processDelivery(list.find(row => row.channel === "EMAIL")!.id, deliveryHandler)).toMatchObject({ status: "SKIPPED" });
    await prisma.notificationPreference.create({ data: { userId: f.user.id, settings: { SYSTEM: { inApp: false } } } });
    expect(await processDelivery(list.find(row => row.channel === "ABLY")!.id, deliveryHandler)).toMatchObject({ status: "SKIPPED" });
    expect(provider.push).not.toHaveBeenCalled(); expect(provider.email).not.toHaveBeenCalled(); expect(provider.publish).not.toHaveBeenCalled();
    expect(await prisma.notificationDevice.findUnique({ where: { id: device.id } })).toMatchObject({ userId: other.id });
    await NotificationService.unregisterDevice(device.firebaseToken, f.user.id);
    expect(await prisma.notificationDevice.findUnique({ where: { id: device.id } })).toBeTruthy();
  });
  it("configuração FCM ausente conserva pendência e recupera; lease após tentativa incerta não reenvia", async () => {
    const f=await fixture();await NotificationService.registerDevice({userId:f.user.id,firebaseToken:randomUUID()});
    const receipt=await NotificationService.sendNotification(f.input), job=(await jobs(receipt.dispatchId)).find(row=>row.channel==="PUSH")!, now=new Date();
    provider.messaging=false;
    expect(await processDelivery(job.id,deliveryHandler,now)).toMatchObject({status:"RETRY",code:"PUSH_NOT_CONFIGURED"});
    expect(provider.push).not.toHaveBeenCalled();provider.messaging=true;
    expect(await processDelivery(job.id,deliveryHandler,new Date(now.getTime()+31000))).toMatchObject({status:"SENT"});
    const other=await NotificationService.sendNotification({...f.input,requestKey:randomUUID()}), expired=(await jobs(other.dispatchId)).find(row=>row.channel==="PUSH")!;
    await prisma.deliveryOutbox.update({where:{id:expired.id},data:{status:"PROCESSING",attempts:1,firstAttemptAt:now,leaseExpiresAt:now,leaseToken:randomUUID()}});
    expect(await processDelivery(expired.id,deliveryHandler,new Date(now.getTime()+121000))).toMatchObject({status:"REVIEW_REQUIRED"});
    expect(provider.push).toHaveBeenCalledTimes(1);
  });
  it("campanha concorrente grava log/fan-out/contador juntos; falha não consome o destinatário do dia", async () => {
    const f=await fixture();
    const campaign=await prisma.engagePushNotification.create({data:{title:"Campanha sintética",body:"Lembrete",creatorId:f.user.id}});
    const input={notificationId:campaign.id,user:{id:f.user.id,name:"Aluno",role:"STUDENT"},titleTemplate:campaign.title,bodyTemplate:campaign.body,deepLink:"/student/workouts"};
    const result=await Promise.all([EngagePushService.dispatchPushToUser(input),EngagePushService.dispatchPushToUser(input)]);
    expect(result.every(row=>row.success)).toBe(true);expect(result.filter(row=>row.queued)).toHaveLength(1);
    expect(await prisma.engagePushLog.count({where:{notificationId:campaign.id,userId:f.user.id}})).toBe(1);
    expect(await prisma.engagePushNotification.findUnique({where:{id:campaign.id}})).toMatchObject({sentCount:1,deliveredCount:0});
    const failed=await prisma.engagePushNotification.create({data:{title:"Campanha inválida",body:"Lembrete",creatorId:f.user.id}});
    expect(await EngagePushService.dispatchPushToUser({...input,notificationId:failed.id,deepLink:"https://foreign.example"})).toMatchObject({success:false});
    expect(await prisma.engagePushLog.count({where:{notificationId:failed.id}})).toBe(0);
    expect(await prisma.engagePushNotification.findUnique({where:{id:failed.id}})).toMatchObject({sentCount:0});
    const test=await EngagePushService.sendTestPush({notificationId:campaign.id,targetUserId:f.user.id});
    expect(test).toMatchObject({success:true,pushSent:false,deliveryStatus:"QUEUED",inAppDelivered:true});
    expect(await prisma.engagePushLog.findUnique({where:{id:test.logId}})).toMatchObject({status:"QUEUED",errorReason:"dispatch:"+test.dispatchId});
  });
  it("recorrência concorrente cria dívida pendente com envios atômicos, nunca recibo; GYM não entra na rotina PERSONAL", async () => {
    const f = await fixture(), owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid` } });
    const workspace = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: owner.id, name: "Recorrência sintética", slug: randomUUID() } });
    const due = new Date(Date.now() - 3600000);
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: f.user.id, role: "STUDENT", billingControlType: "AUTOMATIC", billingIsActive: true, billingPrice: 100, billingNextDueDate: due, billingPeriodicity: "MENSAL" } });
    await Promise.all([processRecurringPaymentsForMember(member.id), processRecurringPaymentsForMember(member.id)]);
    expect(await prisma.workspacePayment.findMany({ where: { workspaceId: workspace.id } })).toMatchObject([{ status: "pendente", paidAt: null }]);
    expect(await prisma.notification.count({ where: { workspaceId: workspace.id } })).toBe(2);
    expect(await prisma.deliveryOutbox.count({ where: { requestKey: { startsWith: `notification:${f.user.id}:` } } })).toBe(1);
    expect(provider.email).not.toHaveBeenCalled();
    const notifications = await prisma.notification.findMany({ where: { workspaceId: workspace.id } });
    expect(notifications.every(row => row.description.includes("pendente de pagamento"))).toBe(true);
    const gym = await prisma.workspace.create({ data: { type: "GYM", ownerId: owner.id, name: "Academia sintética", slug: randomUUID() } });
    const gymMember = await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: f.user.id, role: "STUDENT", billingControlType: "AUTOMATIC", billingIsActive: true, billingPrice: 100, billingNextDueDate: due, billingPeriodicity: "MENSAL" } });
    expect(await processRecurringPaymentsForMember(gymMember.id)).toMatchObject({ generated: 0 });
    expect(await prisma.workspacePayment.count({ where: { workspaceId: workspace.id } })).toBe(1);
  });
});

describe("Cron — autenticação fail-closed e observabilidade", () => {
  it("quatro rotas negam configuração ausente, segredos antigos/query e token inválido sem escrever", async () => {
    const original = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      const before = await prisma.auditLog.count();
      for (const route of [recurrence, gyms, deliveries, engage]) expect((await route(new Request("http://localhost/?key=atlasfit_cron_secret_engage"))).status).toBe(401);
      process.env.CRON_SECRET = "synthetic-dedicated-secret";
      for (const route of [recurrence, gyms, deliveries, engage]) {
        expect((await route(new Request("http://localhost/?key=synthetic-dedicated-secret", { headers: { Authorization: "Bearer 0905748599229Si" } }))).status).toBe(401);
      }
      expect(isCronAuthorized(new Request("http://localhost", { headers: { Authorization: "Bearer synthetic-dedicated-secret" } }))).toBe(true);
      expect(await prisma.auditLog.count()).toBe(before);
    } finally { if (original === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = original; }
  });
  it("monitor diferencia ausência, atraso e falha; backlog vem de agregação sem conteúdo pessoal", async () => {
    const old = new Date(Date.now() - 3600000);
    await prisma.scheduledJobState.upsert({ where: { id: "deliveries" }, create: { id: "deliveries", success: true, lastRunAt: old, lastSuccessAt: old, durationMs: 1 }, update: { success: true, lastRunAt: old, lastSuccessAt: old, durationMs: 1 } });
    const stale = await serializableTransaction(tx => getDeliveryHealth(tx, new Date(Date.now() + 3600000)));
    expect(stale.jobs.find(job => job.id === "deliveries")?.status).toBe("STALE");
    await recordCronResult("deliveries", false, 12);
    expect((await serializableTransaction(tx => getDeliveryHealth(tx))).jobs.find(job => job.id === "deliveries")?.status).toBe("FAILED");
    await recordCronResult("deliveries", true, 12);
    const healthy = await serializableTransaction(tx => getDeliveryHealth(tx));
    expect(healthy.jobs.find(job => job.id === "deliveries")?.status).toBe("HEALTHY");
    expect(JSON.stringify(healthy)).not.toMatch(/payloadEncrypted|firebaseToken|example.invalid/);
  });
});
