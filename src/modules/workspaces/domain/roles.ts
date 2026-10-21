/**
 * Workspace Roles and Capabilities definitions for AtlasFit (Personal & Gym).
 * 
 * Provides unified, fine-grained access control per tenant.
 */

export type WorkspaceRole =
  | "OWNER"
  | "MANAGER"
  | "RECEPTIONIST"
  | "FINANCE"
  | "TRAINER"
  | "ASSISTANT"
  | "STUDENT";

export type WorkspaceCapability =
  | "students.read"
  | "students.manage"
  | "health.read.assigned"
  | "health.manage.assigned"
  | "workouts.read"
  | "workouts.manage.assigned"
  | "staff.read"
  | "staff.manage"
  | "enrollments.read"
  | "enrollments.manage"
  | "invoices.read"
  | "invoices.issue"
  | "payments.read"
  | "payments.record"
  | "refunds.approve"
  | "reports.finance"
  | "reports.operational"
  | "privacy.manage"
  | "workspace.manage"
  | "communication.manage";

export const ALL_CAPABILITIES: WorkspaceCapability[] = [
  "students.read",
  "students.manage",
  "health.read.assigned",
  "health.manage.assigned",
  "workouts.read",
  "workouts.manage.assigned",
  "staff.read",
  "staff.manage",
  "enrollments.read",
  "enrollments.manage",
  "invoices.read",
  "invoices.issue",
  "payments.read",
  "payments.record",
  "refunds.approve",
  "reports.finance",
  "reports.operational",
  "privacy.manage",
  "workspace.manage",
  "communication.manage",
];

export const DEFAULT_ROLE_CAPABILITIES: Record<WorkspaceRole, WorkspaceCapability[]> = {
  OWNER: [...ALL_CAPABILITIES],

  MANAGER: [
    "students.read",
    "students.manage",
    "health.read.assigned",
    "health.manage.assigned",
    "workouts.read",
    "workouts.manage.assigned",
    "staff.read",
    "staff.manage",
    "enrollments.read",
    "enrollments.manage",
    "invoices.read",
    "invoices.issue",
    "payments.read",
    "payments.record",
    "refunds.approve",
    "reports.finance",
    "reports.operational",
    "privacy.manage",
    "workspace.manage",
    "communication.manage",
  ],

  FINANCE: [
    "students.read",
    "enrollments.read",
    "invoices.read",
    "invoices.issue",
    "payments.read",
    "payments.record",
    "refunds.approve",
    "reports.finance",
  ],

  RECEPTIONIST: [
    "students.read",
    "students.manage",
    "enrollments.read",
    "enrollments.manage",
    "invoices.read",
    "invoices.issue",
    "payments.read",
    "payments.record",
    "reports.operational",
    "communication.manage",
  ],

  TRAINER: [
    "students.read",
    "health.read.assigned",
    "health.manage.assigned",
    "workouts.read",
    "workouts.manage.assigned",
    "reports.operational",
    "communication.manage",
  ],

  ASSISTANT: [
    "students.read",
    "workouts.read",
  ],

  STUDENT: [
  ],
};

/**
 * Returns all capabilities granted by the given role.
 */
export function getRoleCapabilities(role: WorkspaceRole): WorkspaceCapability[] {
  return DEFAULT_ROLE_CAPABILITIES[role] || [];
}

/**
 * Resolves the combined set of capabilities across multiple roles and optional extra capabilities.
 */
export function resolveEffectiveCapabilities(
  roles: WorkspaceRole[],
  extraCapabilities?: WorkspaceCapability[]
): Set<WorkspaceCapability> {
  const capabilities = new Set<WorkspaceCapability>();

  for (const role of roles) {
    const caps = getRoleCapabilities(role);
    for (const cap of caps) {
      capabilities.add(cap);
    }
  }

  if (extraCapabilities) {
    for (const cap of extraCapabilities) {
      capabilities.add(cap);
    }
  }

  return capabilities;
}
