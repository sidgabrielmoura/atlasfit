import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { issueManualInvoice } from "@/modules/workspaces/application/manual-invoice-service";
import { resolveGymPayer } from "@/modules/workspaces/application/payer-service";
const db=new URL(process.env.DATABASE_URL || "http://invalid");
const freshSchema=process.env.GYM_FINAL_SCHEMA_TEST==="1" && /^\/atlasfit_completion_tests_[a-f0-9]{32}$/.test(db.pathname);
if(db.hostname!=="127.0.0.1" || db.port!=="56432" || (db.pathname!=="/atlasfit_gym_stabilization_20261001" && !freshSchema)) throw Error("Banco descartável obrigatório.");
afterAll(()=>prisma.$disconnect());
async function fixture() {
 const owner=await prisma.user.create({data:{}}), student=await prisma.user.create({data:{name:"Aluno",cpfCnpj:"52998224725"}});
 const workspace=await prisma.workspace.create({data:{ownerId:owner.id,type:"GYM",name:"Pagador sintético",slug:randomUUID(),subscription:{create:{status:"ACTIVE",maxStaff:30,maxUnits:5}}}});
 await prisma.workspaceMember.create({data:{workspaceId:workspace.id,userId:owner.id,role:"OWNER"}});
 const member=await prisma.workspaceMember.create({data:{workspaceId:workspace.id,userId:student.id,role:"STUDENT"}});
 const plan=await prisma.gymPlan.create({data:{workspaceId:workspace.id,name:"Plano"}});
 const version=await prisma.gymPlanVersion.create({data:{planId:plan.id,name:"Plano",priceInCents:BigInt(1000),durationDays:30,termsText:"Condições"}});
 const enrollment=await prisma.gymEnrollment.create({data:{workspaceId:workspace.id,studentMemberId:member.id,planVersionId:version.id,priceInCents:BigInt(1000)}});
 const input={workspaceId:workspace.id,actorUserId:owner.id,studentMemberId:member.id,idempotencyKey:randomUUID(),title:"Obrigação",dueDate:"2026-10-12",items:[{itemType:"SERVICE" as const,description:"Mensalidade",unitPriceInCents:1000}]};
 return {owner,student,workspace,member,enrollment,input};
}
describe("Pagador — identidade derivada da obrigação",()=>{
 it("nega usuário/matrícula/responsável estrangeiros e chaves globais injetadas sem persistir fatura",async()=>{
  const a=await fixture(),b=await fixture();
  const guardian=await prisma.gymGuardian.create({data:{workspaceId:b.workspace.id,studentMemberId:b.member.id,name:"Responsável",cpf:"11144477735",phone:"11999999999",relationship:"PAI",verifiedAt:new Date(),isFinancialResponsible:true}});
  for(const input of [{...a.input,studentUserId:b.student.id},{...a.input,enrollmentId:b.enrollment.id},{...a.input,guardianId:guardian.id},{...a.input,billingUserId:b.student.id}]) await expect(issueManualInvoice(input)).rejects.toHaveProperty("statusCode");
  expect(await prisma.gymInvoice.count({where:{workspaceId:a.workspace.id}})).toBe(0);
  await prisma.gymEnrollment.update({where:{id:a.enrollment.id},data:{billingPayerUserId:b.student.id}});
  await expect(issueManualInvoice({...a.input,enrollmentId:a.enrollment.id})).rejects.toMatchObject({code:"PAYER_REVIEW_REQUIRED"});
 });
 it("menor exige responsável financeiro atual; revogação e documento global divergente bloqueiam nova emissão",async()=>{
  const f=await fixture();await prisma.workspaceMember.update({where:{id:f.member.id},data:{isMinor:true}});
  await expect(issueManualInvoice(f.input)).rejects.toMatchObject({code:"GUARDIAN_NOT_AUTHORIZED"});
  const user=await prisma.user.create({data:{cpfCnpj:"11144477735"}});
  const guardian=await prisma.gymGuardian.create({data:{workspaceId:f.workspace.id,studentMemberId:f.member.id,guardianUserId:user.id,name:"Responsável",cpf:"11144477735",phone:"11999999999",relationship:"PAI",verifiedAt:new Date(),isFinancialResponsible:true}});
  const invoice=await issueManualInvoice(f.input);expect(invoice).toMatchObject({studentUserId:f.student.id,payerType:"GUARDIAN",payerName:"Responsável",payerCpfCnpj:"11144477735"});
  await prisma.user.update({where:{id:user.id},data:{cpfCnpj:"52998224725"}});
  await expect(issueManualInvoice({...f.input,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"PAYER_REVIEW_REQUIRED"});
  await prisma.gymGuardian.update({where:{id:guardian.id},data:{revokedAt:new Date()}});
  await expect(issueManualInvoice({...f.input,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"GUARDIAN_NOT_AUTHORIZED"});
  expect(await prisma.gymInvoice.count({where:{workspaceId:f.workspace.id}})).toBe(1);
 });
 it("terceiro livre e snapshot legado não demonstram vínculo; cadastro verificado usa dados do servidor",async()=>{
  const f=await fixture(), custom={name:"Responsável",cpfCnpj:"11144477735",email:"responsavel@example.invalid"};
  await expect(issueManualInvoice({...f.input,customPayer:custom})).rejects.toMatchObject({code:"GUARDIAN_NOT_AUTHORIZED"});
  await prisma.gymGuardian.create({data:{workspaceId:f.workspace.id,studentMemberId:f.member.id,name:custom.name,cpf:custom.cpfCnpj,email:custom.email,phone:"11999999999",relationship:"OUTRO",verifiedAt:new Date(),isFinancialResponsible:true}});
  const invoice=await issueManualInvoice({...f.input,customPayer:custom});expect(invoice).toMatchObject({payerType:"GUARDIAN",payerEmail:custom.email});
  await expect(issueManualInvoice({...f.input,idempotencyKey:randomUUID(),customPayer:{...custom,email:"alheio@example.invalid"}})).rejects.toMatchObject({code:"GUARDIAN_NOT_AUTHORIZED"});
  await prisma.gymEnrollment.update({where:{id:f.enrollment.id},data:{billingPayerName:"Snapshot legado"}});
  await expect(resolveGymPayer(f.workspace.id,{studentUserId:f.student.id,studentMemberId:f.member.id,enrollmentId:f.enrollment.id})).rejects.toMatchObject({code:"PAYER_REVIEW_REQUIRED"});
 });
 it("adulto legítimo/retry mantém identidade e obrigação única; múltiplos responsáveis exigem seleção explícita",async()=>{
  const f=await fixture();const [a,b]=await Promise.all([issueManualInvoice(f.input),issueManualInvoice(f.input)]);expect(a.id).toBe(b.id);expect(a).toMatchObject({studentUserId:f.student.id,payerType:"STUDENT",payerCpfCnpj:"52998224725"});
  await prisma.workspaceMember.update({where:{id:f.member.id},data:{isMinor:true}});
  for(const cpf of ["11144477735","52998224725"]) await prisma.gymGuardian.create({data:{workspaceId:f.workspace.id,studentMemberId:f.member.id,name:"Responsável",cpf,phone:"11999999999",relationship:"OUTRO",verifiedAt:new Date(),isFinancialResponsible:true}});
  await expect(issueManualInvoice({...f.input,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"PAYER_REVIEW_REQUIRED"});
 });
});
