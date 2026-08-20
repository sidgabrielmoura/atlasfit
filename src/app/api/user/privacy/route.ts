import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { DataSubjectRequestType, LegalDocumentType } from "@prisma/client";

// GET: Fetch compliance status, latest documents, user acceptances, and submitted DSR requests
export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [compliance, acceptances, consents, requests, activeTerms, activePrivacy] = await Promise.all([
      LegalAcceptanceService.checkUserCompliance(userId),
      prisma.legalAcceptance.findMany({
        where: { userId },
        orderBy: { acceptedAt: "desc" },
        take: 20,
      }),
      prisma.privacyConsent.findMany({
        where: { userId },
      }),
      prisma.dataSubjectRequest.findMany({
        where: { requesterUserId: userId },
        orderBy: { requestedAt: "desc" },
      }),
      LegalAcceptanceService.getActiveDocument(LegalDocumentType.TERMS),
      LegalAcceptanceService.getActiveDocument(LegalDocumentType.PRIVACY),
    ]);

    return NextResponse.json({
      compliance,
      activeDocuments: {
        terms: activeTerms,
        privacy: activePrivacy,
      },
      acceptances,
      consents,
      requests,
    });
  } catch (error: any) {
    console.error("[PRIVACY_API_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro ao consultar informações de privacidade." }, { status: 500 });
  }
}

// POST: Submit a formal Data Subject Request (DSR) under LGPD
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, notes } = body;

    const validTypes = Object.values(DataSubjectRequestType);
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de solicitação inválido." }, { status: 400 });
    }

    const createdRequest = await prisma.dataSubjectRequest.create({
      data: {
        requesterUserId: session.user.id,
        type,
        notes: notes ? String(notes).trim().substring(0, 1000) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `LGPD_DSR_CREATED: ${type}`,
        entity: "DATA_SUBJECT_REQUEST",
        entityId: createdRequest.id,
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, request: createdRequest }, { status: 201 });
  } catch (error: any) {
    console.error("[PRIVACY_API_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro ao registrar solicitação LGPD." }, { status: 500 });
  }
}
