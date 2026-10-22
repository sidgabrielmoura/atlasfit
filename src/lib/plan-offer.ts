import type { Plan } from "@prisma/client";

/** Fields shared by a private offer and its global catalog copy. */
export function planOfferFields(plan: Plan) {
  return {
    name: plan.name, price: plan.price, interval: plan.interval,
    features: plan.features, imageUrl: plan.imageUrl,
    maxWorkspaces: plan.maxWorkspaces, maxStudents: plan.maxStudents,
    importQuota: plan.importQuota, storageLimitMb: plan.storageLimitMb,
    paymentMethods: plan.paymentMethods,
  };
}
