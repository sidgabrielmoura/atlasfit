import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, it } from "vitest";
import prisma from "@/lib/prisma";
import { GymAnalyticsService } from "@/modules/workspaces/application/gym-analytics-service";
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
it("exporta CSV real de dados sintéticos para save/reopen no consumidor nativo", async () => {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { name: "CSV sintético", slug: randomUUID(), type: "GYM", ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE" } }, units: { create: { name: "Matriz" } } }, include: { units: true } });
  const inputs = ["=1+1", "+1+1", "-1+1", "@SUM(1;1)", "＝1+1", "\t=1+1", "\r=1+1", "\n=1+1", "\ufeff=1+1", "Nome legítimo, com acento; aspas \"teste\""];
  const expected = [];
  for (const [index, name] of inputs.entries()) {
    const id = `CSV-${randomUUID()}-${index}`;
    const user = await prisma.user.create({ data: { name, whatsapp: "+5500000000000" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", unitId: workspace.units[0].id, studentProfile: { create: { registrationNumber: id, enrolledAt: new Date("2026-10-08T12:00:00.000Z") } } } });
    const amount = index === 0 ? BigInt("9007199254740993") : index === 1 ? BigInt(1) : BigInt(12345);
    await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, studentUserId: user.id, invoiceNumber: id, title: "Fatura sintética", payerName: name, competenceMonth: "2026-10", dueDate: new Date("2026-10-08T12:00:00.000Z"), subtotalInCents: amount, totalInCents: amount, balanceRemainingInCents: amount, createdByUserId: owner.id } });
    expected.push({ id, name, amountInCents: amount.toString(), date: "2026-10-08" });
  }
  mkdirSync(".tmp/gym-csv-consumer/input", { recursive: true });
  for (const exportType of ["STUDENTS", "INVOICES"] as const) {
    const result = await GymAnalyticsService.exportData({ workspaceId: workspace.id, actorUserId: owner.id, exportType, startDate: "2026-10-01", endDate: "2026-10-09" });
    writeFileSync(`.tmp/gym-csv-consumer/input/${exportType.toLowerCase()}.csv`, result.content);
  }
  writeFileSync(".tmp/gym-csv-consumer/expected.json", JSON.stringify(expected, null, 2));
});
