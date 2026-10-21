import { withRequestMemo } from "@/lib/request-memo";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { personalStudentBillingScope } from "@/lib/student-billing-scope";
import { getGymStudentFinance } from "@/modules/workspaces/application/gym-student-finance";
import { handleWorkspaceAccessError } from "@/modules/workspaces";
import { AsaasAdapter } from "@/modules/payments/providers/asaas/asaas-adapter";
import { StudentBillingStatus } from "@prisma/client";
import { enforceWalletRateLimit } from "@/modules/payments/security/wallet-security";
import { webhookProcessor } from "@/modules/payments/webhooks/webhook-processor";

const adapter = new AsaasAdapter();

async function handleGET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const studentMember = await getStudentWorkspaceMember(session.user.id);
    if (!studentMember) return NextResponse.json({ error: "Selecione um vínculo estudantil ativo." }, { status: 409 });
    if (studentMember.workspace.type === "GYM") {
      const rawPage = new URL(req.url).searchParams.get("page") || "1";
      if (!/^[1-9]\d{0,4}$/.test(rawPage)) return NextResponse.json({ error: "Página inválida." }, { status: 400 });
      return NextResponse.json(await getGymStudentFinance(studentMember.workspaceId, studentMember.id, session.user.id, Number(rawPage)));
    }

    // 1. Rate Limit Enforcement (Prevenção de sobrecarga em consultas externas ao Asaas)
    const rateLimitResult = await enforceWalletRateLimit(req, req.method === "POST" ? "WALLET_SYNC" : "STUDENT_FINANCE_READ", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const studentUserId = session.user.id;
    const billingScope = personalStudentBillingScope(studentUserId, studentMember.workspaceId, studentMember.workspace.ownerId);

    if (req.method === "POST") {
    const studentPendingBillings = await prisma.studentBilling.findMany({
      where: {
        ...billingScope,
        status: { in: [StudentBillingStatus.PENDING, StudentBillingStatus.CONFIRMED, StudentBillingStatus.OVERDUE] }
      },
      include: {
        account: { select: { providerAccountId: true } }
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 10
    });

    for (const billing of studentPendingBillings) {
      if (!billing.providerBillingId || !billing.account?.providerAccountId) continue;
      const remotePayment = await adapter.getPayment(
        billing.providerBillingId,
        billing.account.providerAccountId
      );

      if (
        remotePayment &&
        ["RECEIVED", "CONFIRMED", "DUNNING_RECEIVED", "RECEIVED_IN_CASH"].includes(remotePayment.status)
      ) {
        await webhookProcessor.recordProviderPaymentSnapshot({ billingId: billing.id, providerAccountId: billing.providerAccountId, payment: remotePayment });
      }
    }

    }

    const rawPage = new URL(req.url).searchParams.get("page") || "1";
    if (!/^[1-9]\d{0,3}$/.test(rawPage) || Number(rawPage) > 1000) return NextResponse.json({ error: "Página inválida." }, { status: 400 });
    const page = Number(rawPage);
    const billings = await prisma.studentBilling.findMany({
      where: billingScope,
      select: { id: true, title: true, grossAmountInCents: true, dueDate: true, status: true, paymentMethod: true, pixPayloadEncrypted: true, hostedInvoiceUrl: true, paidAt: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51, skip: (page - 1) * 50
    });

    const statusTotals = await prisma.studentBilling.groupBy({ by: ["status"], where: billingScope, _sum: { grossAmountInCents: true }, _count: { _all: true } });
    const sumStatuses = (statuses: string[]) => statusTotals.filter(row => statuses.includes(row.status)).reduce((sum, row) => sum + (row._sum.grossAmountInCents || BigInt(0)), BigInt(0)).toString();
    const totals = { pendingInCents: sumStatuses(["PENDING", "OVERDUE", "CONFIRMED"]), paidInCents: sumStatuses(["SETTLED", "AVAILABLE"]) };
    const hasMore = billings.length > 50;
    if (hasMore) billings.pop();
    const nextDue = await prisma.studentBilling.findFirst({ where: { ...billingScope, status: { in: ["PENDING", "OVERDUE", "CONFIRMED"] } }, orderBy: [{ dueDate: "asc" }, { id: "asc" }], select: { dueDate: true } });
    const pendingBillings = billings
      .filter((b) => b.status === "PENDING" || b.status === "OVERDUE" || b.status === "CONFIRMED")
      .map((b) => ({
        id: b.id,
        title: b.title,
        grossAmountInCents: b.grossAmountInCents.toString(),
        dueDate: b.dueDate.toISOString(),
        status: b.status,
        paymentMethod: b.paymentMethod,
        pixCopyPaste: b.pixPayloadEncrypted || undefined,
        hostedInvoiceUrl: b.hostedInvoiceUrl || undefined
      }));

    const paidBillings = billings
      .filter((b) => b.status === "SETTLED" || b.status === "AVAILABLE")
      .map((b) => ({
        id: b.id,
        title: b.title,
        grossAmountInCents: b.grossAmountInCents.toString(),
        paidAt: b.paidAt ? b.paidAt.toISOString() : b.createdAt.toISOString(),
        paymentMethod: b.paymentMethod,
        hostedInvoiceUrl: b.hostedInvoiceUrl || undefined
      }));

    const nextDueDate = nextDue?.dueDate.toISOString() || null;

    const activeRecurrence = studentMember && studentMember.billingIsActive && (studentMember.billingControlType === "AUTOMATIC" || studentMember.billingControlType === "CONFIRMATION" || (studentMember as any).billingSource === "ATLAS_PAY")
      ? {
          id: studentMember.id,
          price: studentMember.billingPrice,
          periodicity: studentMember.billingPeriodicity,
          paymentMethod: studentMember.billingPaymentMethod || "CREDIT_CARD",
          source: (studentMember as any).billingSource || "MANUAL",
          asaasSubscriptionId: (studentMember as any).asaasSubscriptionId || null,
          createdAt: (studentMember as any).billingCreatedAt ? (studentMember as any).billingCreatedAt.toISOString() : studentMember.createdAt.toISOString(),
          nextDueDate: studentMember.billingNextDueDate ? studentMember.billingNextDueDate.toISOString() : null,
          description: studentMember.billingDescription || "Mensalidade de Assessoria"
        }
      : null;

    return NextResponse.json({
      workspaceName: studentMember?.workspace?.name || "AtlasFit Workspace",
      activePlan: {
        name: "Consultoria AtlasFit",
        status: studentMember?.isActive ? "ATIVO" : "INATIVO",
        nextDueDate
      },
      activeRecurrence,
      pendingBillings,
      totals,
      pagination: { page, pageSize: 50, hasMore },
      paidBillings
    });
  } catch (err: unknown) {
    const accessError = handleWorkspaceAccessError(err); if (accessError) return accessError;
    const msg = err instanceof Error ? err.message : "Erro ao buscar finanças do aluno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export const POST = handleGET;
