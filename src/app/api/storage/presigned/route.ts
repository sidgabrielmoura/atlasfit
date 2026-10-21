import { withAuditedRequest } from "@/lib/audited-request";
import { createStorageUpload } from "@/lib/storage-http";

export const POST = withAuditedRequest(async function POST(req: Request) { return createStorageUpload(req); });
