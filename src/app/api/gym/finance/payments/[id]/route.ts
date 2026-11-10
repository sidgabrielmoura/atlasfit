import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
const retired = withAuditedRequest(async function retired(req: Request) {
  try {
    await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" });
    return NextResponse.json({ error: { code: "LEGACY_FINANCE_RETIRED", message: "Registros legados são históricos. Utilize recebimentos e reversões no financeiro da academia." } }, { status: 410 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
export const PATCH = retired;
export const DELETE = retired;
