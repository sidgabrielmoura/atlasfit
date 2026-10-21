const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const here=__dirname,issues=[];
const docs=fs.readdirSync(here).filter(f=>f.endsWith('.md'));
let links=0;
for(const file of docs){
 const body=fs.readFileSync(path.join(here,file),'utf8');
 for(const m of body.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)){
  const target=m[1]||m[2];if(/^(https?:|#)/.test(target))continue;
  links++;
  const [local,anchor]=target.split('#'),p=path.resolve(here,decodeURIComponent(local));
  if(!fs.existsSync(p))issues.push({file,target,error:'Arquivo do link ausente'});
  else if(anchor&&/^L\d+$/.test(anchor)){
   const n=Number(anchor.slice(1)),total=fs.readFileSync(p,'utf8').split(/\r?\n/).length;
   if(n<1||n>total)issues.push({file,target,error:'Linha fora do arquivo'});
  }
 }
 if(/referência pendente|trecho a conferir/.test(body))issues.push({file,error:'Referência não resolvida'});
}
const main=fs.readFileSync(path.join(here,'diagnostico-modulo-academias.md'),'utf8');
const sections=[...main.matchAll(/^## (\d+)\./gm)].map(m=>Number(m[1]));
if(sections.join(',')!==Array.from({length:18},(_,i)=>i+1).join(','))issues.push({error:'Seções obrigatórias não sequenciais',sections});
const findings=JSON.parse(fs.readFileSync(path.join(here,'achados.json'),'utf8'));
if(new Set(findings.map(f=>f.id)).size!==findings.length)issues.push({error:'IDs duplicados'});
for(const f of findings)for(const field of ['title','category','severity','confirmation','flow','evidence','expected','conditions','impact','cause','correction','dependencies','validation','effort'])if(!f[field])issues.push({id:f.id,field,error:'Campo obrigatório vazio'});
const ops=JSON.parse(fs.readFileSync(path.join(here,'operacoes.json'),'utf8'));
const meta=JSON.parse(fs.readFileSync(path.join(here,'snapshot.json'),'utf8'));
const inventory=JSON.parse(fs.readFileSync(path.join(here,'inventario-tecnico.json'),'utf8'));
let hashesChecked=0;
for(const file of inventory){
 if(!file.file.startsWith('src/'))continue;
 hashesChecked++;
 const hash=crypto.createHash('sha256').update(fs.readFileSync(file.file)).digest('hex');
 if(hash!==file.sha256)issues.push({file:file.file,error:'Conteúdo divergiu do hash do inventário inicial'});
}
const before=meta.status.split(/\r?\n/).filter(s=>s.startsWith(' M')).sort();
const now=cp.execFileSync('git',['status','--short'],{encoding:'utf8'}).split(/\r?\n/).filter(s=>s.startsWith(' M')).sort();
if(JSON.stringify(before)!==JSON.stringify(now))issues.push({error:'Lista de arquivos tracked modificados mudou em relação ao snapshot; revisar',before,now});
const result={sections:sections.length,findings:findings.length,gymOperations:ops.filter(x=>x.file.startsWith('src/app/api/gym/')).length,allOperations:ops.length,localLinksChecked:links,sourceHashesChecked:hashesChecked,implementationTrackedStatusUnchanged:JSON.stringify(before)===JSON.stringify(now),issues};
fs.writeFileSync(path.join(here,'verificacao-documentacao.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,issuesCount:issues.length,issues:issues.slice(0,10)},null,2));
if(issues.length)process.exitCode=1;
