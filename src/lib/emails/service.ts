import { resend } from "@/lib/resend";
import {
  getTwoFactorEmailTemplate,
  getResetPasswordEmailTemplate,
  getSecurityLoginAlertEmailTemplate,
} from "./templates/auth.templates";
import {
  getStudentInvitationEmailTemplate,
  getNewStudentNotificationTrainerTemplate,
} from "./templates/onboarding.templates";
import {
  getNewInvoiceBillingEmailTemplate,
  getInvoiceReminderEmailTemplate,
  getInvoiceOverdueEmailTemplate,
  getPaymentReceiptStudentEmailTemplate,
  getPaymentConfirmedTrainerEmailTemplate,
  getCardPaymentFailedEmailTemplate,
} from "./templates/billing.templates";
import {
  getNewWorkoutPrescribedEmailTemplate,
  getWorkoutUpdatedEmailTemplate,
} from "./templates/training.templates";
import {
  getPhysicalEvaluationReportEmailTemplate,
  getReassessmentReminderEmailTemplate,
} from "./templates/assessment.templates";
import {
  getNewLeadCapturedTrainerEmailTemplate,
  getCommercialProposalLeadEmailTemplate,
} from "./templates/crm.templates";
import {
  getInactivityAlertStudentEmailTemplate,
  getChurnRiskAlertTrainerEmailTemplate,
  getPlanExpirationNoticeEmailTemplate,
} from "./templates/retention.templates";
import {
  getKycStatusUpdatedEmailTemplate,
  getPayoutRequestedTrainerEmailTemplate,
  getPayoutCompletedTrainerEmailTemplate,
} from "./templates/wallet.templates";
import {
  getImportJobCompletedTrainerEmailTemplate,
  getTrialEndingTrainerEmailTemplate,
} from "./templates/saas.templates";
import { renderBaseEmailLayout } from "./templates/base-layout";

export function getFromEmail(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "AtlasFit <noreply@app.atlasfit.site>"
  );
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export class EmailService {
  /**
   * Safe, non-blocking internal dispatcher.
   * Catches all exceptions so that email delivery failures NEVER break business transactions or UI requests.
   */
  private static async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  }): Promise<SendEmailResult> {
    const { to, subject, html, text, replyTo } = params;

    if (!to || !to.includes("@")) {
      console.warn(`[EmailService] Invalid or missing recipient email address: "${to}"`);
      return { success: false, error: "Invalid recipient email" };
    }

    try {
      const from = getFromEmail();
      const payload: any = {
        from,
        to: [to.trim().toLowerCase()],
        subject,
        html,
        text,
      };

      if (replyTo) {
        payload.reply_to = replyTo;
      }

      const { data, error } = await resend.emails.send(payload);

      if (error) {
        console.error(`[EmailService] Resend dispatch error to ${to}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data?.id };
    } catch (err: any) {
      console.error(`[EmailService] Unexpected exception sending email to ${to}:`, err);
      return { success: false, error: err?.message || "Unexpected email error" };
    }
  }

  // ==========================================
  // AUTH & SECURITY
  // ==========================================

  static async sendTwoFactorCode(email: string, code: string): Promise<SendEmailResult> {
    const tpl = getTwoFactorEmailTemplate(code, email);
    return this.send({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendPasswordReset(email: string, resetLink: string): Promise<SendEmailResult> {
    const tpl = getResetPasswordEmailTemplate(resetLink, email);
    return this.send({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendSecurityLoginAlert(params: {
    to: string;
    userName: string;
    ipAddress: string;
    browser?: string;
    location?: string;
    timestamp?: Date;
  }): Promise<SendEmailResult> {
    const tpl = getSecurityLoginAlertEmailTemplate({
      userName: params.userName,
      ipAddress: params.ipAddress,
      browser: params.browser,
      location: params.location,
      timestamp: params.timestamp || new Date(),
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // ONBOARDING & CLIENT INVITATIONS
  // ==========================================

  static async sendStudentInvitation(params: {
    to: string;
    studentName: string;
    trainerName: string;
    workspaceName: string;
    setupToken: string;
    planName?: string;
  }): Promise<SendEmailResult> {
    const tpl = getStudentInvitationEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      workspaceName: params.workspaceName,
      setupToken: params.setupToken,
      planName: params.planName,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendNewStudentNotificationTrainer(params: {
    to: string;
    trainerName: string;
    studentName: string;
    studentEmail: string;
    planName: string;
    modality: string;
  }): Promise<SendEmailResult> {
    const tpl = getNewStudentNotificationTrainerTemplate({
      trainerName: params.trainerName,
      studentName: params.studentName,
      studentEmail: params.studentEmail,
      planName: params.planName,
      modality: params.modality,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // BILLING & FINANCES
  // ==========================================

  static async sendNewInvoiceBilling(params: {
    to: string;
    studentName: string;
    trainerName: string;
    workspaceName: string;
    description: string;
    amountFormatted: string;
    dueDateFormatted: string;
    pixPayload?: string | null;
    invoiceUrl?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getNewInvoiceBillingEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      workspaceName: params.workspaceName,
      description: params.description,
      amountFormatted: params.amountFormatted,
      dueDateFormatted: params.dueDateFormatted,
      pixPayload: params.pixPayload,
      invoiceUrl: params.invoiceUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendInvoiceReminder(params: {
    to: string;
    studentName: string;
    trainerName: string;
    amountFormatted: string;
    dueDateFormatted: string;
    invoiceUrl?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getInvoiceReminderEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      amountFormatted: params.amountFormatted,
      dueDateFormatted: params.dueDateFormatted,
      invoiceUrl: params.invoiceUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendInvoiceOverdue(params: {
    to: string;
    studentName: string;
    trainerName: string;
    amountFormatted: string;
    dueDateFormatted: string;
    invoiceUrl?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getInvoiceOverdueEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      amountFormatted: params.amountFormatted,
      dueDateFormatted: params.dueDateFormatted,
      invoiceUrl: params.invoiceUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendPaymentReceiptStudent(params: {
    to: string;
    studentName: string;
    trainerName: string;
    planName: string;
    amountFormatted: string;
    paymentMethod: string;
    paidAtFormatted: string;
  }): Promise<SendEmailResult> {
    const tpl = getPaymentReceiptStudentEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      planName: params.planName,
      amountFormatted: params.amountFormatted,
      paymentMethod: params.paymentMethod,
      paidAtFormatted: params.paidAtFormatted,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendPaymentConfirmedTrainer(params: {
    to: string;
    trainerName: string;
    studentName: string;
    amountFormatted: string;
    netAmountFormatted?: string;
    paymentMethod: string;
  }): Promise<SendEmailResult> {
    const tpl = getPaymentConfirmedTrainerEmailTemplate({
      trainerName: params.trainerName,
      studentName: params.studentName,
      amountFormatted: params.amountFormatted,
      netAmountFormatted: params.netAmountFormatted,
      paymentMethod: params.paymentMethod,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendCardPaymentFailed(params: {
    to: string;
    studentName: string;
    trainerName: string;
    amountFormatted: string;
    reason?: string;
    updateCardUrl?: string;
  }): Promise<SendEmailResult> {
    const tpl = getCardPaymentFailedEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      amountFormatted: params.amountFormatted,
      reason: params.reason,
      updateCardUrl: params.updateCardUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // TRAINING & WORKOUTS
  // ==========================================

  static async sendNewWorkoutPrescribed(params: {
    to: string;
    studentName: string;
    trainerName: string;
    workoutName: string;
    goal?: string;
    duration?: string;
    exerciseCount?: number;
  }): Promise<SendEmailResult> {
    const tpl = getNewWorkoutPrescribedEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      workoutName: params.workoutName,
      goal: params.goal,
      duration: params.duration,
      exerciseCount: params.exerciseCount,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendWorkoutUpdated(params: {
    to: string;
    studentName: string;
    trainerName: string;
    workoutName: string;
    changesSummary?: string;
  }): Promise<SendEmailResult> {
    const tpl = getWorkoutUpdatedEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      workoutName: params.workoutName,
      changesSummary: params.changesSummary,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // PHYSICAL EVALUATIONS
  // ==========================================

  static async sendPhysicalEvaluationReport(params: {
    to: string;
    studentName: string;
    trainerName: string;
    evaluationDateFormatted: string;
    evaluationType: string;
    bodyFat?: number | null;
    muscleMass?: number | null;
    weight?: number | null;
    reportUrl?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getPhysicalEvaluationReportEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      evaluationDateFormatted: params.evaluationDateFormatted,
      evaluationType: params.evaluationType,
      bodyFat: params.bodyFat,
      muscleMass: params.muscleMass,
      weight: params.weight,
      reportUrl: params.reportUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendReassessmentReminder(params: {
    to: string;
    studentName: string;
    trainerName: string;
    daysSinceLastAssessment: number;
  }): Promise<SendEmailResult> {
    const tpl = getReassessmentReminderEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      daysSinceLastAssessment: params.daysSinceLastAssessment,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // CRM & SALES
  // ==========================================

  static async sendNewLeadCapturedTrainer(params: {
    to: string;
    trainerName: string;
    leadName: string;
    leadEmail?: string | null;
    leadPhone?: string | null;
    leadInstagram?: string | null;
    leadGoal?: string | null;
    source?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getNewLeadCapturedTrainerEmailTemplate({
      trainerName: params.trainerName,
      leadName: params.leadName,
      leadEmail: params.leadEmail,
      leadPhone: params.leadPhone,
      leadInstagram: params.leadInstagram,
      leadGoal: params.leadGoal,
      source: params.source,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendCommercialProposalLead(params: {
    to: string;
    leadName: string;
    trainerName: string;
    workspaceName: string;
    proposalSummary: string;
    checkoutUrl: string;
  }): Promise<SendEmailResult> {
    const tpl = getCommercialProposalLeadEmailTemplate({
      leadName: params.leadName,
      trainerName: params.trainerName,
      workspaceName: params.workspaceName,
      proposalSummary: params.proposalSummary,
      checkoutUrl: params.checkoutUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // RETENTION & CHURN PREVENTION
  // ==========================================

  static async sendInactivityAlertStudent(params: {
    to: string;
    studentName: string;
    trainerName: string;
    daysInactive: number;
  }): Promise<SendEmailResult> {
    const tpl = getInactivityAlertStudentEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      daysInactive: params.daysInactive,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendChurnRiskAlertTrainer(params: {
    to: string;
    trainerName: string;
    studentName: string;
    daysInactive: number;
    studentPhone?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getChurnRiskAlertTrainerEmailTemplate({
      trainerName: params.trainerName,
      studentName: params.studentName,
      daysInactive: params.daysInactive,
      studentPhone: params.studentPhone,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendPlanExpirationNotice(params: {
    to: string;
    studentName: string;
    trainerName: string;
    planName: string;
    expirationDateFormatted: string;
    renewalUrl?: string;
  }): Promise<SendEmailResult> {
    const tpl = getPlanExpirationNoticeEmailTemplate({
      studentName: params.studentName,
      trainerName: params.trainerName,
      planName: params.planName,
      expirationDateFormatted: params.expirationDateFormatted,
      renewalUrl: params.renewalUrl,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // WALLET & PAYOUTS
  // ==========================================

  static async sendKycStatusUpdated(params: {
    to: string;
    trainerName: string;
    status: "APPROVED" | "PENDING_DOCUMENTS" | "REJECTED";
    reason?: string | null;
  }): Promise<SendEmailResult> {
    const tpl = getKycStatusUpdatedEmailTemplate({
      trainerName: params.trainerName,
      status: params.status,
      reason: params.reason,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendPayoutRequestedTrainer(params: {
    to: string;
    trainerName: string;
    amountFormatted: string;
    pixKeyMasked: string;
    estimatedArrival?: string;
  }): Promise<SendEmailResult> {
    const tpl = getPayoutRequestedTrainerEmailTemplate({
      trainerName: params.trainerName,
      amountFormatted: params.amountFormatted,
      pixKeyMasked: params.pixKeyMasked,
      estimatedArrival: params.estimatedArrival,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendPayoutCompletedTrainer(params: {
    to: string;
    trainerName: string;
    amountFormatted: string;
    pixKeyMasked: string;
    completedAtFormatted: string;
  }): Promise<SendEmailResult> {
    const tpl = getPayoutCompletedTrainerEmailTemplate({
      trainerName: params.trainerName,
      amountFormatted: params.amountFormatted,
      pixKeyMasked: params.pixKeyMasked,
      completedAtFormatted: params.completedAtFormatted,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // SAAS & PLATFORM
  // ==========================================

  static async sendImportJobCompletedTrainer(params: {
    to: string;
    trainerName: string;
    totalStudents: number;
    totalWorkouts: number;
    totalExercises: number;
    jobId: string;
  }): Promise<SendEmailResult> {
    const tpl = getImportJobCompletedTrainerEmailTemplate({
      trainerName: params.trainerName,
      totalStudents: params.totalStudents,
      totalWorkouts: params.totalWorkouts,
      totalExercises: params.totalExercises,
      jobId: params.jobId,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  static async sendTrialEndingTrainer(params: {
    to: string;
    trainerName: string;
    daysRemaining: number;
  }): Promise<SendEmailResult> {
    const tpl = getTrialEndingTrainerEmailTemplate({
      trainerName: params.trainerName,
      daysRemaining: params.daysRemaining,
      recipientEmail: params.to,
    });
    return this.send({ to: params.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  }

  // ==========================================
  // GENERIC NOTIFICATION DISPATCHER
  // ==========================================

  static async sendGenericNotification(params: {
    to: string;
    title: string;
    description: string;
    badgeText?: string;
    badgeColor?: string;
    ctaButton?: { text: string; url: string; color?: string };
    secondaryInfo?: string;
  }): Promise<SendEmailResult> {
    const { to, title, description, badgeText, badgeColor, ctaButton, secondaryInfo } = params;

    const html = renderBaseEmailLayout({
      title,
      badgeText: badgeText || "Notificação",
      badgeColor: badgeColor || "#3b82f6",
      previewText: description.slice(0, 100),
      recipientEmail: to,
      contentHtml: `<p style="margin: 0 0 16px 0; color: #d4d4d8; line-height: 1.6;">${description}</p>`,
      ctaButton,
      secondaryInfoHtml: secondaryInfo,
    });

    const text = `AtlasFit | ${title}\n\n${description}${ctaButton ? `\n\nAcesse: ${ctaButton.url}` : ""}`;

    return this.send({ to, subject: `${title} - AtlasFit`, html, text });
  }
}
