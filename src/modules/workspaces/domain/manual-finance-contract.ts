import { z } from "zod";
import { GymInvoiceItemType, GymInPersonPaymentMethod, GymInvoiceStatus, GymPaymentStatus } from "@prisma/client";
import { cents } from "./money";
import { isValidCpfCnpj } from "@/lib/cpf-validator";

const id = z.string().trim().min(1).max(100);
const short = z.string().trim().max(150).optional();
const money = z.union([z.number().int().safe(), z.bigint(), z.string().max(20).regex(/^\d+$/)]).transform(cents).refine(value => value >= BigInt(0) && value <= BigInt(Number.MAX_SAFE_INTEGER), "Valor fora do intervalo suportado pela interface.");
export const gymFinanceDate = z.union([z.date(), z.iso.date(), z.iso.datetime({ offset: true })]);
export const manualInvoiceSchema = z.object({
  idempotencyKey: z.string().regex(/^[\w:.-]{8,128}$/),
  workspaceId: id, studentMemberId: id, studentUserId: id.optional(), enrollmentId: id.optional(),
  title: z.string().trim().min(1).max(150), description: z.string().trim().max(2000).optional(), dueDate: gymFinanceDate,
  competenceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  items: z.array(z.object({ itemType: z.enum(GymInvoiceItemType), description: z.string().trim().min(1).max(500), quantity: z.number().int().min(1).max(10000).optional(), unitPriceInCents: money, planVersionId: id.optional() }).strict()).min(1).max(100),
  discountInCents: money.optional(), discountPercentage: z.number().min(0).max(100).refine(value => Math.round(value * 100) / 100 === value).optional(),
  discountReason: z.string().trim().max(2000).optional(), discountAuthorizedByUserId: id.optional(),
  preferredPayerType: z.enum(["STUDENT", "GUARDIAN", "CUSTOM"]).optional(), guardianId: id.optional(),
  customPayer: z.object({ name: z.string().trim().min(1).max(150), cpfCnpj: z.string().trim().max(20).refine(isValidCpfCnpj), email: z.union([z.literal(""), z.email().max(254)]), phone: z.string().trim().max(30).optional() }).strict().optional(),
}).strict().refine(value => !(value.discountInCents !== undefined && value.discountPercentage !== undefined), { message: "Informe desconto em centavos ou percentual.", path: ["discountInCents"] });
export const manualPaymentSchema = z.object({
  workspaceId: id, paymentMethod: z.enum(GymInPersonPaymentMethod).refine(value => value !== "GATEWAY_ONLINE"),
  amountInCents: money.refine(value => value > BigInt(0)), allocations: z.array(z.object({ invoiceId: id, amountInCents: money.refine(value => value > BigInt(0)) }).strict()).min(1).max(100),
  idempotencyKey: z.string().regex(/^[\w:.-]{8,128}$/), financialAccountId: id.optional(),
  paidAt: gymFinanceDate.optional(), payerName: short, payerCpfCnpj: short,
  posCardBrand: short, posAuthorizationCode: short, posNsu: short, posTerminalId: short,
  // Proof uploads need the validated attachment flow; arbitrary external URLs are not proof.
  bankTransferProofUrl: z.never().optional(), bankTransferTransactionId: short,
  notes: z.string().trim().max(2000).optional(),
}).strict();
const pagination = { page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) };
export const manualInvoiceListSchema = z.object({ workspaceId: id, unitId: id.optional(), status: z.enum(GymInvoiceStatus).optional(), studentMemberId: id.optional(), enrollmentId: id.optional(), search: z.string().trim().max(150).optional(), ...pagination }).strict();
export const manualPaymentListSchema = z.object({ workspaceId: id, unitId: id.optional(), status: z.enum(GymPaymentStatus).optional(), paymentMethod: z.enum(GymInPersonPaymentMethod).optional(), receivedByUserId: id.optional(), ...pagination }).strict();
export const manualPaymentReverseSchema = z.object({ workspaceId: id, reversalReason: z.string().trim().min(1).max(2000) }).strict();
