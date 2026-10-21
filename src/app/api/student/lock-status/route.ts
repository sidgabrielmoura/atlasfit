import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { personalStudentBillingScope } from "@/lib/student-billing-scope";

async function handleGET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const member = await getStudentWorkspaceMember(session.user.id);
    if (!member) return NextResponse.json({ error: "Selecione um vínculo estudantil ativo." }, { status: 409 });

    // Manual GYM obligations never drive the legacy PERSONAL wallet/workout lock.
    // Physical access continues to be evaluated by the academy's access policy.
    if (member.workspace.type === "GYM") return NextResponse.json({ kind: "GYM_MANUAL", workspaceId: member.workspaceId, status: "OK", daysUntilLock: null, overdueBilling: null });

    const pendingBillings = await prisma.studentBilling.findMany({
      where: {
        ...personalStudentBillingScope(session.user.id, member.workspaceId, member.workspace.ownerId),
        status: { in: ["PENDING", "OVERDUE"] }
      },
      orderBy: { dueDate: "asc" },
      take: 1,
      select: { id: true, title: true, grossAmountInCents: true, dueDate: true, hostedInvoiceUrl: true, pixPayloadEncrypted: true },
    });

    if (pendingBillings.length === 0) {
      return NextResponse.json({
        status: "OK",
        daysUntilLock: null,
        overdueBilling: null
      });
    }

    const now = new Date();
    const oldestPending = pendingBillings[0];
    const dueDate = new Date(oldestPending.dueDate);

    const isOverdue = now > dueDate;
    if (!isOverdue) {
      const diffMs = dueDate.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 5) {
        return NextResponse.json({
          status: "UPCOMING",
          daysUntilLock: daysUntilDue,
          overdueBilling: {
            id: oldestPending.id,
            title: oldestPending.title,
            grossAmountInCents: oldestPending.grossAmountInCents.toString(),
            dueDate: oldestPending.dueDate.toISOString(),
            pixCopyPaste: oldestPending.pixPayloadEncrypted || undefined,
            hostedInvoiceUrl: oldestPending.hostedInvoiceUrl || undefined
          }
        });
      }

      return NextResponse.json({
        status: "OK",
        daysUntilLock: null,
        overdueBilling: null
      });
    }

    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
    const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const GRACE_PERIOD_DAYS = 5;

    const daysUntilLock = Math.max(0, GRACE_PERIOD_DAYS - overdueDays);
    const isLocked = overdueDays >= GRACE_PERIOD_DAYS;

    return NextResponse.json({
      status: isLocked ? "LOCKED" : "WARNING",
      daysUntilLock,
      overdueBilling: {
        id: oldestPending.id,
        title: oldestPending.title,
        grossAmountInCents: oldestPending.grossAmountInCents.toString(),
        dueDate: oldestPending.dueDate.toISOString(),
        pixCopyPaste: oldestPending.pixPayloadEncrypted || undefined,
        hostedInvoiceUrl: oldestPending.hostedInvoiceUrl || undefined
      }
    });
  } catch (err: unknown) {
    console.error("[StudentLockStatus]", { errorType: err instanceof Error ? err.name : "UnknownError" });
    return NextResponse.json({ error: "Não foi possível consultar as pendências." }, { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
