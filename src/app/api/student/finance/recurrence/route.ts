import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { paymentService } from "@/modules/payments/application/payment-service";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const studentUserId = session.user.id;
    const studentMember = await getStudentWorkspaceMember(studentUserId);

    if (!studentMember) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    }

    if (studentMember.workspace.type === "GYM") return NextResponse.json({ error: "A academia opera mensalidades internas. Cancelamento de matrícula deve ser solicitado à academia." }, { status: 410 });

    await paymentService.cancelStudentSubscription(studentUserId, studentMember.workspaceId);

    return NextResponse.json({ success: true, message: "Recorrência cancelada com sucesso!" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao cancelar recorrência";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
