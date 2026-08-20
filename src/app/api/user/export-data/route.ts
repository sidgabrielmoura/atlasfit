import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { DataExportService } from "@/lib/privacy/export.service";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  // Rate limit: 2 exports per hour per user
  const limiter = await rateLimit(`data-export:${session.user.id}`, 2, 3600000);

  if (!limiter.success) {
    return NextResponse.json(
      { error: "Limite de exportações atingido. Você pode solicitar um novo download em 1 hora." },
      { status: 429 }
    );
  }

  try {
    const exportPackage = await DataExportService.generateUserDataPackage(session.user.id);

    return new NextResponse(JSON.stringify(exportPackage, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="atlasfit-export-${session.user.id}-${Date.now()}.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("[DATA_EXPORT_API_ERROR]", error);
    return NextResponse.json({ error: error.message || "Erro ao gerar pacote de dados." }, { status: 500 });
  }
}
