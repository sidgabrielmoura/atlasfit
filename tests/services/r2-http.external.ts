import { randomUUID, createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { storageService, s3Client } from "@/lib/storage.service";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";

const origin = process.env.GYM_HTTP_ORIGIN;
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.GYM_R2_HTTP !== "synthetic-only-20261010" || origin !== "http://127.0.0.1:31173" || database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("R2 HTTP exige aplicação e banco descartáveis específicos.");
const createdKeys = new Set<string>();
const syntheticWorkspaces = new Set<string>();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
class Session {
  cookies = new Map<string, string>();
  async request(route: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set("cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(origin + route, { ...options, headers, redirect: "manual", signal: AbortSignal.timeout(90_000) });
    for (const value of response.headers.getSetCookie()) { const pair = value.split(";")[0], index = pair.indexOf("="); this.cookies.set(pair.slice(0, index), pair.slice(index + 1)); }
    return response;
  }
  post(route: string, data: unknown) { return this.request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }
}
async function account(role: "USER" | "SUPERADMIN" = "USER") {
  const password = "r2-http-synthetic-password";
  const user = await prisma.user.create({ data: { email: `r2-http-${randomUUID()}@example.invalid`, name: "R2 HTTP sintético", birthDate: new Date("1990-01-15"), password: await bcrypt.hash(password, 10), role } });
  const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw Error("Política sintética ausente.");
  const proof = await issueCredentialProof(user.id, policy.user.password || "", authenticationPolicyKey(policy));
  const session = new Session(), csrf = await (await session.request("/api/auth/csrf")).json();
  await session.request("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" }, body: new URLSearchParams({ email: user.email!, password, csrfToken: csrf.csrfToken, authenticationProof: proof }) });
  expect((await (await session.request("/api/auth/session")).json()).user.id).toBe(user.id);
  return { user, session };
}
async function fixture() {
  const owner = await account(), student = await prisma.user.create({ data: { name: "Aluno sintético R2", birthDate: new Date("1990-01-15") } });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", name: "R2 HTTP sintético", slug: `r2-http-${randomUUID()}`, ownerId: owner.user.id, members: { create: { userId: owner.user.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStudents: 10, storageLimitMb: 1 } }, units: { create: { name: "Unidade R2" } } } });
  syntheticWorkspaces.add(workspace.id);
  const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
  owner.session.cookies.set("atlasfit_active_workspace_id", workspace.id);
  const reserve = (size = png.length) => owner.session.post("/api/storage/presigned", { workspaceId: workspace.id, studentId: student.id, fileName: "synthetic.png", contentType: "image/png", fileSize: size, targetType: "student_file" });
  const route = `/api/gym/students/${member.id}/files`;
  const attach = (upload: { objectKey: string; fileUrl: string }) => owner.session.post(route, { workspaceId: workspace.id, name: "Arquivo R2 HTTP", category: "outros", type: "file", objectKey: upload.objectKey, url: upload.fileUrl, fileName: "synthetic.png", sizeInBytes: 999999 });
  return { owner, workspace, student, member, reserve, attach };
}
async function trackedUpload(response: Response) {
  expect(response.status).toBe(200);
  const upload = await response.json();
  if (!syntheticWorkspaces.has(upload.objectKey.split("/")[1])) throw Error("Objeto fora da fixture sintética.");
  createdKeys.add(upload.objectKey);
  return upload;
}
afterAll(async () => {
  const errors: Error[] = [];
  for (const key of createdKeys) {
    try {
      await storageService.deleteObject(key);
      await expect(storageService.getObjectMetadata(key)).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });
      await prisma.studentFile.deleteMany({ where: { objectKey: key, workspaceId: { in: [...syntheticWorkspaces] } } });
      await prisma.gymStorageObject.deleteMany({ where: { objectKey: key, workspaceId: { in: [...syntheticWorkspaces] } } });
    } catch { errors.push(Error("Falha ao confirmar limpeza de um objeto sintético R2.")); }
  }
  await prisma.$disconnect(); s3Client.destroy();
  if (errors.length) throw new AggregateError(errors, "Limpeza R2 não confirmada.");
});
describe("R2 real por HTTP com reservas e quota", () => {
  it("reserva, PUT, HEAD, finalização, leitura privada/range e replay conservam bytes e quota", async () => {
    const f = await fixture(), upload = await trackedUpload(await f.reserve());
    expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: upload.objectKey } })).toMatchObject({ status: "RESERVED", size: BigInt(png.length) });
    const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(png.length) }, body: png }); expect(put.status).toBe(200);
    expect(await storageService.getObjectMetadata(upload.objectKey)).toMatchObject({ size: png.length, contentType: "image/png" });
    const tampered = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(png.length + 1) }, body: Buffer.concat([png, Buffer.from([0])]) }); expect(tampered.status).toBe(403);
    const attached = await f.attach(upload); expect(attached.status).toBe(201); expect((await attached.json()).file.size).toBe(png.length);
    expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: upload.objectKey } })).toMatchObject({ status: "FINALIZED", size: BigInt(png.length), expiresAt: null });
    expect((await f.attach(upload)).status).toBe(409);
    const anonymous = new Session(), foreign = await account();
    expect((await anonymous.request(upload.fileUrl)).status).toBe(401); expect((await foreign.session.request(upload.fileUrl)).status).toBe(403);
    const file = await f.owner.session.request(upload.fileUrl); expect(file.status).toBe(200); expect(file.headers.get("cache-control")).toBe("private, no-store");
    expect(createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex")).toBe(createHash("sha256").update(png).digest("hex"));
    const range = await f.owner.session.request(upload.fileUrl, { headers: { Range: "bytes=0-7" } }); expect(range.status).toBe(206); expect(Buffer.from(await range.arrayBuffer())).toEqual(png.subarray(0, 8));
  });
  it("duas reservas simultâneas disputam a mesma quota sem exceder um MB", async () => {
    const f = await fixture(), responses = await Promise.all([f.reserve(800000), f.reserve(800000)]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const upload = await trackedUpload(responses.find(response => response.status === 200)!);
    const rows = await prisma.gymStorageObject.findMany({ where: { workspaceId: f.workspace.id } }); expect(rows).toHaveLength(1); expect(rows[0].size).toBe(BigInt(800000));
    expect((await f.reserve(300000)).status).toBe(409);
    expect((await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(png.length) }, body: png })).status).toBe(403);
  });
  it("upload expirado retém quota até exclusão confirmada; superadmin não apaga reserva ativa", async () => {
    const f = await fixture(), admin = await account("SUPERADMIN"), upload = await trackedUpload(await f.reserve());
    expect((await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(png.length) }, body: png })).status).toBe(200);
    const route = `/api/superadmin/workspaces/${f.workspace.id}/storage-orphans`, options = { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectKey: upload.objectKey }) };
    expect((await f.owner.session.request(route, options)).status).toBe(403);
    expect((await admin.session.request(route, options)).status).toBe(409);
    await prisma.gymStorageObject.update({ where: { objectKey: upload.objectKey }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: upload.objectKey } })).toMatchObject({ size: BigInt(png.length) });
    expect((await admin.session.request(route, options)).status).toBe(200);
    await expect(storageService.getObjectMetadata(upload.objectKey)).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });
    expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: upload.objectKey } })).toBeNull();
  });
  it("licença revogada após PUT impede finalização e conserva a reserva do objeto real", async () => {
    const f = await fixture(), upload = await trackedUpload(await f.reserve());
    expect((await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": String(png.length) }, body: png })).status).toBe(200);
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "CANCELED" } });
    expect((await f.attach(upload)).status).toBe(403);
    expect(await prisma.studentFile.count({ where: { objectKey: upload.objectKey } })).toBe(0);
    expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: upload.objectKey } })).toMatchObject({ status: "RESERVED", size: BigInt(png.length) });
  });
});
