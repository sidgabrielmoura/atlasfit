const fs=require('node:fs'),{randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process'),{Client}=require('pg');
const name='atlasfit_completion_tests_'+randomUUID().replaceAll('-','');
const url='postgresql://atlasfit_test@127.0.0.1:56432/'+name;
const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','COMSPEC','PATHEXT','USERPROFILE','LOCALAPPDATA','APPDATA'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
Object.assign(env,{DATABASE_URL:url,AUTH_SECRET:'isolated-gym-test-secret-not-for-production',GYM_FINAL_SCHEMA_TEST:'1',RESEND_API_KEY:'',ABLY_API_KEY:'',ASAAS_API_KEY:'',NEXT_TELEMETRY_DISABLED:'1'});
const admin=new Client({connectionString:'postgresql://atlasfit_test@127.0.0.1:56432/postgres'});
const report={startedAt:new Date().toISOString(),synthetic:true,configuredDatabaseChanged:false,disposableDatabase:name,checks:[]};
(async()=>{
 await admin.connect();await admin.query(`CREATE DATABASE "${name}" OWNER atlasfit_test`);await admin.end();
 const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--config','prisma.baseline.config.ts'],{env,encoding:'utf8',windowsHide:true});report.checks.push({name:'full baseline deploy',exitCode:migration.status,output:migration.stdout+migration.stderr});if(migration.status!==0)throw Error('Migration failed');
 const rawFile='.tmp/gym-stabilization/completion-fresh-'+randomUUID()+'.json';
 const tests=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.gym.config.ts','tests/gym/payer-identity.integration.ts','tests/gym/notification-delivery.integration.ts','--reporter=json','--outputFile='+rawFile],{env,encoding:'utf8',windowsHide:true});
 const result=JSON.parse(fs.readFileSync(rawFile,'utf8'));report.checks.push({name:'fresh schema business journeys',exitCode:tests.status,passed:result.numPassedTests,failed:result.numFailedTests,skipped:result.numPendingTests,rawFile});if(tests.status!==0||!result.success)throw Error('Business verification failed');report.success=true;
})().catch(error=>{report.success=false;report.failure=error.message;process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-conclusao-schema.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({success:report.success,checks:report.checks.map(({output,...rest})=>rest),failure:report.failure}));});
