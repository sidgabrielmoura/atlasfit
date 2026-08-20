import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConsentService } from "@/lib/privacy/consent.service";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent");

  // Rate limit: max 20 consent updates per minute per user
  const limiter = await rateLimit(`consent:${session.user.id}`, 20, 60000);
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Muitas alterações de consentimento em curto intervalo. Tente novamente em alguns segundos." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { purpose, granted } = body;

    const allowedPurposes = ["MARKETING_EMAIL", "MARKETING_WHATSAPP", "OPTIONAL_AI_PROCESSING"];
    if (!purpose || !allowedPurposes.includes(purpose)) {
      return NextResponse.json({ error: "Finalidade de consentimento inválida." }, { status: 400 });
    }

    if (typeof granted !== "boolean") {
      return NextResponse.json({ error: "O status do consentimento deve ser booleano (true/false)." }, { status: 400 });
    }

    const result = await ConsentService.setConsent({
      userId: session.user.id,
      purpose,
      granted,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[PRIVACY_CONSENT_API_ERROR]", error);
    return NextResponse.json({ error: "Erro ao atualizar consentimento." }, { status: 500 });
  }
}
