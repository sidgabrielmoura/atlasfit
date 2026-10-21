import { withAuditedRequest } from "@/lib/audited-request";
import { serveStorageFile } from "@/lib/storage-http";

export const GET = withAuditedRequest(async function GET(req: Request) { return serveStorageFile(req); });
