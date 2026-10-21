import { NextResponse } from "next/server";
import { WorkspaceCapability, WorkspaceRole } from "./roles";

export type { WorkspaceCapability, WorkspaceRole };

export type WorkspaceAccessErrorCode =
  | "WORKSPACE_MISMATCH"
  | "WORKOUT_EDIT_CONFLICT"
  | "WORKOUT_ROWS_CHANGED"
  | "INVALID_GROUP"
  | "REVIEW_REQUIRED"
  | "REVIEW_SOURCE_LIMIT"
  | "REVIEW_STALE"
  | "EXTERNAL_REVIEW_REQUIRED"
  | "CREDIT_REVIEW_REQUIRED"
  | "CYCLE_REVIEW_REQUIRED"
  | "PLAN_SCHEDULE_REVIEW_REQUIRED"
  | "CONTRACT_REVISION_PENDING"
  | "CONFIGURATION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_IMPORT"
  | "EXPORT_LIMIT_EXCEEDED"
  | "UNIT_REQUIRED"
  | "LEGACY_IMPORT_REVIEW_REQUIRED"
  | "IMPORT_ACTOR_MISMATCH"
  | "INVALID_IMPORT_STATE"
  | "IMPORT_PREVIEW_NOT_FOUND"
  | "IMPORT_SCOPE_MISMATCH"
  | "IMPORT_CONTENT_MISMATCH"
  | "IMPORT_PREVIEW_EXPIRED"
  | "IMPORT_PREVIEW_CHANGED"
  | "LEGACY_BALANCES_CONFIRMATION_REQUIRED"
  | "UNAUTHORIZED"
  | "WORKSPACE_REQUIRED"
  | "WORKSPACE_NOT_FOUND"
  | "NOT_A_MEMBER"
  | "MEMBER_INACTIVE"
  | "WORKSPACE_SUSPENDED"
  | "WORKSPACE_CONTEXT_MISMATCH"
  | "GYM_DATA_RETENTION_REQUIRED"
  | "GYM_CLOSURE_REQUIRED"
  | "PURGE_SCHEDULE_MISSING"
  | "INSUFFICIENT_PERMISSIONS"
  | "FORBIDDEN_RESOURCE"
  | "RESOURCE_NOT_FOUND"
  | "TENANT_MISMATCH"
  | "CANNOT_REMOVE_LAST_OWNER"
  | "OWNER_TRANSFER_FAILED"
  | "INVALID_EMAIL"
  | "INVALID_ROLE"
  | "STAFF_LIMIT_REACHED"
  | "ALREADY_STAFF_MEMBER"
  | "UNIT_NOT_FOUND"
  | "INVALID_TOKEN"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_NOT_PENDING"
  | "INVITATION_EXPIRED"
  | "USER_NOT_FOUND"
  | "CANNOT_REVOKE"
  | "STAFF_NOT_FOUND"
  | "INVALID_REPLACEMENT"
  | "REPLACEMENT_NOT_FOUND"
  | "TARGET_STAFF_NOT_FOUND"
  | "STUDENT_LIMIT_REACHED"
  | "ALREADY_STUDENT_MEMBER"
  | "STUDENT_NOT_FOUND"
  | "DUPLICATE_REGISTRATION_NUMBER"
  | "USER_ALREADY_MEMBER"
  | "PLAN_NOT_FOUND"
  | "PLAN_INACTIVE"
  | "ENROLLMENT_NOT_FOUND"
  | "ACTIVE_ENROLLMENT_EXISTS"
  | "BILLING_PAUSED"
  | "CONTRACT_ALREADY_ACCEPTED"
  | "INVALID_TRANSITION"
  | "INVALID_STATUS"
  | "GUARDIAN_NOT_AUTHORIZED"
  | "SIGNER_NOT_AUTHORIZED"
  | "ACTIVATION_CONDITION_NOT_MET"
  | "INVALID_CNPJ"
  | "INVALID_AMOUNT"
  | "GYM_ACCOUNT_NOT_CONFIGURED"
  | "GYM_ACCOUNT_SUSPENDED"
  | "INVOICE_NOT_FOUND"
  | "INVOICE_ALREADY_PAID"
  | "INVOICE_CANCELLED"
  | "INVOICE_OVERALLOCATION"
  | "DISCOUNT_LIMIT_EXCEEDED"
  | "DISCOUNT_REASON_REQUIRED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_ALREADY_REVERSED"
  | "REVERSAL_REASON_REQUIRED"
  | "ALLOCATION_AMOUNT_MISMATCH"
  | "INVALID_PAYMENT_AMOUNT"
  | "SUBSCRIPTION_NOT_FOUND"
  | "SUBSCRIPTION_ALREADY_ACTIVE"
  | "INVOICE_ALREADY_EXISTS_FOR_CYCLE"
  | "INVALID_RECURRENCE_MODE"
  | "GYM_GATEWAY_RETIRED"
  | "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED"
  | "PAYER_REVIEW_REQUIRED"
  | "INVALID_PAYER"
  | "REASON_REQUIRED"
  | "CARD_TOKENIZATION_FAILED"
  | "SUBSCRIPTION_CREATION_FAILED"
  | "RECONCILIATION_FAILED"
  | "FINANCIAL_ACCOUNT_NOT_FOUND"
  | "FINANCIAL_ACCOUNT_INACTIVE"
  | "INSUFFICIENT_ACCOUNT_BALANCE"
  | "INVALID_TRANSFER_ACCOUNTS"
  | "EXPENSE_NOT_FOUND"
  | "EXPENSE_ALREADY_PAID"
  | "EXPENSE_ALREADY_CANCELLED"
  | "CASH_DRAWER_ALREADY_OPEN"
  | "CASH_DRAWER_NOT_FOUND"
  | "CASH_DRAWER_CLOSED"
  | "CASH_DRAWER_NOT_OPEN"
  | "CASH_DRAWER_DIFFERENCE_REASON_REQUIRED"
  | "SUPPLIER_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "WALLET_ACCOUNT_NOT_FOUND"
  | "INSUFFICIENT_WALLET_BALANCE"
  | "ACCOUNT_IN_NEGATIVE_BALANCE"
  | "UNAUTHORIZED_PAYOUT"
  | "UNAUTHORIZED_REFUND"
  | "REFUND_REASON_REQUIRED"
  | "BILLING_NOT_FOUND"
  | "BILLING_CANNOT_BE_REFUNDED"
  | "DIVERGENCE_NOT_FOUND"
  | "DIVERGENCE_ALREADY_RESOLVED"
  | "MODALITY_NOT_FOUND"
  | "MODALITY_NAME_EXISTS"
  | "ROOM_NOT_FOUND"
  | "ROOM_NAME_EXISTS"
  | "CAPACITY_EXCEEDS_ROOM_LIMIT"
  | "ROOM_SCHEDULE_CONFLICT"
  | "INSTRUCTOR_SCHEDULE_CONFLICT"
  | "SCHEDULE_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "SESSION_ALREADY_CANCELLED"
  | "CANCELLATION_REASON_REQUIRED"
  | "SUBSTITUTE_REASON_REQUIRED"
  | "INVALID_SESSION_TIME"
  | "INVALID_CAPACITY"
  | "INSTRUCTOR_NOT_STAFF"
  | "INVALID_REQUEST"
  | "ENROLLMENT_NOT_ACTIVE"
  | "ENROLLMENT_UNIT_NOT_ALLOWED"
  | "ENROLLMENT_TIME_NOT_ALLOWED"
  | "ENROLLMENT_CREDITS_EXHAUSTED"
  | "BOOKING_WINDOW_CLOSED"
  | "CLASS_ALREADY_STARTED"
  | "ACTIVE_BOOKING_LIMIT_REACHED"
  | "ALREADY_BOOKED"
  | "CLASS_SESSION_FULL"
  | "WAITLIST_FULL"
  | "WAITLIST_NOT_ALLOWED"
  | "ALREADY_IN_WAITLIST"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_ALREADY_CANCELLED"
  | "WAITLIST_ENTRY_NOT_FOUND"
  | "WAITLIST_ALREADY_RESOLVED"
  | "OFFER_EXPIRED"
  | "STUDENT_NOT_FOUND"
  | "UNAUTHORIZED_GUARDIAN_ACTION"
  | "BOOKING_NOT_ELIGIBLE_FOR_CHECKIN"
  | "ATTENDANCE_ALREADY_RECORDED"
  | "ACCESS_OVERRIDE_REASON_REQUIRED"
  | "ACCESS_OVERRIDE_NOT_FOUND"
  | "ACCESS_GRANT_NOT_FOUND"
  | "INVALID_CREDENTIAL"
  | "DEVICE_NAME_REQUIRED"
  | "DEVICE_NOT_FOUND"
  | "INVALID_DEVICE_TOKEN"
  | "DEVICE_UNAUTHORIZED"
  | "COMMAND_NOT_FOUND"
  | "COMMAND_TYPE_REQUIRED"
  | "DEVICE_TOKEN_REQUIRED"
  | "CONTINGENCY_REASON_REQUIRED"
  | "CONTINGENCY_NOT_ACTIVE"
  | "RESOLUTION_NOTES_REQUIRED"
  | "DISMISSAL_REASON_REQUIRED"
  | "GUARDIAN_CONSENT_REQUIRED_FOR_MINOR"
  | "BIOMETRIC_NOT_FOUND"
  | "INVALID_CREDENTIAL_TYPE"
  | "INVALID_TYPE"
  | "INVALID_MEASUREMENTS"
  | "FORBIDDEN_HEALTH_ACCESS_DENIED"
  | "EVALUATION_NOT_FOUND"
  | "INVALID_FILE_NAME"
  | "INVALID_OBJECT_KEY"
  | "STORAGE_EXCEEDED"
  | "STORAGE_RECONCILIATION_REQUIRED"
  | "INVALID_URL"
  | "FILE_SIZE_EXCEEDS_LIMIT"
  | "FILE_NOT_FOUND"
  | "INVALID_TITLE"
  | "INVALID_MESSAGE"
  | "UNIT_ID_REQUIRED"
  | "INVALID_AUDIENCE"
  | "INVALID_LEAD_NAME"
  | "LEAD_NOT_FOUND"
  | "LEAD_ALREADY_CONVERTED"
  | "GUARDIAN_REQUIRED_FOR_MINOR"
  | "PLAN_VERSION_NOT_FOUND"
  | "INVALID_NAME"
  | "TEMPLATE_NOT_FOUND"
  | "INVALID_WORKOUT"
  | "EXERCISE_UNAVAILABLE"
  | "TEMPLATE_INACTIVE"
  | "ADVANCED_EDITOR_REQUIRED"
  | "STUDENT_INACTIVE"
  | "UNIT_INACTIVE"
  | "ASSIGNMENT_RECONCILIATION_REQUIRED"
  | "EMPTY_WORKOUT"
  | "TEMPLATE_RECONCILIATION_REQUIRED"
  | "FORBIDDEN_TEMPLATE_EDIT"
  | "FORBIDDEN_TEMPLATE_DELETE"
  | "FORBIDDEN_STUDENT_ASSIGNMENT";

export interface WorkspaceContext {
  /** Authenticated user ID */
  userId: string;
  /** Authenticated user email */
  userEmail: string | null;
  /** Authenticated user global role (SUPERADMIN, TRAINER, STUDENT, USER) */
  userRole: string;
  /** Verified target workspace ID */
  workspaceId: string;
  /** Verified workspace name */
  workspaceName: string;
  /** Verified workspace slug */
  workspaceSlug: string;
  /** Workspace Type: PERSONAL or GYM */
  workspaceType: "PERSONAL" | "GYM";
  /** True if user is the direct owner of the workspace */
  isOwner: boolean;
  /** WorkspaceMember ID in this workspace */
  memberId: string;
  /** Primary workspace role (OWNER, TRAINER, etc.) */
  memberRole: WorkspaceRole;
  /** All effective roles for this member in this workspace */
  roles: WorkspaceRole[];
  /** Set of all verified capabilities */
  capabilities: Set<WorkspaceCapability>;
  /** Helper method to check if context possesses a capability */
  hasCapability: (capability: WorkspaceCapability) => boolean;
  /** Membership active status */
  isActive: boolean;
  /** True if accessing with superadmin privileges */
  isSuperAdmin: boolean;
}

export interface RequireWorkspaceAccessOptions {
  expectedType?: "PERSONAL" | "GYM";
  requireActiveContext?: boolean;
  /** The workspace ID to verify access for. */
  workspaceId: string;
  /** Optional unit ID for physical unit-scoped access */
  unitId?: string;
  /** Single required capability */
  capability?: WorkspaceCapability;
  /** Match ANY of these capabilities */
  anyCapability?: WorkspaceCapability[];
  /** Match ALL of these capabilities */
  allCapabilities?: WorkspaceCapability[];
  /** Alias for allCapabilities */
  requiredCapabilities?: WorkspaceCapability[];
  /** Explicitly allowed workspace roles */
  allowedRoles?: WorkspaceRole[];
  /** Target resource owner ID for IDOR / ownership verification */
  resourceOwnerId?: string;
  /** Allow inactive members? (Default: false) */
  allowInactive?: boolean;
  /** Action description for audit logging */
  auditAction?: string;
}

export class WorkspaceAccessError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: WorkspaceAccessErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WorkspaceAccessError";
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      },
      { status: this.statusCode }
    );
  }
}
