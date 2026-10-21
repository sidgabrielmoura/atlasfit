import { handleMfaMutation, mfaDisableBody } from "@/lib/auth/mfa-settings-http";
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleMfaMutation(request, mfaDisableBody, () => ({ operation: "REMOVE", deviceId: id })); }
