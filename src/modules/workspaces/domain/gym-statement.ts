import { z } from "zod";
const money = z.string().regex(/^\d+$/);
export const gymStatementSchema = z.object({
  kind: z.literal("GYM_MANUAL"), workspaceId: z.string(), workspaceName: z.string(), timezone: z.string(),
  snapshot: z.object({ asOf: z.string().datetime(), basis: z.literal("CURRENT") }),
  totals: z.object({ receivedInCents: money, outstandingInCents: money, overdueInCents: money }),
  invoices: z.array(z.object({ id: z.string(), number: z.string(), title: z.string(), competenceMonth: z.string().nullable(), dueDate: z.string().datetime(), status: z.enum(["OPEN", "PARTIALLY_PAID", "PAID", "CANCELLED", "REFUNDED"]), overdue: z.boolean(), totalInCents: money, balanceInCents: money, planName: z.string().nullable(),
    receipts: z.array(z.object({ amountInCents: money, receiptNumber: z.string(), paidAt: z.string().datetime(), paymentMethod: z.string(), reversed: z.boolean(), reversedAt: z.string().datetime().nullable() })), receiptsLimited: z.boolean() })),
  pagination: z.object({ page: z.number().int().positive(), totalPages: z.number().int().nonnegative(), total: z.number().int().nonnegative() }),
});
