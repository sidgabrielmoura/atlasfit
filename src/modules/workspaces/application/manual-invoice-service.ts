import { randomBytes, createHash } from "node:crypto";
import { GymInvoiceItemType } from "@prisma/client";
import type { CreateGymInvoiceInput } from "./invoice-service";
import { idempotentSerializableTransaction } from "./transaction";
import { assertGymFinanceAuthority, assertInvoiceFinanceAuthority } from "./manual-finance-authority";
import { resolveGymPayer } from "./payer-service";
import { WorkspaceAccessError } from "../domain/types";
import { cents } from "../domain/money";
import { safeCentsNumber } from "../domain/money";
import { manualInvoiceSchema } from "../domain/manual-finance-contract";
import { gymCalendarInstant } from "../domain/gym-calendar-date";
import { hasStudentMembership } from "../domain/student-membership";

export async function issueManualInvoice(input: CreateGymInvoiceInput) {
  const { actorUserId, ...request } = input;
  const parsed = manualInvoiceSchema.safeParse(request);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise os dados e valores da fatura.");
  input = { ...parsed.data, actorUserId };
  const issuanceKey = `GYM:${input.workspaceId}:INVOICE:${createHash("sha256").update(parsed.data.idempotencyKey).digest("hex")}`;
  const issuanceFingerprint = createHash("sha256").update(JSON.stringify({ ...parsed.data, actorUserId }, (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value)).digest("hex");
  return idempotentSerializableTransaction(async tx => {
    const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId }, select: { type: true, settings: { select: { timezone: true } } } });
    if (workspace?.type !== "GYM") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Fatura exclusiva da operação GYM.");
    const existing = await tx.gymInvoice.findUnique({ where: { issuanceKey }, include: { items: true } });
    if (existing) {
      await assertInvoiceFinanceAuthority(tx, input.workspaceId, actorUserId, "invoices.issue", existing);
      if (existing.issuanceFingerprint !== issuanceFingerprint) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Esta tentativa já corresponde a outra fatura. Confira o histórico antes de alterar os dados.");
      return existing;
    }
    const dueDate = gymCalendarInstant(input.dueDate, workspace.settings?.timezone || "America/Sao_Paulo");
    const member = await tx.workspaceMember.findFirst({ where: { id: input.studentMemberId, workspaceId: input.workspaceId, isActive: true }, include: { roleGrants: true, studentProfile: { select: { memberId: true } } } });
    if (!member || !hasStudentMembership(member) || (input.studentUserId && input.studentUserId !== member.userId)) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "O aluno não pertence a esta academia.");
    const enrollment = input.enrollmentId ? await tx.gymEnrollment.findFirst({ where: { id: input.enrollmentId, workspaceId: input.workspaceId, studentMemberId: member.id } }) : null;
    if (input.enrollmentId && !enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula incompatível com o aluno.");
    if (enrollment && enrollment.unitId !== member.unitId) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "A unidade contratada e o vínculo exigem reconciliação.");
    const unitId = enrollment?.unitId ?? member.unitId;
    await assertGymFinanceAuthority(tx, input.workspaceId, input.actorUserId, "invoices.issue", unitId);
    const items = [];
    let subtotal = BigInt(0);
    for (const item of input.items) {
      const quantity = item.quantity ?? 1;
      const price = cents(item.unitPriceInCents);
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 10000 || price < BigInt(0) || !item.description.trim() || !Object.values(GymInvoiceItemType).includes(item.itemType)) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Item ou quantidade inválida.");
      if (item.planVersionId && !await tx.gymPlanVersion.findFirst({ where: { id: item.planVersionId, plan: { workspaceId: input.workspaceId } } })) throw new WorkspaceAccessError(404, "PLAN_NOT_FOUND", "O plano não pertence a esta academia.");
      const total = price * BigInt(quantity);
      subtotal += total;
      items.push({ itemType: item.itemType, description: item.description.trim(), quantity, unitPriceInCents: price, totalInCents: total, planVersionId: item.planVersionId });
    }
    if (subtotal <= BigInt(0)) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "O subtotal deve ser positivo.");
    safeCentsNumber(subtotal);
    const percentage = input.discountPercentage ?? 0;
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100 || Math.round(percentage * 100) / 100 !== percentage) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Desconto inválido; utilize até duas casas decimais.");
    const discount = input.discountInCents !== undefined ? cents(input.discountInCents) : (subtotal * BigInt(Math.round(percentage * 100)) + BigInt(5000)) / BigInt(10000);
    if (discount < BigInt(0) || discount > subtotal || (discount > BigInt(0) && !input.discountReason?.trim())) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "O desconto deve respeitar o subtotal e ter justificativa.");
    let approver: string | null = null;
    if (discount > BigInt(0)) {
      const settings = await tx.gymSettings.findUnique({ where: { workspaceId: input.workspaceId } });
      const maximumBasisPoints = Math.round((settings?.maxReceptionistDiscountPercentage ?? 10) * 100);
      if (discount > (settings?.maxReceptionistDiscountInCents ?? BigInt(2000)) || discount * BigInt(10000) > subtotal * BigInt(maximumBasisPoints)) {
        await assertGymFinanceAuthority(tx, input.workspaceId, input.actorUserId, "workspace.manage", unitId);
        approver = input.actorUserId;
      }
    }
    // O campo de aprovador do cliente jamais concede alçada.
    const payer = await resolveGymPayer(input.workspaceId, { studentUserId: member.userId, studentMemberId: member.id, enrollmentId: input.enrollmentId, guardianId: input.guardianId, customPayer: input.customPayer, preferredPayerType: input.preferredPayerType }, tx);
    const total = subtotal - discount;
    const invoice = await tx.gymInvoice.create({ data: { workspaceId: input.workspaceId, studentMemberId: member.id, studentUserId: member.userId, enrollmentId: enrollment?.id, issuanceKey, issuanceFingerprint, invoiceNumber: `FAT-${randomBytes(12).toString("hex").toUpperCase()}`, title: input.title.trim(), description: input.description, dueDate, competenceMonth: input.competenceMonth, status: total === BigInt(0) ? "PAID" : "OPEN", subtotalInCents: subtotal, discountInCents: discount, totalInCents: total, paidAmountInCents: BigInt(0), balanceRemainingInCents: total, discountPercentage: percentage, discountReason: input.discountReason, discountAuthorizedByUserId: approver, payerType: payer.payerType, payerName: payer.name, payerCpfCnpj: payer.cpfCnpj, payerEmail: payer.email || null, payerPhone: payer.phone, createdByUserId: input.actorUserId, items: { create: items } }, include: { items: true } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_INVOICE_CREATED:${invoice.id}`, entity: "GYM_INVOICE", entityId: invoice.id, severity: "info" } });
    return invoice;
  });
}
