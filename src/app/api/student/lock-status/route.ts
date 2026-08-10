import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const studentUserId = session.user.id;

    const pendingBillings = await prisma.studentBilling.findMany({
      where: {
        studentUserId,
        status: { in: ["PENDING", "OVERDUE"] }
      },
      orderBy: { dueDate: "asc" }
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
    const msg = err instanceof Error ? err.message : "Erro ao checar pendências";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
