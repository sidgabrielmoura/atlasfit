import { withAuditedRequest } from "@/lib/audited-request";
import { retiredGymGatewayOperation } from "@/modules/workspaces/application/retired-gym-gateway";

export const GET = withAuditedRequest(async function GET(req: Request) { return retiredGymGatewayOperation(req); });
export const POST = withAuditedRequest(async function POST(req: Request) { return retiredGymGatewayOperation(req); });
