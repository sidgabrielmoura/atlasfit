import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GymImportService } from "@/modules/workspaces";

export const GET = withAuditedRequest(async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação obrigatória." } },
        { status: 401 }
      );
    }

    const sampleCsv = GymImportService.generateSampleCsv();

    return new NextResponse(sampleCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="modelo-importacao-academia.csv"',
      },
    });
  } catch (error) {
    console.error("[GYM_IMPORT_TEMPLATE_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao gerar planilha modelo de importação." } },
      { status: 500 }
    );
  }
});
