import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { LegalDocumentType, LegalAcceptanceType } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { documentType, documentVersion } = body;

    const validTypes = Object.values(LegalDocumentType);
    if (!documentType || !validTypes.includes(documentType)) {
      return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Web Client";

    const acceptance = await LegalAcceptanceService.recordAcceptance({
      userId: session.user.id,
      documentType,
      documentVersion,
      acceptanceType: LegalAcceptanceType.REACCEPTANCE,
      ipAddress: ip,
      userAgent,
      source: "IN_APP_MODAL",
    });

    return NextResponse.json({ success: true, acceptance });
  } catch (error: any) {
    console.error("[LEGAL_ACCEPT_API_ERROR]", error);
    return NextResponse.json({ error: error.message || "Erro ao registrar aceite." }, { status: 500 });
  }
}
