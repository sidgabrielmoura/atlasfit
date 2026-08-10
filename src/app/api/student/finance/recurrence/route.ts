import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { paymentService } from "@/modules/payments/application/payment-service";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const studentUserId = session.user.id;
    const studentMember = await prisma.workspaceMember.findFirst({
      where: { userId: studentUserId, role: "STUDENT" }
    });

    if (!studentMember) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    }

    await paymentService.cancelStudentSubscription(studentUserId, studentMember.workspaceId);

    return NextResponse.json({ success: true, message: "Recorrência cancelada com sucesso!" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao cancelar recorrência";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
