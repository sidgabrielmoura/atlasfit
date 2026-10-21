import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import { handleWorkspaceAccessError } from "@/modules/workspaces"
import { acceptGymContract, getGymContractForSigner, gymContractAcceptanceSchema } from "@/modules/workspaces/application/enrollment-contract"

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuditedRequest(async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Autenticação obrigatória." } }, { status: 401 })
    const parsed = z.object({ workspaceId: z.string().trim().min(1).max(100) }).strict().safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 })
    const { id } = await params
    return NextResponse.json(await getGymContractForSigner(parsed.data.workspaceId, id, session.user.id))
  } catch (error) { return failure(error) }
});

// POST /api/gym/enrollments/[id]/accept: Sign contract terms electronically
export const POST = withAuditedRequest(async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (session?.user?.isImpersonated) return NextResponse.json({ error: { code: "SIGNER_NOT_AUTHORIZED", message: "O aceite exige acesso direto do aluno ou responsável. Uma sessão de suporte não pode assinar por ele." } }, { status: 403 })
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação obrigatória." } },
        { status: 401 }
      )
    }

    const { id: enrollmentId } = await params
    const parsed = gymContractAcceptanceSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Confirme explicitamente as condições exibidas." } }, { status: 400 })

    // Capture client network metadata for legal proof
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null
    const userAgent = req.headers.get("user-agent") || null

    const updated = await acceptGymContract({
      ...parsed.data,
      enrollmentId,
      signerUserId: session.user.id,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(updated)
  } catch (error) { return failure(error) }
});

function failure(error: unknown) {
  const response = handleWorkspaceAccessError(error); if (response) return response
  console.error("GYM contract operation failed", { errorType: error instanceof Error ? error.name : "unknown" })
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível acessar ou registrar o contrato." } }, { status: error instanceof SyntaxError ? 400 : 500 })
}
