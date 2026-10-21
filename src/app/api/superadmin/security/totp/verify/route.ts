import { handleMfaMutation, mfaPairBody } from "@/lib/auth/mfa-settings-http";
export function POST(request: Request) { return handleMfaMutation(request, mfaPairBody, ({ reauthenticationProof: _proof, ...body }) => ({ operation: "PAIR", ...body })); }
