import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { mutateMfaSettings } from "./mfa-settings-service";
export const mfaProofFields = { reauthenticationProof: z.string().regex(/^[a-f0-9]{64}$/).optional() };
export const mfaPairBody = z.object({ ...mfaProofFields, secret: z.string().regex(/^[A-Z2-7]{32}$/), token: z.string().regex(/^\d{6}$/), deviceName: z.string().trim().min(1).max(100).optional() }).strict();
export const mfaDisableBody = z.object(mfaProofFields).strict();
export const mfaThreeFactorBody = z.object({ ...mfaProofFields, enabled: z.boolean() }).strict();
export async function handleMfaMutation<T extends { reauthenticationProof?: string }>(request: Request, schema: z.ZodType<T>, operation: (body: T) => unknown) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN" || session.user.isImpersonated || session.user.sessionVersion === undefined) return NextResponse.json({ error: "Acesso negado. Entre na própria conta administrativa." }, { status: 403 });
  try {
    const parsed = schema.safeParse(await readJsonRequest(request, 4096));
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados de configuração MFA inválidos.");
    return NextResponse.json(await mutateMfaSettings(session.user.id, session.user.sessionVersion, operation(parsed.data), parsed.data.reauthenticationProof), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    if (error instanceof JsonRequestError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Não foi possível salvar a configuração MFA." }, { status: 500 });
  }
}
