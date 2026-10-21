import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { DELETE as offboard } from "../route";

/** Compatibility entry point retains its envelope and executes the same command. */
export const POST = withAuditedRequest(async function POST(req: Request, params: { params: Promise<{ id: string }> }) {
  const response = await offboard(req, params);
  if (!response.ok) return response;
  const data: unknown = await response.json();
  return NextResponse.json({ data }, { status: response.status });
});
