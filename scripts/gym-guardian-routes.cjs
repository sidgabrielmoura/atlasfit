const fs = require('node:fs');
const root = 'src/app/api/guardian/dependents/[id]/classes/';
for (const operation of ['book', 'cancel']) {
 const field = operation === 'book' ? 'sessionId' : 'bookingId';
 const optional = operation === 'book' ? 'notes' : 'reason';
 const method = operation === 'book' ? 'bookClassForDependent' : 'cancelBookingForDependent';
 const source = `import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { gymBookingService, handleWorkspaceAccessError } from "@/modules/workspaces";
import { logSystemError } from "@/lib/logger";

const bodySchema = z.object({ workspaceId: z.string().trim().min(1).max(100), ${field}: z.string().trim().min(1).max(100), ${optional}: z.string().trim().max(2000).optional() }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Faça login para continuar." } }, { status: 401 });
 try {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dados da operação inválidos." } }, { status: 400 });
  const { id: dependentMemberId } = await params;
  const result = await gymBookingService.${method}({ ...parsed.data, dependentMemberId, guardianUserId: session.user.id });
  return NextResponse.json(result, { status: ${operation === 'book' ? 201 : 200} });
 } catch (error) {
  const accessError = handleWorkspaceAccessError(error);
  if (accessError) return accessError;
  if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON inválido." } }, { status: 400 });
  await logSystemError({ action: "GUARDIAN_${operation.toUpperCase()}_CLASS", error, userId: session.user.id });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação." } }, { status: 500 });
 }
}
`;
 fs.writeFileSync(root + operation + '/route.ts', source);
}
