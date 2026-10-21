import { withAuditedRequest } from "@/lib/audited-request";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymStudentService } from "@/modules/workspaces";
const schema = z.object({ workspaceId: z.string().min(1).max(100), unitId: z.string().min(1).max(100), cpf: z.string().max(30).optional(), email: z.string().max(254).optional() }).strict();
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = schema.parse(await readPrivacyJsonRequest(req, 4096));
    const context = await requireGymWorkspaceAccess({ workspaceId: body.workspaceId, requiredCapabilities: ["students.manage"], unitId: body.unitId });
    const result = await gymStudentService.checkDuplicate(body.workspaceId, { cpf: body.cpf, email: body.email }, context.userId, body.unitId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Não foi possível conferir a conta." } }, { status: 400 }); }
});
