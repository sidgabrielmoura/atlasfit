const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('../.tmp/gym-visual-runner/node_modules/playwright'),{Client}=require('pg');
const access=JSON.parse(fs.readFileSync('.tmp/gym-stabilization/review-access.json','utf8'));
const dbUrl='postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_review_20261009';
if(access.origin!=='http://127.0.0.1:31174')throw Error('Exige servidor isolado de revisão.');
const db=new Client({connectionString:dbUrl});let browser;
const report={startedAt:new Date().toISOString(),synthetic:true,configuredDatabaseChanged:false,checks:[]};
const check=(name,value)=>{assert.equal(value,true,name);report.checks.push({name,passed:true});};
(async()=>{
 await db.connect();browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 async function session(email){const context=await browser.newContext();const csrf=await(await context.request.get(access.origin+'/api/auth/csrf')).json();await context.request.post(access.origin+'/api/auth/callback/credentials',{form:{email,password:access.password,csrfToken:csrf.csrfToken},headers:{'X-Auth-Return-Redirect':'1'}});const current=await(await context.request.get(access.origin+'/api/auth/session')).json();assert.ok(current.user?.id);return {context,userId:current.user.id};}
 const owner=await session(access.email),admin=await session('a11y-admin@atlasfit.local'),anonymous=await browser.newContext();
 for(const job of ['process-recurrence','gym-recurrence','deliveries','engage-push']) {
  const result=await anonymous.request.get(access.origin+'/api/cron/'+job+'?key=atlasfit_cron_secret_engage',{headers:{Authorization:'Bearer 0905748599229Si'}});
  check('cron '+job+' unauthorized',result.status()===401);
 }
 check('health anonymous denied',(await anonymous.request.get(access.origin+'/api/superadmin/operations/deliveries')).status()===401);
 check('health owner denied',(await owner.context.request.get(access.origin+'/api/superadmin/operations/deliveries')).status()===403);
 const health=await admin.context.request.get(access.origin+'/api/superadmin/operations/deliveries');check('health administrator',health.status()===200);
 const body=await health.json();check('scheduler never claimed operational',body.jobs.every(row=>row.status==='NEVER_OBSERVED')&&body.healthy===false);check('health no provider content',!JSON.stringify(body).match(/payloadEncrypted|firebaseToken|providerReceiptId/));
 const id=randomUUID(),child=randomUUID();
 await db.query('INSERT INTO "DeliveryOutbox" (id,"requestKey",fingerprint,channel,status,"completedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())',[id,'notification:'+owner.userId+':synthetic-http-'+randomUUID(),'synthetic-receipt','NOTIFICATION','SKIPPED']);
 await db.query('INSERT INTO "DeliveryOutbox" (id,"requestKey",fingerprint,channel,status,"completedAt","providerReceiptId","updatedAt") VALUES ($1,$2,$3,$4,$5,now(),$6,now())',[child,'notification-delivery:'+id+':email','synthetic-child','EMAIL','SENT','synthetic-sensitive-provider-receipt']);
 const statusUrl=access.origin+'/api/personal/notifications/deliveries/'+id;
 check('receipt anonymous denied',(await anonymous.request.get(statusUrl)).status()===401);
 check('receipt other user hidden',(await admin.context.request.get(statusUrl)).status()===404);
 const receipt=await owner.context.request.get(statusUrl);check('receipt own counts',receipt.status()===200&&JSON.stringify(await receipt.json())===JSON.stringify({dispatchId:id,channels:[{channel:'EMAIL',status:'SENT',count:1}]}));
 const students=await db.query('SELECT id FROM "WorkspaceMember" WHERE "workspaceId"=$1 AND role=\'STUDENT\' AND "userId"<>$2 LIMIT 1',[access.gymId,owner.userId]);assert.ok(students.rows.length);
 await owner.context.addCookies([{name:'atlasfit_active_workspace_id',value:access.gymId,url:access.origin}]);
 const before=Number((await db.query('SELECT count(*) FROM "GymInvoice" WHERE "workspaceId"=$1',[access.gymId])).rows[0].count);
 const invoice=await owner.context.request.post(access.origin+'/api/gym/finance/invoices',{data:{workspaceId:access.gymId,studentMemberId:students.rows[0].id,studentUserId:owner.userId,idempotencyKey:randomUUID(),title:'Identidade HTTP sintética',dueDate:'2026-10-12',items:[{itemType:'SERVICE',description:'Teste',unitPriceInCents:1000}]}});
 check('invoice conflicting identity rejected',invoice.status()===404);
 check('invoice rejection has no write',Number((await db.query('SELECT count(*) FROM "GymInvoice" WHERE "workspaceId"=$1',[access.gymId])).rows[0].count)===before);
 report.success=true;
})().catch(error=>{report.success=false;report.failure=error.message;process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();await db.end();report.finishedAt=new Date().toISOString();fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-notificacoes-http.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));});
