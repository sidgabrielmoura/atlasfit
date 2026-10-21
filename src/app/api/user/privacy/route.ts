import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { DataSubjectRequestType, LegalDocumentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { submitGymPrivacyRequest } from "@/modules/workspaces/application/gym-privacy-requests";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { handleWorkspaceAccessError } from "@/modules/workspaces";

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
        where: { requesterUserId: userId, OR: [{ metadata: { equals: Prisma.DbNull } }, { NOT: { metadata: { path: ["purpose"], equals: "GYM_IDENTITY_LINK" } } }] },
        orderBy: { requestedAt: "desc" },
        take: 100,
        select: { id: true, workspaceId: true, type: true, status: true, requestedAt: true, completedAt: true, rejectionReason: true, metadata: true },
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
      requests: requests.map(({ metadata, ...request }) => { const m = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}; return { ...request, response: typeof m.response === "string" ? m.response : null, retention: m.decision ?? null }; }),
      gymWorkspaces: (await prisma.workspaceMember.findMany({ where: { userId, workspace: { type: "GYM" } }, select: { workspace: { select: { id: true, name: true } } } })).map(member => member.workspace),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[PRIVACY_API_GET_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Erro ao consultar informações de privacidade." }, { status: 500 });
  }
}

// POST: Submit a formal Data Subject Request (DSR) under LGPD
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (session.user.isImpersonated) return NextResponse.json({ error: "Encerre a impersonação para enviar pedido próprio." }, { status: 403 });

  try {
    const body = z.object({ type: z.enum(DataSubjectRequestType), notes: z.string().trim().max(2000).optional(), workspaceId: z.string().min(1).max(100).nullable().optional() }).strict().parse(await readPrivacyJsonRequest(req, 6000));
    const { type, notes } = body;
    if (body.workspaceId) return NextResponse.json({ success: true, request: await submitGymPrivacyRequest({ workspaceId: body.workspaceId, targetUserId: session.user.id, actorUserId: session.user.id, type, notes }) }, { status: 201, headers: { "Cache-Control": "no-store" } });

    const validTypes = Object.values(DataSubjectRequestType);
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de solicitação inválido." }, { status: 400 });
    }

    const createdRequest = await serializableTransaction(async tx => {
    const existing = await tx.dataSubjectRequest.findFirst({ where: { requesterUserId: session.user.id, workspaceId: null, type, status: { in: ["PENDING", "IDENTITY_VERIFICATION", "IN_REVIEW", "PROCESSING"] } } });
    if (existing) return { id: existing.id, type: existing.type, status: existing.status, requestedAt: existing.requestedAt };
    const created = await tx.dataSubjectRequest.create({
      data: {
        requesterUserId: session.user.id,
        type,
        notes: notes || null,
        metadata: { purpose: "PLATFORM_DSR", identityVerifiedAt: new Date().toISOString(), identityVerifiedBy: session.user.id },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: `LGPD_DSR_CREATED: ${type}`,
        entity: "DATA_SUBJECT_REQUEST",
        entityId: created.id,
        severity: "info",
      },
    });
    return { id: created.id, type: created.type, status: created.status, requestedAt: created.requestedAt };
    });

    return NextResponse.json({ success: true, request: createdRequest }, { status: 201 });
  } catch (error: any) {
    const handled = handleWorkspaceAccessError(error); if (handled) return handled;
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados do pedido inválidos." }, { status: 400 });
    console.error("[PRIVACY_API_POST_ERROR] Pedido não registrado.");
    return NextResponse.json({ error: "Erro ao registrar solicitação LGPD." }, { status: 500 });
  }
}
