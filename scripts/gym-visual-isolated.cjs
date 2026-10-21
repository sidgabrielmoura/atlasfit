// Synthetic session bootstrap for visual inspection, never copied into src or deployed.
const { PrismaClient }=require('@prisma/client'); const { PrismaPg }=require('@prisma/adapter-pg');
const { randomUUID }=require('node:crypto'); const bcrypt=require('bcryptjs'); const http=require('node:http');
const appOrigin='http://127.0.0.1:31173'; const visualOrigin='http://127.0.0.1:31174';
const database='postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001';
const db=new PrismaClient({adapter:new PrismaPg({connectionString:database})});
(async()=>{
 const email=`visual-${randomUUID()}@example.invalid`; const password='senha-visual-sintetica';
 const user=await db.user.create({data:{email,name:'Operador de teste',role:'TRAINER',password:await bcrypt.hash(password,10),twoFactorEnabled:false,birthDate:new Date('1990-01-15T00:00:00Z')}});
 const workspace=await db.workspace.create({data:{name:'Academia de teste',type:'GYM',slug:`visual-${randomUUID()}`,ownerId:user.id,primaryColor:'#2563EB',members:{create:{userId:user.id,role:'OWNER'}},units:{create:{name:'Unidade Centro'}},settings:{create:{}},subscription:{create:{status:'ACTIVE',maxStudents:100,maxStaff:10,maxUnits:3}}}});
 const unit=await db.gymUnit.findFirstOrThrow({where:{workspaceId:workspace.id}});
 const plan=await db.gymPlan.create({data:{workspaceId:workspace.id,name:'Mensal',versions:{create:{name:'Mensal',priceInCents:BigInt(10000),termsText:'Condições sintéticas para inspeção visual; não é contrato real.'}}}});
 const student=await db.user.create({data:{name:'Aluno de teste',email:`visual-student-${randomUUID()}@example.invalid`,birthDate:new Date('1990-01-15T00:00:00Z')}});
 await db.workspaceMember.create({data:{workspaceId:workspace.id,userId:student.id,role:'STUDENT',unitId:unit.id,isActive:true,studentProfile:{create:{registrationNumber:`VISUAL-${randomUUID()}`}}}});
 await db.gymFinancialAccount.create({data:{workspaceId:workspace.id,name:'Conta interna de teste',accountType:'BANK_ACCOUNT',balanceInCents:BigInt(100000)}});
 const nonce=randomUUID();
 const server=http.createServer(async(req,res)=>{
  try {
   if(req.url!==`/${nonce}`){res.writeHead(404);res.end();return;}
   const cookies=new Map(); const absorb=response=>{for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0];const index=pair.indexOf('=');cookies.set(pair.slice(0,index),pair.slice(index+1));}};
   const csrfResponse=await fetch(`${appOrigin}/api/auth/csrf`); absorb(csrfResponse); const csrf=await csrfResponse.json();
   if(typeof csrf.csrfToken!=='string')throw Error('CSRF sintético não disponível.');
   const login=await fetch(`${appOrigin}/api/auth/callback/credentials`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-auth-return-redirect':'1',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:new URLSearchParams({email,password,csrfToken:csrf.csrfToken,callbackUrl:`${appOrigin}/gym/dashboard`}),redirect:'manual'});
   absorb(login); await login.arrayBuffer();
   if(![...cookies.keys()].some(k=>k.includes('session-token')))throw Error('Sessão sintética recusada.');
   const values=[...cookies].map(([k,v])=>`${k}=${v}; Path=/; HttpOnly; SameSite=Lax`);
   values.push(`atlasfit_active_workspace_id=${workspace.id}; Path=/; SameSite=Lax`);
   res.writeHead(302,{'Set-Cookie':values,Location:`${appOrigin}/gym/finance`,'Cache-Control':'no-store'});res.end();
  }catch(error){console.error('Bootstrap visual: '+error.message);res.writeHead(500);res.end('Falha ao preparar sessão sintética.');}
 });
 server.listen(31174,'127.0.0.1',()=>{console.log(`Inspeção somente local: ${visualOrigin}/${nonce}`);console.log('Conta, academia, unidade, aluno e plano são sintéticos; nenhum serviço externo foi acionado.');});
 process.on('SIGINT',()=>server.close(()=>db.$disconnect().finally(()=>process.exit())));
})().catch(error=>{console.error(error.message);db.$disconnect().finally(()=>{process.exitCode=1;});});
