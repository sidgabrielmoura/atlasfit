import { withAuditedRequest } from "@/lib/audited-request";
import { retiredGymGatewayOperation } from "@/modules/workspaces/application/retired-gym-gateway";

export const POST = withAuditedRequest(async function POST(req: Request) { return retiredGymGatewayOperation(req); });
