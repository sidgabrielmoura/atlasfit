/** Only this public local journey may override the normal login destination. */
export function gymInvitationReturn(value: unknown): string | null {
  if (value === "/guardian/dependents") return value;
  if (typeof value === "string" && /^\/account\/gym-link\?requestId=[a-z0-9_-]{1,100}&token=[a-f0-9]{64}$/i.test(value)) return value;
  if (typeof value === "string" && /^\/account\/gym-privacy(?:\?workspaceId=[a-z0-9_-]{1,100})?$/i.test(value)) return value;
  if (typeof value !== "string" || !/^\/auth\/(?:invite|guardian-invite)\?token=[a-f0-9]{64}$/i.test(value)) return null;
  return value;
}
