import { auth } from "@/auth";
import { withAuditIdentity } from "./audit-context";
import { withRequestMemo } from "./request-memo";

/** auth validates both live accounts and the original administrator's session version. */
export function withAuditedRequest<Args extends unknown[], Result>(handler: (...args: Args) => Promise<Result>) {
  return withRequestMemo(async (...args: Args): Promise<Result> => {
    const session = await auth();
    const user = session?.user;
    if (user?.isImpersonated && !user.originalAdminUserId) throw new Error("INVALID_AUDIT_IDENTITY");
    const identity = user?.id ? { actorUserId: user.isImpersonated ? user.originalAdminUserId! : user.id, effectiveUserId: user.id, impersonated: Boolean(user.isImpersonated) } : undefined;
    return withAuditIdentity(identity, () => handler(...args));
  });
}
