import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-authorization";
import { recordCronResult, recordCronFailure } from "@/lib/cron-health";
import { processGymPurgeBatch } from "@/modules/workspaces/application/gym-purge";
export const runtime="nodejs";
export async function GET(request:Request) {
  if(!isCronAuthorized(request))return NextResponse.json({error:{code:"UNAUTHORIZED"}},{status:401});
  const started=Date.now();
  try {
    const result=await processGymPurgeBatch();
    await recordCronResult("gym-purge",result.success,Date.now()-started);
    return NextResponse.json(result,{status:result.success?200:503});
  } catch {
    await recordCronFailure("gym-purge");
    return NextResponse.json({success:false,error:{code:"PURGE_RETRY_REQUIRED"}},{status:503});
  }
}
