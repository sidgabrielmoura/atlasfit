import { rejectActiveGymGateway } from "../domain/gateway-policy";
import { manualSubscriptionService } from "./manual-subscription-service";
import type { GymRecurrenceMode, GymBillingType } from "@prisma/client";

export interface SetupEnrollmentSubscriptionInput {
  workspaceId: string;
  enrollmentId: string;
  actorUserId: string;
  recurrenceMode: GymRecurrenceMode;
  billingType: GymBillingType;
  customFirstDueDate?: Date;
  creditCardToken?: string;
  creditCardData?: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string; postalCode?: string; addressNumber?: string; phone?: string };
}
export interface GenerateCycleInvoiceInput { workspaceId: string; enrollmentId: string; actorUserId: string; competenceMonth?: string; dueDate?: Date }
export interface CancelSubscriptionInput { workspaceId: string; enrollmentId: string; actorUserId: string; cancellationReason: string; immediate?: boolean }
export interface ReconcileSubscriptionInput { workspaceId: string; enrollmentId: string; actorUserId: string }

/** Local recurring obligations; legacy provider events are retained by WebhookProcessor for review. */
export class GymSubscriptionService {
  async setupEnrollmentSubscription(input: SetupEnrollmentSubscriptionInput) { return manualSubscriptionService.setup(input); }
  async generateCycleInvoice(input: GenerateCycleInvoiceInput) { return manualSubscriptionService.cycle(input); }
  async cancelSubscription(input: CancelSubscriptionInput) { return manualSubscriptionService.stop(input); }
  async reconcileSubscription(_input: ReconcileSubscriptionInput) { rejectActiveGymGateway(); }
  async handleSubscriptionWebhook(_event: { eventType: string; resourceId: string; subscriptionId?: string; rawPayload: unknown }) { rejectActiveGymGateway(); }
}
export const gymSubscriptionService = new GymSubscriptionService();