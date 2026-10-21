// Executa funções reais com dependências sintéticas. Sem banco, rede ou ambiente de produção.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
const prisma = { workspace: {findUnique: async () => ({id:'ws-a',name:'Academia sintética',slug:'a',ownerId:'outro',isActive:false,type:'GYM'})}, workspaceMember:{findFirst:async()=>({id:'m-a',role:'MANAGER',isActive:true,roleGrants:[{role:'MANAGER',unitId:'unidade-a'}]})} };
function load(file) {
  file = path.resolve(file);
  if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const req = name => {
    if(name==='@/lib/prisma')return {__esModule:true,default:prisma};
    if(name==='@/auth')return {auth:async()=>({user:{id:'ator-sintetico',role:'USER',email:null}})};
    if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,options})}};
    if(name==='@prisma/client')return {GymEnrollmentStatus:Object.fromEntries(['DRAFT','PENDING_ACCEPTANCE','PENDING_ACTIVATION','ACTIVE','PAUSED','CANCELLED','EXPIRED'].map(k=>[k,k]))};
    if(name==='./plan-service')return {GymPlanService:{serializePlanVersion:v=>v}};
    if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
    throw Error('Dependência não autorizada na prova: '+name);
  };
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext('(function(require,module,exports){'+js+'\n})',{console,Date,Set,Map})(req,mod,mod.exports);
  return mod.exports;
}
(async()=>{
  const results=[];
  try{JSON.stringify({maxReceptionistDiscountInCents:2000n});results.push({prova:'JSON BigInt',observado:'serializado'});}catch(e){results.push({prova:'JSON BigInt',observado:e.name+': '+e.message});}
  const guard=load('src/modules/workspaces/application/guard.ts');
  const suspended=await guard.requireWorkspaceAccess({workspaceId:'ws-a',capability:'workspace.manage'});
  results.push({prova:'Workspace isActive=false',observado:'Autorizado',papel:suspended.memberRole});
  const wrongUnit=await guard.requireWorkspaceAccess({workspaceId:'ws-a',unitId:'unidade-b',capability:'workspace.manage'});
  results.push({prova:'Grant MANAGER só na unidade-a; requisição unidade-b',observado:'Autorizado por fallback legado',papel:wrongUnit.memberRole});
  const {GymEnrollmentService}=load('src/modules/workspaces/application/enrollment-service.ts');
  const dto=GymEnrollmentService.serializeEnrollment({priceInCents:100n,enrollmentFeeInCents:0n,studentMember:{user:{password:'VALOR_SINTETICO',setupToken:'VALOR_SINTETICO',twoFactorSecret:'VALOR_SINTETICO'}},creditCardToken:'VALOR_SINTETICO'});
  results.push({prova:'DTO de matrícula real com usuário sintético',camposSensíveisMantidos:Object.keys(dto.studentMember.user),tokenCartaoMantido:Object.hasOwn(dto,'creditCardToken'),serializavel:!!JSON.stringify(dto)});
  const {ControlIdDeviceAdapter}=load('src/modules/workspaces/application/control-id-adapter.ts');
  const adapter=new ControlIdDeviceAdapter();
  const syncId=adapter.mapExternalPersonId('membro-sintetico','1234');
  const credentialId=adapter.mapExternalPersonId('membro-sintetico');
  results.push({prova:'Mapeamento real com matrícula numérica vs comando de credencial sem matrícula',mesmaPessoa:syncId===credentialId,idsDistintos:syncId!==credentialId});
  fs.writeFileSync(path.join(__dirname,'verificacao-provas-isoladas.json'),JSON.stringify({limites:'Não são testes HTTP, banco ou integração. Dados e dependências são sintéticos. Funções de produção transpilaram sem alterações.',results},null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
