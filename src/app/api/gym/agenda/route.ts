import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { gymPersonalAgenda } from "@/modules/workspaces/application/gym-personal-agenda";
import { getGymWorkoutStudentOptions } from "@/modules/workspaces/application/gym-workout-query";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { JsonRequestError } from "@/lib/http/read-json";
import { isAllowedOrigin } from "@/lib/auth/application-origin";

async function handle(req: Request, method: "GET" | "POST" | "PATCH" | "DELETE") {
  try {
    const origin = req.headers.get("origin");
    if (method !== "GET" && (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin)))) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    const body = z.object({ workspaceId: z.string().min(1), taskId: z.string().min(1).optional() }).passthrough().parse(method === "POST" || method === "PATCH" ? await readPrivacyJsonRequest(req, 4096) : Object.fromEntries(new URL(req.url).searchParams));
    const workspaceId = z.string().min(1).parse(body.workspaceId);
    const context = await requireGymWorkspaceAccess({ workspaceId });
    const { workspaceId: ignored, taskId, ...input } = body;
    const result = await gymPersonalAgenda(workspaceId, context.userId, method, method === "GET" ? input.date : input, taskId === undefined ? undefined : z.string().min(1).parse(taskId));
    if (method === "GET" && "intelligentStudentsList" in result) {
      const options = await getGymWorkoutStudentOptions({ workspaceId, actorUserId: context.userId, page: 1 });
      return NextResponse.json({ ...result, intelligentStudentsList: options.data.map(student => ({ id: student.userId, name: student.name })) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json(result, { status: method === "POST" ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados da agenda inválidos." }, { status: 400 });
    if (error instanceof JsonRequestError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    throw error;
  }
}
export const GET = (req: Request) => handle(req, "GET");
export const POST = (req: Request) => handle(req, "POST");
export const PATCH = (req: Request) => handle(req, "PATCH");
export const DELETE = (req: Request) => handle(req, "DELETE");
