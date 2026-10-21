import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withAuditedRequest } from "@/lib/audited-request";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { previewGymPurge, requestGymPurge, processGymPurge } from "@/modules/workspaces/application/gym-purge";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

async function admin() {
  const session = await auth();
  if (!session?.user?.id) throw new WorkspaceAccessError(401,"UNAUTHORIZED","Faça login para continuar.");
  if (session.user.role !== "SUPERADMIN" || session.user.isImpersonated) throw new WorkspaceAccessError(403,"INSUFFICIENT_PERMISSIONS","A purga exige a sessão própria do superadmin.");
  return session.user.id;
}
function failure(error: unknown) {
  const access = handleWorkspaceAccessError(error); if (access) return access;
  if (error instanceof JsonRequestError) return NextResponse.json({error:{code:"INVALID_REQUEST",message:error.message}},{status:error.statusCode});
  return NextResponse.json({error:{code:"PURGE_UNAVAILABLE",message:"Não foi possível confirmar a purga. Consulte a mesma solicitação."}},{status:503});
}
export const runtime="nodejs";
export const GET=withAuditedRequest(async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try { const actor=await admin(),{id}=await params;return NextResponse.json({data:await previewGymPurge(id,actor)},{headers:{"Cache-Control":"private, no-store"}}); }
  catch(error){return failure(error);}
});
export const POST=withAuditedRequest(async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const actor=await admin(),{id}=await params;
    const queued=await requestGymPurge(id,await readJsonRequest(request,4096),actor);
    const result=queued.status==="COMPLETED"?queued:await processGymPurge(id);
    return NextResponse.json({data:result},{status:result.status==="COMPLETED"?200:202,headers:{"Cache-Control":"private, no-store"}});
  } catch(error){return failure(error);}
});
