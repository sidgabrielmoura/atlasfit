import { z } from "zod";
import { isValidCPF } from "@/lib/cpf-validator";

export const guardianInvitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const document = z.object({ id: z.string(), title: z.string(), version: z.string(), content: z.string(), hash: z.string().regex(/^[a-f0-9]{64}$/) });
export const guardianInvitationInfoSchema = z.object({ workspaceName: z.string(), email: z.string().email(), expiresAt: z.string().datetime(), terms: document, privacy: document });
export const guardianInvitationIssuedSchema = z.object({ invitationPath: z.string().regex(/^\/auth\/guardian-invite\?token=[a-f0-9]{64}$/), expiresAt: z.string().datetime() });
export const issueGuardianInvitationSchema = z.object({ workspaceId: z.string().trim().min(1).max(100), confirmed: z.literal(true) }).strict();
export const claimGuardianInvitationSchema = z.object({
  token: guardianInvitationTokenSchema, mode: z.enum(["CREATE", "LINK"]),
  password: z.string().min(8).max(72).optional(),
  cpf: z.string().max(20).transform(value => value.replace(/\D/g, "")).refine(isValidCPF).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  acceptedTerms: z.literal(true), acceptedPrivacy: z.literal(true),
  termsId: z.string().min(1).max(100), termsHash: z.string().regex(/^[a-f0-9]{64}$/),
  privacyId: z.string().min(1).max(100), privacyHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((data, ctx) => {
  if (data.mode === "CREATE" && (!data.password || !data.cpf || !data.birthDate)) ctx.addIssue({ code: "custom", message: "Informe senha, CPF e nascimento para criar a conta." });
  if (data.mode === "LINK" && (data.password !== undefined || data.cpf !== undefined || data.birthDate !== undefined)) ctx.addIssue({ code: "custom", message: "O vínculo usa a identidade da conta autenticada." });
});

export const guardianStaffItemSchema = z.object({ id: z.string(), name: z.string(), relationship: z.string(), phone: z.string(), email: z.string().nullable(), isLegalRepresentative: z.boolean(), isFinancialResponsible: z.boolean(), isEmergencyContact: z.boolean(), hasHealthAccess: z.boolean(), verifiedAt: z.string().datetime().nullable(), revokedAt: z.string().datetime().nullable() });
