import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { closeGymWorkspace } from "@/modules/workspaces/application/gym-closure";
import { gymPurgeDeadline } from "@/modules/workspaces/domain/gym-retention-policy";
import { requestGymPurge, previewGymPurge, processGymPurge, processGymPurgeBatch } from "@/modules/workspaces/application/gym-purge";
import { encryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

const sandbox = vi.hoisted(() => ({ name: "atlasfit_purge_tests_"+globalThis.crypto.randomUUID().replaceAll("-",""), objects: new Set<string>(), deleted: [] as string[], failDelete: false, foreignKey: false, onDelete:null as null|(()=>Promise<void>) }));
vi.mock("@/lib/prisma", async () => {
  const {PrismaClient}=await import("@prisma/client"),{PrismaPg}=await import("@prisma/adapter-pg");
  return {default:new PrismaClient({adapter:new PrismaPg({connectionString:"postgresql://atlasfit_test@127.0.0.1:56432/"+sandbox.name})})};
});
vi.mock("@/lib/storage.service",()=>({StorageConfigurationError:class extends Error{},storageService:{
  async listWorkspaceObjects(workspaceId:string){if(sandbox.foreignKey)return {keys:["workspace/foreign/files/private.pdf"],hasMore:false};const keys=[...sandbox.objects].filter(key=>key.startsWith(`workspace/${workspaceId}/`));return {keys:keys.slice(0,100),hasMore:keys.length>100};},
  async deleteObject(key:string){if(sandbox.onDelete){const callback=sandbox.onDelete;sandbox.onDelete=null;await callback();}if(sandbox.failDelete&&sandbox.deleted.length===1)throw Error("Synthetic storage failure");sandbox.objects.delete(key);sandbox.deleted.push(key);},
}}));
const configured=new URL(process.env.DATABASE_URL!);
if(configured.hostname!=="127.0.0.1"||configured.port!=="56432")throw Error("Disposable PostgreSQL required");
const sql=new Client({connectionString:"postgresql://atlasfit_test@127.0.0.1:56432/"+sandbox.name});
beforeAll(async()=>{
 const admin=new Client({connectionString:"postgresql://atlasfit_test@127.0.0.1:56432/postgres"});await admin.connect();await admin.query(`CREATE DATABASE "${sandbox.name}"`);await admin.end();await sql.connect();
 for(const migration of readdirSync("prisma/baseline-migrations").filter(name=>name!=="migration_lock.toml").sort())await sql.query(readFileSync(`prisma/baseline-migrations/${migration}/migration.sql`,"utf8"));
},120000);
beforeEach(()=>{sandbox.objects.clear();sandbox.deleted=[];sandbox.failDelete=false;sandbox.foreignKey=false;sandbox.onDelete=null;});
afterAll(async()=>{await prisma.$disconnect();await sql.end();});

async function fixture() {
 const admin=await prisma.user.create({data:{role:"SUPERADMIN"}}),owner=await prisma.user.create({data:{}}),student=await prisma.user.create({data:{name:"Exclusivo sintético",email:randomUUID()+"@example.test"}});
 const workspace=await prisma.workspace.create({data:{type:"GYM",ownerId:owner.id,name:"Purga sintética",slug:randomUUID(),members:{create:{userId:owner.id,role:"OWNER"}},subscription:{create:{status:"ACTIVE"}}}});
 const personal=await prisma.workspace.create({data:{type:"PERSONAL",ownerId:owner.id,name:"Outra assessoria preservada",slug:randomUUID()}});
 const member=await prisma.workspaceMember.create({data:{workspaceId:workspace.id,userId:student.id,role:"STUDENT",studentProfile:{create:{}}}});
 const version=await prisma.gymPlanVersion.create({data:{name:"Plano",termsText:"Condições sintéticas",priceInCents:BigInt(1000),plan:{create:{workspaceId:workspace.id,name:"Plano"}}}});
 const enrollment=await prisma.gymEnrollment.create({data:{workspaceId:workspace.id,studentMemberId:member.id,planVersionId:version.id,priceInCents:BigInt(1000),status:"ACTIVE",acceptance:{create:{workspaceId:workspace.id,signerUserId:student.id,termsVersion:"1",termsSnapshot:"Condições sintéticas"}}}});
 const invoice=await prisma.gymInvoice.create({data:{workspaceId:workspace.id,studentMemberId:member.id,studentUserId:student.id,enrollmentId:enrollment.id,invoiceNumber:randomUUID(),title:"Fatura",dueDate:new Date(),subtotalInCents:BigInt(1000),totalInCents:BigInt(1000),balanceRemainingInCents:BigInt(1000),payerName:"Aluno",createdByUserId:owner.id,items:{create:{description:"Plano",unitPriceInCents:BigInt(1000),totalInCents:BigInt(1000)}}}});
 const keys=[`workspace/${workspace.id}/files/health.pdf`,`workspace/${workspace.id}/logos/logo.png`];keys.forEach(key=>sandbox.objects.add(key));
 await prisma.gymStorageObject.create({data:{workspaceId:workspace.id,actorUserId:owner.id,objectKey:keys[0],target:"student_file",size:BigInt(100),status:"FINALIZED",createdAt:new Date(Date.now()-3600000),updatedAt:new Date(Date.now()-3600000)}});
 await prisma.studentFile.create({data:{workspaceId:workspace.id,studentId:student.id,name:"Arquivo",category:"outros",type:"file",url:"/api/storage/file?key="+encodeURIComponent(keys[0]),objectKey:keys[0]}});
 const evaluation=await prisma.physicalEvaluation.create({data:{workspaceId:workspace.id,studentId:student.id,type:"Sintético",weight:70,height:170,anamnese:{fixture:true}}});
 const token=await prisma.verificationToken.create({data:{workspaceId:workspace.id,token:randomUUID(),identifier:"synthetic-only",expires:new Date(Date.now()+86400000)}});
 const legacy=await prisma.deliveryOutbox.create({data:{requestKey:randomUUID(),fingerprint:randomUUID(),channel:"EMAIL",payloadEncrypted:encryptSubAccountApiKey(JSON.stringify({guard:{workspaceId:workspace.id},to:student.email})).encrypted}});
 await closeGymWorkspace({workspaceId:workspace.id,requestKey:randomUUID(),confirmationSlug:workspace.slug,reason:"Encerramento sintético para conferir política"},owner.id);
 const input={requestKey:randomUUID(),confirmationSlug:workspace.slug};
 return {admin,owner,student,workspace,personal,member,enrollment,invoice,evaluation,token,legacy,input,keys};
}
async function queue(f:Awaited<ReturnType<typeof fixture>>){await requestGymPurge(f.workspace.id,f.input,f.admin.id);}

it("prazo de um mês usa calendário UTC, fim de mês e ano bissexto",()=>{
 expect(gymPurgeDeadline(new Date("2026-01-31T12:30:45Z")).toISOString()).toBe("2026-02-28T12:30:45.000Z");
 expect(gymPurgeDeadline(new Date("2024-01-31T12:30:45Z")).toISOString()).toBe("2024-02-29T12:30:45.000Z");
 expect(gymPurgeDeadline(new Date("2026-12-15T12:30:45Z")).toISOString()).toBe("2027-01-15T12:30:45.000Z");
});
it("encerra com agenda automática, prazo imutável e bloqueio de escritores diretos",async()=>{
 const f=await fixture(),w=await prisma.workspace.findUniqueOrThrow({where:{id:f.workspace.id}}),job=await prisma.gymPurgeJob.findUniqueOrThrow({where:{workspaceId:w.id}});
 expect(w.purgeAfter).toEqual(gymPurgeDeadline(w.closedAt!));expect(job.nextAttemptAt.getTime()).toBe(w.purgeAfter!.getTime()-86400000);
 await expect(prisma.gymPlan.create({data:{workspaceId:w.id,name:"Tentativa tardia"}})).rejects.toThrow(/read-only pending purge/);
 await expect(prisma.workspace.update({where:{id:w.id},data:{purgeAfter:new Date(w.purgeAfter!.getTime()+1)}})).rejects.toThrow(/immutable/);
 await expect(prisma.workspace.update({where:{id:w.id},data:{isActive:true}})).rejects.toThrow(/immutable/);
 await expect(prisma.workspace.delete({where:{id:w.id}})).rejects.toThrow(/coordinated authenticated purge/);
});
it("superadmin próprio, encerramento e confirmação exata são pré-requisitos",async()=>{
 const f=await fixture();await expect(requestGymPurge(f.workspace.id,f.input,f.owner.id)).rejects.toMatchObject({statusCode:403});
 await expect(requestGymPurge(f.workspace.id,{...f.input,confirmationSlug:"errado"},f.admin.id)).rejects.toMatchObject({statusCode:409});
 await expect(requestGymPurge(f.personal.id,{...f.input,confirmationSlug:f.personal.slug},f.admin.id)).rejects.toMatchObject({statusCode:404});
 const active=await prisma.workspace.create({data:{type:"GYM",ownerId:f.owner.id,name:"Ativa",slug:randomUUID(),isActive:false}});
 await expect(requestGymPurge(active.id,{...f.input,confirmationSlug:active.slug},f.admin.id)).rejects.toMatchObject({code:"GYM_CLOSURE_REQUIRED"});
 expect(sandbox.deleted).toHaveLength(0);
});
it("purga dados ligados e sem FK, arquivos, convites, fila e auditoria; conserva PERSONAL e conta compartilhada",async()=>{
 const f=await fixture(),legacyId=randomUUID(),childId=randomUUID(),historic=await prisma.user.create({data:{}});
 const other=await prisma.workspace.create({data:{type:"GYM",ownerId:f.owner.id,name:"Histórico de outra academia",slug:randomUUID()}});
 const document=await prisma.legalDocument.create({data:{type:"TERMS",version:randomUUID(),title:"Fixture de retenção compartilhada",content:"Documento sintético",contentHash:"0".repeat(64)}});
 await serializableTransaction(async tx=>{
  await tx.$queryRaw`SELECT set_config('atlasfit.gym_purge_scope',${f.workspace.id},TRUE)`;
  await tx.notification.create({data:{id:legacyId,userId:f.student.id,workspaceId:f.workspace.id,title:"Recibo minimizado",description:"Fixture",type:"SYSTEM",category:"SYSTEM"}});
  await tx.workspaceMember.create({data:{workspaceId:f.workspace.id,userId:historic.id,role:"STUDENT"}});
  await tx.legalAcceptance.create({data:{workspaceId:other.id,userId:historic.id,documentId:document.id,documentType:"TERMS",documentVersion:document.version,documentHash:document.contentHash}});
 });
 await prisma.deliveryOutbox.createMany({data:[{id:legacyId,requestKey:randomUUID(),fingerprint:randomUUID(),channel:"NOTIFICATION",status:"SKIPPED"},{id:childId,requestKey:`notification-delivery:${legacyId}:email`,fingerprint:randomUUID(),channel:"EMAIL",status:"SENT"}]});
 await queue(f);const result=await processGymPurge(f.workspace.id);expect(result.status).toBe("COMPLETED");
 expect(await prisma.workspace.findUnique({where:{id:f.workspace.id}})).toBeNull();expect(await prisma.gymEnrollment.findUnique({where:{id:f.enrollment.id}})).toBeNull();expect(await prisma.gymInvoice.findUnique({where:{id:f.invoice.id}})).toBeNull();expect(await prisma.physicalEvaluation.findUnique({where:{id:f.evaluation.id}})).toBeNull();
 expect(await prisma.studentFile.count({where:{workspaceId:f.workspace.id}})).toBe(0);expect(await prisma.gymStorageObject.count({where:{workspaceId:f.workspace.id}})).toBe(0);
 expect(await prisma.verificationToken.findUnique({where:{token:f.token.token}})).toBeNull();expect(await prisma.deliveryOutbox.findUnique({where:{id:f.legacy.id}})).toBeNull();
 expect(await prisma.deliveryOutbox.count({where:{id:{in:[legacyId,childId]}}})).toBe(0);
 expect(await prisma.auditLog.count({where:{entityId:f.workspace.id}})).toBe(0);expect(await prisma.user.findUnique({where:{id:f.student.id}})).toBeNull();
 expect(await prisma.user.findUnique({where:{id:f.owner.id}})).not.toBeNull();expect(await prisma.workspace.findUnique({where:{id:f.personal.id}})).not.toBeNull();
 expect(await prisma.user.findUnique({where:{id:historic.id}})).not.toBeNull();expect(await prisma.legalAcceptance.count({where:{userId:historic.id,workspaceId:other.id}})).toBe(1);
 expect(sandbox.deleted).toEqual(f.keys);const replay=await requestGymPurge(f.workspace.id,f.input,f.admin.id);expect(replay.status).toBe("COMPLETED");
 expect(JSON.stringify(replay)).not.toContain(f.workspace.id);expect(JSON.stringify(replay)).not.toContain(f.student.id);
 await expect(requestGymPurge(f.workspace.id,{...f.input,confirmationSlug:"outra"},f.admin.id)).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
});
it("falha parcial no R2 conserva registros e retoma sem declarar purga concluída",async()=>{
 const f=await fixture();await queue(f);sandbox.failDelete=true;
 expect(await processGymPurge(f.workspace.id)).toMatchObject({status:"RETRY"});expect(await prisma.workspace.findUnique({where:{id:f.workspace.id}})).not.toBeNull();
 expect(await prisma.gymPurgeReceipt.findUnique({where:{requestKey:f.input.requestKey}})).toBeNull();sandbox.failDelete=false;
 expect(await processGymPurge(f.workspace.id,new Date(Date.now()+61000))).toMatchObject({status:"COMPLETED"});expect(sandbox.objects.size).toBe(0);
});
it("concorrência usa uma claim; lease vencida é recuperada",async()=>{
 const f=await fixture();await queue(f);await prisma.gymPurgeJob.update({where:{workspaceId:f.workspace.id},data:{status:"PROCESSING",leaseToken:randomUUID(),leaseExpiresAt:new Date(0)}});
 const results=await Promise.all([processGymPurge(f.workspace.id),processGymPurge(f.workspace.id)]);expect(results.filter(row=>row.status==="COMPLETED")).toHaveLength(1);
 expect(await prisma.gymPurgeReceipt.count({where:{requestKey:f.input.requestKey}})).toBe(1);
 const scheduled=await fixture();await prisma.gymPurgeJob.update({where:{workspaceId:scheduled.workspace.id},data:{nextAttemptAt:new Date(0)}});
 sandbox.onDelete=async()=>{await queue(scheduled);};
 expect(await processGymPurge(scheduled.workspace.id)).toMatchObject({status:"COMPLETED"});expect(await requestGymPurge(scheduled.workspace.id,scheduled.input,scheduled.admin.id)).toMatchObject({status:"COMPLETED"});
});
it("prefixo é varrido em lotes incluindo órfãos, sem alcançar arquivos de outro tenant",async()=>{
 const f=await fixture();await queue(f);for(let i=0;i<105;i++)sandbox.objects.add(`workspace/${f.workspace.id}/files/orphan-${i}`);const other=`workspace/${f.personal.id}/files/keep`;sandbox.objects.add(other);
 expect(await processGymPurge(f.workspace.id)).toMatchObject({status:"PENDING"});expect(await prisma.workspace.findUnique({where:{id:f.workspace.id}})).not.toBeNull();
 expect(await processGymPurge(f.workspace.id,new Date(Date.now()+61000))).toMatchObject({status:"COMPLETED"});expect([...sandbox.objects]).toEqual([other]);
});
it("armazenamento devolvendo chave de outro tenant bloqueia antes de excluir",async()=>{
 const f=await fixture();await queue(f);sandbox.foreignKey=true;expect(await processGymPurge(f.workspace.id)).toMatchObject({status:"RETRY",code:"TENANT_MISMATCH"});expect(sandbox.deleted).toHaveLength(0);
});
it("scan de fila histórica é paginado e não pula a última página",async()=>{
 const f=await fixture();await queue(f);await prisma.deliveryOutbox.createMany({data:Array.from({length:101},()=>({requestKey:randomUUID(),fingerprint:randomUUID(),channel:"EMAIL",payloadEncrypted:encryptSubAccountApiKey(JSON.stringify({workspaceId:f.workspace.id})).encrypted}))});
 expect(await processGymPurge(f.workspace.id)).toMatchObject({status:"PENDING"});expect(sandbox.deleted).toHaveLength(0);
 expect(await processGymPurge(f.workspace.id,new Date(Date.now()+61000))).toMatchObject({status:"COMPLETED"});expect(await prisma.deliveryOutbox.count({where:{workspaceId:f.workspace.id}})).toBe(0);
});
it("cron consome agenda vencida automaticamente",async()=>{
 const f=await fixture();await prisma.gymPurgeJob.update({where:{workspaceId:f.workspace.id},data:{nextAttemptAt:new Date(0)}});
 const result=await processGymPurgeBatch(new Date(),1);expect(result.results[0].status).toBe("COMPLETED");
});
it("prazo excedido e falha de armazenamento produzem alerta operacional",async()=>{
 const f=await fixture();await prisma.gymPurgeJob.update({where:{workspaceId:f.workspace.id},data:{nextAttemptAt:new Date(0)}});sandbox.foreignKey=true;
 const result=await processGymPurgeBatch(new Date(Date.now()+35*86400000),1);expect(result.success).toBe(false);expect(result.overdue).toBeGreaterThan(0);expect(result.results[0]).toMatchObject({status:"RETRY"});
});
it("referência histórica de arquivo fora do prefixo impede falsa conclusão",async()=>{
 const f=await fixture();await sql.query("SELECT set_config('atlasfit.gym_purge_scope',$1,FALSE)",[f.workspace.id]);await sql.query('UPDATE "StudentFile" SET "objectKey"=$1 WHERE "workspaceId"=$2',["workspace/foreign/files/keep",f.workspace.id]);await sql.query("RESET atlasfit.gym_purge_scope");
 await queue(f);expect(await processGymPurge(f.workspace.id)).toMatchObject({status:"RETRY",code:"TENANT_MISMATCH"});expect(sandbox.deleted).toHaveLength(0);expect(await prisma.workspace.findUnique({where:{id:f.workspace.id}})).not.toBeNull();
 await sql.query("SELECT set_config('atlasfit.gym_purge_scope',$1,FALSE)",[f.workspace.id]);await sql.query('UPDATE "StudentFile" SET "objectKey"=NULL,url=$1 WHERE "workspaceId"=$2',["https://historical.example.invalid/unknown-file",f.workspace.id]);await sql.query("RESET atlasfit.gym_purge_scope");
 expect(await processGymPurge(f.workspace.id,new Date(Date.now()+61000))).toMatchObject({status:"RETRY",code:"STORAGE_RECONCILIATION_REQUIRED"});expect(sandbox.deleted).toHaveLength(0);
});
it("uploads autorizados ainda válidos adiam a purga até expirarem",async()=>{
 const f=await fixture();
 await sql.query("SELECT set_config('atlasfit.gym_purge_scope',$1,FALSE)",[f.workspace.id]);await sql.query('UPDATE "GymStorageObject" SET "createdAt"=(CURRENT_TIMESTAMP AT TIME ZONE \'UTC\') WHERE "workspaceId"=$1',[f.workspace.id]);await sql.query("RESET atlasfit.gym_purge_scope");
 await queue(f);expect(await processGymPurge(f.workspace.id)).toMatchObject({status:"NOT_CLAIMED"});expect((await previewGymPurge(f.workspace.id,f.admin.id)).job?.lastErrorCode).toBe("UPLOAD_EXPIRY_PENDING");expect(sandbox.deleted).toHaveLength(0);
 const legacy=await fixture();await sql.query("SELECT set_config('atlasfit.gym_purge_scope',$1,FALSE)",[legacy.workspace.id]);await sql.query('UPDATE "GymStorageObject" SET "createdAt"=CURRENT_TIMESTAMP,"updatedAt"=(CURRENT_TIMESTAMP AT TIME ZONE \'UTC\') WHERE "workspaceId"=$1',[legacy.workspace.id]);await sql.query("RESET atlasfit.gym_purge_scope");
 await queue(legacy);expect(await processGymPurge(legacy.workspace.id)).toMatchObject({status:"NOT_CLAIMED"});
});
it("função SQL exige claim viva e confirmação de armazenamento",async()=>{
 const f=await fixture();await queue(f);await expect(sql.query('SELECT * FROM atlasfit_purge_gym_records($1,$2)',[f.workspace.id,randomUUID()])).rejects.toThrow(/claim and verified storage/);
 expect(await prisma.workspace.findUnique({where:{id:f.workspace.id}})).not.toBeNull();
});
