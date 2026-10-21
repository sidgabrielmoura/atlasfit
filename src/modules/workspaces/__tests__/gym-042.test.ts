import { describe, it, expect } from "vitest";
import { gymSubscriptionService } from "../application/subscription-service";

describe("GYM: gateway retirado e legado preservado", () => {
  it("recusa processamento direto e conciliação mutante; ingresso legado usa fila de revisão", async () => {
    await expect(gymSubscriptionService.reconcileSubscription({ workspaceId: "gym", enrollmentId: "legacy", actorUserId: "actor" })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" });
    await expect(gymSubscriptionService.handleSubscriptionWebhook({ eventType: "PAYMENT_RECEIVED", resourceId: "payment", subscriptionId: "legacy", rawPayload: {} })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" });
  });
});