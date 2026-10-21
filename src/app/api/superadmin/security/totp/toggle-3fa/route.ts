import { handleMfaMutation, mfaThreeFactorBody } from "@/lib/auth/mfa-settings-http";
export function POST(request: Request) { return handleMfaMutation(request, mfaThreeFactorBody, body => ({ operation: "THREE_FACTOR", enabled: body.enabled })); }
