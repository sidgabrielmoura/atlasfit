/**
 * Re-export auth templates and email services for backward compatibility.
 */
export {
  getTwoFactorEmailTemplate as getTwoFactorEmail,
  getResetPasswordEmailTemplate as getResetPasswordEmail,
  getSecurityLoginAlertEmailTemplate,
} from "./emails/templates/auth.templates";

export {
  getStudentInvitationEmailTemplate,
  getNewStudentNotificationTrainerTemplate,
} from "./emails/templates/onboarding.templates";

export {
  getNewInvoiceBillingEmailTemplate,
  getInvoiceReminderEmailTemplate,
  getInvoiceOverdueEmailTemplate,
  getPaymentReceiptStudentEmailTemplate,
  getPaymentConfirmedTrainerEmailTemplate,
  getCardPaymentFailedEmailTemplate,
} from "./emails/templates/billing.templates";

export {
  getNewWorkoutPrescribedEmailTemplate,
  getWorkoutUpdatedEmailTemplate,
} from "./emails/templates/training.templates";

export {
  getPhysicalEvaluationReportEmailTemplate,
  getReassessmentReminderEmailTemplate,
} from "./emails/templates/assessment.templates";

export {
  getNewLeadCapturedTrainerEmailTemplate,
  getCommercialProposalLeadEmailTemplate,
} from "./emails/templates/crm.templates";

export {
  getInactivityAlertStudentEmailTemplate,
  getChurnRiskAlertTrainerEmailTemplate,
  getPlanExpirationNoticeEmailTemplate,
} from "./emails/templates/retention.templates";

export {
  getKycStatusUpdatedEmailTemplate,
  getPayoutRequestedTrainerEmailTemplate,
  getPayoutCompletedTrainerEmailTemplate,
} from "./emails/templates/wallet.templates";

export {
  getImportJobCompletedTrainerEmailTemplate,
  getTrialEndingTrainerEmailTemplate,
} from "./emails/templates/saas.templates";

export { EmailService } from "./emails/service";

// Legacy helper adapters for previous signature
import {
  getTwoFactorEmailTemplate,
  getResetPasswordEmailTemplate,
} from "./emails/templates/auth.templates";

export function getTwoFactorEmailHtml(code: string): string {
  return getTwoFactorEmailTemplate(code).html;
}

export function getTwoFactorEmailText(code: string): string {
  return getTwoFactorEmailTemplate(code).text;
}

export function getResetPasswordEmailHtml(resetLink: string): string {
  return getResetPasswordEmailTemplate(resetLink).html;
}

export function getResetPasswordEmailText(resetLink: string): string {
  return getResetPasswordEmailTemplate(resetLink).text;
}
