import { z } from "zod";

export const gymStaffRoleSchema = z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT", "STUDENT"]);
const identifier = z.string().trim().min(1).max(100);
const details = {
  cref: z.string().trim().max(100).nullable().optional(),
  jobTitle: z.string().trim().max(100).nullable().optional(),
};
export const gymStaffInviteSchema = z.object({
  workspaceId: identifier.optional(), email: z.string().trim().email().max(254),
  role: z.enum(["MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT"]),
  unitId: identifier.nullable().optional(), ...details,
}).strict();
export const gymStaffUpdateSchema = z.object({
  workspaceId: identifier.optional(), unitId: identifier.nullable().optional(), role: gymStaffRoleSchema.optional(), ...details,
  bio: z.string().trim().max(2000).nullable().optional(),
  emergencyContactName: z.string().trim().max(100).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(30).nullable().optional(),
}).strict().refine(value => Object.keys(value).some(key => key !== "workspaceId"), "Informe a alteração.");
export const gymStaffOffboardSchema = z.object({
  workspaceId: identifier.optional(), replacementStaffMemberId: identifier.nullable().optional(), reason: z.string().trim().min(1).max(2000),
}).strict();
export const gymStaffQuerySchema = z.object({
  workspaceId: identifier.optional(), unitId: identifier.optional(), role: gymStaffRoleSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
const unitSchema = z.object({ id: z.string(), name: z.string(), code: z.string().nullable() });
export const gymStaffRowSchema = z.object({
  id: z.string(), userId: z.string(), role: gymStaffRoleSchema, unitId: z.string().nullable(), isActive: z.boolean(), isOwner: z.boolean(), canManage: z.boolean(),
  user: z.object({ id: z.string(), name: z.string().nullable(), email: z.string().nullable(), image: z.string().nullable() }),
  unit: unitSchema.nullable(),
  staffProfile: z.object({ cref: z.string().nullable(), jobTitle: z.string().nullable(), bio: z.string().nullable(), emergencyContactName: z.string().nullable(), emergencyContactPhone: z.string().nullable() }).nullable(),
  roleGrants: z.array(z.object({ role: gymStaffRoleSchema, unitId: z.string().nullable() })),
  _count: z.object({ assignedStudents: z.number() }),
});
export const gymInvitationRowSchema = z.object({
  id: z.string(), email: z.string(), role: gymStaffRoleSchema, unitId: z.string().nullable(), unit: unitSchema.nullable(),
  status: z.string(), expiresAt: z.string(), createdAt: z.string(), canManage: z.boolean(),
});
export const gymStaffListSchema = z.object({ data: z.array(gymStaffRowSchema), total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() });
export const gymInvitationListSchema = z.object({ data: z.array(gymInvitationRowSchema), total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() });
export type GymStaffRow = z.infer<typeof gymStaffRowSchema>;
export type GymInvitationRow = z.infer<typeof gymInvitationRowSchema>;
export const gymPublicInvitationSchema = z.object({
  valid: z.literal(true), workspace: z.object({ id: z.string(), name: z.string() }),
  role: gymStaffRoleSchema, unit: unitSchema.nullable(), email: z.string(), expiresAt: z.string(),
});
