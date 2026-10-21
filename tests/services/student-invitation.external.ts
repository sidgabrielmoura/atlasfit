import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueStudentInvitation } from "@/modules/workspaces/application/gym-student-ingress";
import { processDelivery } from "@/lib/delivery/outbox";
import { deliveryHandler } from "@/lib/delivery/worker";
import { resend } from "@/lib/resend";
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.GYM_EXTERNAL_SMOKE !== "authorized-20261007" || database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige autorização externa e banco descartável.");
afterAll(async () => { await prisma.$disconnect(); });
it("Resend processa convite estudantil real para o simulador oficial e conserva o recibo", async () => {
  const owner = await prisma.user.create({ data: { password: await bcrypt.hash("senha-sintetica", 10), birthDate: new Date("1990-01-15") } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, name: "Convite sintético externo", slug: randomUUID(), type: "GYM", members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStudents: 2 } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade sintética" } });
  const existing = await prisma.user.findUnique({ where: { email: "delivered@resend.dev" } });
  if (existing && (existing.name !== "Aluno Resend sintético" || existing.password !== null)) throw new Error("Preserve conta inesperada no banco de teste.");
  const student = existing || await prisma.user.create({ data: { name: "Aluno Resend sintético", email: "delivered@resend.dev", birthDate: new Date("1990-01-15"), cpfCnpj: "52998224725" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id } });
  const principal = { id: owner.id, sessionVersion: owner.sessionVersion }, request = { workspaceId: workspace.id, requestKey: randomUUID(), confirmed: true, delivery: "EMAIL" };
  const issued = await issueStudentInvitation(principal, member.id, request); if (issued.delivery !== "EMAIL") throw new Error("Fila esperada.");
  expect(await issueStudentInvitation(principal, member.id, request)).toEqual(issued);
  expect(await processDelivery(issued.deliveryId, deliveryHandler)).toMatchObject({ status: "SENT" });
  const receipt = await prisma.deliveryOutbox.findUniqueOrThrow({ where: { id: issued.deliveryId } }); expect(receipt.providerReceiptId).toBeTruthy(); expect(await processDelivery(issued.deliveryId, deliveryHandler)).toMatchObject({ status: "NOT_CLAIMED" });
  const states: string[] = []; let readError: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await resend.emails.get(receipt.providerReceiptId!);
    if (result.error) { readError = result.error.name; break; }
    if (result.data) states.push(result.data.last_event);
    if (result.data?.last_event === "delivered") break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  writeFileSync(".tmp/gym-stabilization/student-invitation-resend.json", JSON.stringify({ recordedAt: new Date().toISOString(), synthetic: true, recipient: "delivered@resend.dev", deliveryId: receipt.id, providerReceiptId: receipt.providerReceiptId, outboxStatus: receipt.status, observedEvents: states, readError, deliveryConfirmedBySimulator: states.includes("delivered"), limits: ["Endereço oficial simula eventos; não comprova caixa postal de cliente, renderização ou spam.", "Nenhum token, conteúdo de e-mail ou credencial é publicado neste relatório."] }, null, 2) + "\n");
  // Read permission can be narrower than send permission; record that distinction.
  if (!readError) expect(states).toContain("delivered");
});
