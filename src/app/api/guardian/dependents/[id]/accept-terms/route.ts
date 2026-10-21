import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { handleWorkspaceAccessError } from "@/modules/workspaces";
import { getGuardianLegalDocument, guardianLegalAcceptanceSchema, recordGuardianLegalAcceptance } from "@/modules/workspaces/application/guardian-legal-commands";

// This historical route uses a guardian relationship ID, scoped to the actor.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 });
    const query = z.object({ workspaceId: z.string().trim().min(1).max(100), documentType: z.enum(["TERMS", "PRIVACY"]) }).strict().safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!query.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Documento e academia obrigatórios." } }, { status: 400 });
    const { id } = await params;
    return NextResponse.json(await getGuardianLegalDocument(query.data.workspaceId, id, session.user.id, query.data.documentType));
  } catch (error) { return failure(error); }
}

// POST: Legal representative accepts terms on behalf of their minor dependent
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.isImpersonated) return NextResponse.json({ error: { code: "SIGNER_NOT_AUTHORIZED", message: "O aceite exige acesso direto do responsável. Uma sessão de suporte não pode assinar por ele." } }, { status: 403 });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Não autorizado." } },
        { status: 401 }
      );
    }

    const { id: guardianId } = await params;
    const parsed = guardianLegalAcceptanceSchema.safeParse(await readJsonRequest(req, 8192));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Confirme explicitamente o documento exibido." } }, { status: 400 });

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const acceptance = await recordGuardianLegalAcceptance({
      ...parsed.data,
      guardianId,
      guardianUserId: session.user.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(acceptance, { status: 201 });
  } catch (error) { return failure(error); }
}

function failure(error: unknown) {
  if (error instanceof JsonRequestError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: error.message } }, { status: error.statusCode });
  const response = handleWorkspaceAccessError(error); if (response) return response;
  console.error("guardian legal document operation failed", { errorType: error instanceof Error ? error.name : "unknown" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível acessar ou registrar o documento." } }, { status: error instanceof SyntaxError ? 400 : 500 });
}
