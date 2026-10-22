import { z } from "zod";

export const financeTransactionSchema = z.object({
  id: z.string(), amount: z.number().finite(), status: z.string(),
  paymentMethod: z.string().nullable(), description: z.string().nullable(), createdAt: z.string().datetime(),
  user: z.object({ id: z.string(), name: z.string().nullable(), email: z.string().nullable(),
    subscription: z.object({ plan: z.object({ id: z.string(), name: z.string() }) }).nullable() }).nullable().optional(),
  workspace: z.object({ id: z.string(), name: z.string(), type: z.string() }).nullable().optional(),
});
export const financeTransactionsSchema = z.object({
  data: z.array(financeTransactionSchema),
  pagination: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pages: z.number().int().nonnegative(), limit: z.number().int().positive() }),
});
export const financeQuerySchema = z.object({
  status: z.enum(["APPROVED", "FAILED", "PENDING", "REFUNDED"]).default("APPROVED"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  userId: z.string().min(1).max(100).optional(), planId: z.string().min(1).max(100).optional(),
  dateRange: z.enum(["all", "7days", "30days", "thisyear"]).default("all"),
}).strict();
export const financeOverviewSchema = z.object({
  snapshot: z.object({ asOf: z.string().datetime(), timezone: z.literal("America/Sao_Paulo"), basis: z.literal("CURRENT_CATALOG") }),
  mrr: z.number().nullable(), arr: z.number().nullable(), knownMonthlyReferenceInCents: z.number().int().nonnegative(),
  eligibleSubscriptionsCount: z.number().int().nonnegative(), unvaluedSubscriptionsCount: z.number().int().nonnegative(),
  totalRevenue: z.number(), todaysRevenue: z.number(), totalFailedRevenue: z.number(),
  ltv: z.null(), churn: z.null(), mrrHistory: z.array(z.never()),
  unavailableReason: z.string(), recentTransactions: z.array(financeTransactionSchema),
  recentUpgrades: z.array(z.object({ id: z.string(), user: z.string(), to: z.string(), from: z.string(), date: z.string().datetime() })),
});
export type FinanceOverview = z.infer<typeof financeOverviewSchema>;
export type FinanceTransactions = z.infer<typeof financeTransactionsSchema>;
