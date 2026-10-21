import { z } from "zod";

const cents = z.number().int().safe();
export const expenseCategoriesResponseSchema = z.object({ categories: z.array(z.object({ id: z.string(), name: z.string(), code: z.string().nullable(), color: z.string().nullable() })) });
export const suppliersResponseSchema = z.object({ suppliers: z.array(z.object({ id: z.string(), tradeName: z.string(), corporateName: z.string().nullable(), cnpjCpf: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable(), contactName: z.string().nullable() })) });
export const accountsResponseSchema = z.object({
  accounts: z.array(z.object({
    id: z.string(), name: z.string(), unitId: z.string().nullable(), unitName: z.string().nullable(),
    accountType: z.enum(["CASH", "BANK_ACCOUNT", "SAFE_RESERVE", "OTHER"]),
    balanceInCents: cents, isDefault: z.boolean(),
    bankName: z.string().nullable(), agencyNumber: z.string().nullable(), accountNumber: z.string().nullable(),
  })),
  units: z.array(z.object({ id: z.string(), name: z.string() })),
  includeUnassigned: z.boolean(),
});
export type InternalAccount = z.infer<typeof accountsResponseSchema>["accounts"][number];

const sessionSchema = z.object({
  id: z.string(), sessionNumber: z.string(), status: z.enum(["OPEN", "CLOSED", "RECONCILED"]),
  financialAccountName: z.string(), openedAt: z.string(), openingAmountInCents: cents,
  expectedCashInCents: cents,
});
export const drawerResponseSchema = z.object({
  currentSession: sessionSchema.extend({
    financialAccountId: z.string(), movementsCount: z.number().int(), paymentsCount: z.number().int(),
    movements: z.array(z.object({ id: z.string(), movementType: z.string(), amountInCents: cents, description: z.string().nullable(), createdAt: z.string() })),
  }).nullable(),
  history: z.object({ sessions: z.array(sessionSchema.extend({
    openedByUserName: z.string().nullable(), closedByUserName: z.string().nullable(),
    actualCashInCents: cents.nullable(), differenceInCents: cents.nullable(), differenceReason: z.string().nullable(), closedAt: z.string().nullable(),
  })) }),
});
export type CurrentDrawer = z.infer<typeof drawerResponseSchema>["currentSession"];
export type DrawerHistoryItem = z.infer<typeof drawerResponseSchema>["history"]["sessions"][number];
