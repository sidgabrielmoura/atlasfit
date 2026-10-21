import { z } from "zod";

const id = z.string().min(1).max(100);
export const guardianFinanceQuerySchema = z.object({ workspaceId: id, page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
export const guardianLegalAcceptanceSchema = z.object({ workspaceId: id, documentType: z.enum(["TERMS", "PRIVACY"]), documentId: id, documentHash: z.string().regex(/^[a-f0-9]{64}$/), accepted: z.literal(true) }).strict();
export const guardianLegalDocumentSchema = z.object({ id, type: z.enum(["TERMS", "PRIVACY"]), title: z.string(), version: z.string(), content: z.string(), documentHash: z.string(), acceptedAt: z.string().datetime().nullable() });
export const guardianLegalResultSchema = z.object({ id, acceptedAt: z.string().datetime(), documentId: id, documentType: z.enum(["TERMS", "PRIVACY"]), documentVersion: z.string() });
export const guardianDependentSchema = z.object({
  guardianId: id, relationship: z.string(), verifiedAt: z.string().datetime(),
  powers: z.object({ isLegalRepresentative: z.boolean(), isFinancialResponsible: z.boolean(), isEmergencyContact: z.boolean(), hasHealthAccess: z.boolean() }),
  contracts: z.array(z.object({ id, status: z.string(), planName: z.string() })),
  workspace: z.object({ id, name: z.string(), slug: z.string(), logoUrl: z.string().nullable(), settings: z.object({ requireGuardianSignature: z.boolean() }).nullable() }),
  student: z.object({ memberId: id, userId: id, name: z.string(), birthDate: z.string().datetime().nullable(), age: z.number().optional(), isMinor: z.literal(true), plan: z.string(), modality: z.string(), isActive: z.literal(true), unit: z.object({ id, name: z.string(), code: z.string().nullable() }).nullable(), assignedStaff: z.object({ name: z.string() }).nullable(), registrationNumber: z.string().nullable(), medicalClearance: z.boolean().nullable(), notes: z.null() }),
});
export type GuardianDependent = z.infer<typeof guardianDependentSchema>;
export function guardianPortalError(value: unknown, fallback: string) {
  const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(value);
  return parsed.success ? parsed.data.error.message : fallback;
}
