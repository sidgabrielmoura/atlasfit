import { handleMfaMutation, mfaDisableBody } from "@/lib/auth/mfa-settings-http";
export function POST(request: Request) { return handleMfaMutation(request, mfaDisableBody, () => ({ operation: "DISABLE" })); }
