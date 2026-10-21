import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedGymAuthority } from "./gym-test-authority";
const { db } = vi.hoisted(() => ({ db: {
 $transaction:vi.fn(),systemSetting:{findUnique:vi.fn()},gymPlan:{findMany:vi.fn()},gymPlanVersion:{findFirstOrThrow:vi.fn()},
 user:{findMany:vi.fn(),create:vi.fn()},workspaceMember:{count:vi.fn(),findFirst:vi.fn(),create:vi.fn()},
 gymStudentProfile:{findFirst:vi.fn()},gymGuardian:{create:vi.fn()},gymEnrollment:{create:vi.fn()},gymInvoice:{create:vi.fn()},gymInvoiceItem:{create:vi.fn()},
 importJob:{findFirst:vi.fn(),findUnique:vi.fn(),create:vi.fn(),update:vi.fn()},importRecord:{update:vi.fn(),updateMany:vi.fn()},importEntityResult:{create:vi.fn()},auditLog:{create:vi.fn()},
} as any }));
vi.mock("@/lib/prisma",()=>({default:db}));
import { GymImportService } from "../application/gym-import-service";
const workspaceId="ws-gym-123",actorUserId="user-admin-456",unitId="unit-default-1";
const header="Nome,Email,Telefone,CPF,Data_Nascimento,Matricula,Plano,Valor_Mensalidade,Data_Inicio,Data_Termino,Saldo_Devedor,Saldo_Credor,Vencimento_Saldo";
const adult="Mariana Souza,mariana@email.com,11988887777,52998224725,1995-05-12,MAT-001,Plano Mensal Livre,129.00,2026-01-01,2026-12-31,50.00,0,2026-10-20";
const csvContent=header+"\n"+adult;
let jobs:any[]=[];
describe("GYM-072 · Importação assistida com prévia persistida",()=>{
 beforeEach(()=>{
  vi.resetAllMocks(); jobs=[];
  seedGymAuthority(db,workspaceId,actorUserId,{[actorUserId]:"OWNER"});
  db.gymUnit.findMany.mockResolvedValue([{id:unitId}]); db.gymUnit.findFirst.mockResolvedValue({id:unitId,workspaceId,isActive:true});
  db.systemSetting.findUnique.mockResolvedValue(null);db.$transaction.mockImplementation(async(callback:any)=>callback(db));
  const version={id:"version-1",priceInCents:BigInt(12900),enrollmentFeeInCents:BigInt(0),durationDays:30,isActive:true,version:1};
  db.gymPlan.findMany.mockResolvedValue([{id:"plan-mensal-1",name:"Plano Mensal Livre",isActive:true,workspaceId,versions:[version]}]);
  db.gymPlanVersion.findFirstOrThrow.mockResolvedValue(version);
  db.user.findMany.mockResolvedValue([]); db.user.create.mockImplementation(async({data}:any)=>({id:"new-user",...data}));
  db.workspaceMember.count.mockResolvedValue(0);db.workspaceMember.findFirst.mockResolvedValue(null);
  db.workspaceMember.create.mockImplementation(async({data}:any)=>({id:"new-member",...data}));
  db.gymStudentProfile.findFirst.mockResolvedValue(null);
  db.gymEnrollment.create.mockImplementation(async({data}:any)=>({id:"new-enrollment",...data}));
  db.gymInvoice.create.mockImplementation(async({data}:any)=>({id:"new-invoice",...data}));
  db.importJob.findUnique.mockImplementation(async({where}:any)=>jobs.find(j=>j.idempotencyKey===where.idempotencyKey)||null);
  db.importJob.findFirst.mockImplementation(async({where}:any)=>where.id?jobs.find(j=>j.id===where.id&&j.workspaceId===where.workspaceId&&j.createdByUserId===where.createdByUserId)||null:null);
  db.importJob.create.mockImplementation(async({data}:any)=>{
   const job={...data,id:"job-1",sources:[{...data.sources.create,id:"source-1"}],records:[{...data.records.create,id:"record-1"}]};jobs.push(job);return job;
  });
  db.importJob.update.mockImplementation(async({where,data}:any)=>Object.assign(jobs.find(j=>j.id===where.id),data));
  db.importRecord.update.mockImplementation(async({where,data}:any)=>Object.assign(jobs.flatMap(j=>j.records).find(r=>r.id===where.id),data));
 });
 it("gera um modelo BOM com cabeçalhos e nenhuma pessoa fictícia",()=>{
  const csv=GymImportService.generateSampleCsv();expect(csv.startsWith("\uFEFF")).toBe(true);
  for(const column of ["Nome","CPF","Data_Nascimento","Plano","Saldo_Devedor","Responsavel_Nome","Vencimento_Saldo"])expect(csv).toContain(column);
  expect(csv.trim().split(/\r?\n/)).toHaveLength(1);
 });
 it("prévia valida identidade, catálogo e saldo com vencimento explícito",async()=>{
  const preview=await GymImportService.previewImport({workspaceId,actorUserId,csvContent});
  expect(preview).toMatchObject({totalRows:1,validRows:1,invalidRows:0,totalNewStudents:1,totalContracts:1,totalOpeningDebitInCents:5000,previewId:"job-1",unitId});
  expect(preview.rows[0]).toMatchObject({status:"VALID",name:"Mariana Souza",planId:"plan-mensal-1",openingDueDate:"2026-10-20"});
  expect(preview.importBatchHash).toMatch(/^[a-f0-9]{64}$/);expect(jobs[0].sources[0].textContent).toBe(csvContent);
 });
 it("recusa menor sem dados completos do responsável",async()=>{
  const minor=adult.replace("1995-05-12","2012-05-12");
  const preview=await GymImportService.previewImport({workspaceId,actorUserId,csvContent:header+"\n"+minor});
  expect(preview.rows[0]).toMatchObject({isMinor:true,hasGuardianData:false,status:"INVALID"});
  expect(preview.rows[0].messages.some(m=>m.includes("Menor exige"))).toBe(true);expect(preview.totalNewStudents).toBe(0);
 });
 it("reutiliza apenas aluno local com identidade e unidade concordantes",async()=>{
  const user={id:"existing-user",cpfCnpj:"52998224725",email:"mariana@email.com",birthDate:new Date("1995-05-12T00:00:00Z")};
  db.user.findMany.mockResolvedValue([user]);const authority=db.workspaceMember.findUnique.getMockImplementation();
  db.workspaceMember.findUnique.mockImplementation(async(args:any)=>args.where.userId_workspaceId.userId===user.id?{id:"existing-member",userId:user.id,workspaceId,unitId,role:"STUDENT",roleGrants:[],isActive:true,isMinor:false,studentProfile:{registrationNumber:"MAT-001"},gymEnrollments:[]}:authority(args));
  const preview=await GymImportService.previewImport({workspaceId,actorUserId,csvContent});
  expect(preview).toMatchObject({totalExistingStudents:1,totalNewStudents:0,invalidRows:0});expect(preview.rows[0].action).toBe("LINK_EXISTING_STUDENT");
 });
 it("efetiva a prévia do servidor com contrato pendente e saldo interno",async()=>{
  const preview=await GymImportService.previewImport({workspaceId,actorUserId,csvContent});
  const result=await GymImportService.commitImport({workspaceId,actorUserId,previewId:preview.previewId!,importBatchHash:preview.importBatchHash,acceptLegacyBalances:true});
  expect(result).toMatchObject({success:true,alreadyCommitted:false,createdStudentsCount:1,createdEnrollmentsCount:1,createdInvoicesCount:1,totalOpeningDebitInCents:5000});
  expect(db.gymEnrollment.create.mock.calls[0][0].data).toMatchObject({status:"PENDING_ACCEPTANCE",accessGranted:false,recurrenceMode:"LOCAL",subscriptionStatus:"INACTIVE"});
  expect(db.gymInvoice.create.mock.calls[0][0].data).toMatchObject({totalInCents:BigInt(5000),balanceRemainingInCents:BigInt(5000),dueDate:new Date("2026-10-20T00:00:00Z")});
  expect(jobs[0].status).toBe("COMPLETED");
 });
 it("revalida autoridade no replay e não duplica aluno, matrícula ou fatura",async()=>{
  const preview=await GymImportService.previewImport({workspaceId,actorUserId,csvContent});
  const input={workspaceId,actorUserId,previewId:preview.previewId!,importBatchHash:preview.importBatchHash,acceptLegacyBalances:true};
  const first=await GymImportService.commitImport(input), second=await GymImportService.commitImport(input);
  expect(second).toEqual({...first,alreadyCommitted:true});
  for(const model of [db.user,db.workspaceMember,db.gymEnrollment,db.gymInvoice])expect(model.create).toHaveBeenCalledTimes(1);
  expect(db.$transaction).toHaveBeenCalledTimes(3);
 });
 it("recusa linhas enviadas pelo cliente e não grava uma importação forjada",async()=>{
  await expect(GymImportService.commitImport({workspaceId,actorUserId,previewId:"forged",importBatchHash:"a".repeat(64),rows:[{name:"forged"}]} as any)).rejects.toMatchObject({code:"INVALID_IMPORT"});
  expect(db.$transaction).not.toHaveBeenCalled();expect(db.user.create).not.toHaveBeenCalled();
 });
});
