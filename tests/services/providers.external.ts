import { randomUUID, createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { ablyRest } from "@/lib/ably";
import { storageService, s3Client } from "@/lib/storage.service";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { enqueueDelivery, processDelivery } from "@/lib/delivery/outbox";
import { deliveryHandler } from "@/lib/delivery/worker";
import { resend } from "@/lib/resend";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.GYM_EXTERNAL_SMOKE !== "authorized-20261007" || database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Verificação externa requer autorização e banco descartável.");
afterAll(async () => { await prisma.$disconnect(); s3Client.destroy(); });

describe("Serviços reais com conteúdo sintético", () => {
  it("R2 aceita PNG binário assinado, HEAD/GET conferem bytes e exclusão remove só o objeto criado", async () => {
    const key = `__atlasfit_stabilization_tests__/20261007/${randomUUID()}.png`;
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
    let uploaded = false;
    try {
      const signed = await storageService.getPresignedUploadUrl(key, "image/png", 120, bytes.length);
      const response = await fetch(signed, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(bytes.length) }, body: bytes });
      expect(response.status).toBe(200); uploaded = true;
      expect(await storageService.getObjectMetadata(key)).toMatchObject({ size: bytes.length, contentType: "image/png" });
      const object = await storageService.getObjectStream(key);
      const received = await object.body!.transformToByteArray();
      expect(createHash("sha256").update(received).digest("hex")).toBe(createHash("sha256").update(bytes).digest("hex"));
      const bad = await fetch(signed, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(bytes.length + 1) }, body: Buffer.concat([bytes, Buffer.from([0])]) });
      expect(bad.status).toBe(403);
      expect(await storageService.getObjectMetadata(key)).toMatchObject({ size: bytes.length });
      const inventory = await s3Client.send(new ListObjectsV2Command({ Bucket: storageService.getBucketName(), Prefix: "__atlasfit_stabilization_tests__/20261007/", MaxKeys: 100 }));
      expect(inventory.Contents?.some(item => item.Key === key)).toBe(true);
    } finally { if (uploaded) await storageService.deleteObject(key); }
    await expect(s3Client.send(new HeadObjectCommand({ Bucket: storageService.getBucketName(), Key: key }))).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });
  });
  it("Ably confirma publicação da outbox e deduplica o mesmo ID no canal sintético", async () => {
    expect(ablyRest).not.toBeNull();
    const channelName = `user:synthetic-stabilization-${randomUUID()}`;
    const job = await serializableTransaction(tx => enqueueDelivery(tx, { requestKey: randomUUID(), channel: "ABLY", payload: { channelName, eventName: "wallet:updated", data: { type: "SYNTHETIC_TEST" } } }));
    expect(await processDelivery(job.id, deliveryHandler)).toMatchObject({ status: "SENT" });
    // Repeat the provider request, including its stable ID and exact payload.
    await ablyRest!.channels.get(channelName).publish({ id: `${job.id}:0`, name: "wallet:updated", data: { type: "SYNTHETIC_TEST", deliveryId: job.id } });
    const history = await ablyRest!.channels.get(channelName).history({ limit: 10 });
    expect(history.items.filter(message => message.data?.deliveryId === job.id)).toHaveLength(1);
    expect(await prisma.deliveryOutbox.findUnique({ where: { id: job.id } })).toMatchObject({ status: "SENT", providerReceiptId: `${job.id}:0` });
  });
  it("Resend confirma envio ao endereço oficial de teste e conserva recibo na repetição", async () => {
    const payload = { from: process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL!, to: "delivered@resend.dev", subject: `AtlasFit — verificação sintética ${randomUUID()}`, html: "<p>Verificação de entrega sintética. Nenhum dado pessoal.</p>", text: "Verificação de entrega sintética. Nenhum dado pessoal." };
    const job = await serializableTransaction(tx => enqueueDelivery(tx, { requestKey: randomUUID(), channel: "EMAIL", payload }));
    expect(await processDelivery(job.id, deliveryHandler)).toMatchObject({ status: "SENT" });
    const retained = await prisma.deliveryOutbox.findUniqueOrThrow({ where: { id: job.id } });
    const repeated = await resend.emails.send(payload, { idempotencyKey: `outbox/${job.id}` });
    expect(repeated.error).toBeNull(); expect(repeated.data?.id).toBe(retained.providerReceiptId);
    // An API acknowledgement proves acceptance, not inbox rendering or delivery of invitations.
  });
});
