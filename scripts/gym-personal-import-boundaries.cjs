const fs = require('node:fs'); const path = require('node:path'); const ts = require('typescript');
const folder = 'src/app/api/personal/migration';
const files = [];
function collect(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) collect(p); else if(e.name==='route.ts') files.push(p); } } collect(folder);
let total=0;
for(const file of files) {
 let source=fs.readFileSync(file,'utf8');
 if(source.includes('assertPersonalImportJobAccess(')||source.includes('await requirePersonalWorkspaceAccess({ workspaceId, capability: "students.manage" })')) continue;
 const root = file===path.join(folder,'route.ts');
 const record = file.endsWith(path.join('[recordId]','route.ts'));
 if(record) source=source.replaceAll('const { recordId } = await params;', 'const { id: jobId, recordId } = await params;');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true); const changes=[];
 for(const n of ast.statements) {
  if(!ts.isFunctionDeclaration(n)||!n.body) continue;
  const tr=n.body.statements.find(ts.isTryStatement); if(!tr) continue;
  let authorization;
  if(root && n.name.text==='POST') {
   const quota=tr.tryBlock.statements.find(s=>s.getText(ast).startsWith('const member ='));
   if(!quota) throw Error('Bloco de permissão original não localizado.');
   changes.push({at:quota.getStart(ast),text:'await requirePersonalWorkspaceAccess({ workspaceId, capability: "students.manage" });\n\n    '});
  } else {
   authorization=root?'await requirePersonalWorkspaceAccess({ workspaceId, capability: "students.manage" });':record?'await assertPersonalImportJobAccess(jobId, recordId);':n.body.getText(ast).includes('const { id: jobId }')?'await assertPersonalImportJobAccess(jobId);':'await assertPersonalImportJobAccess(id);';
   changes.push({at:tr.tryBlock.getStart(ast)+1,text:'\n    '+authorization+'\n'});
  }
  if(!tr.catchClause) throw Error('Sem catch esperado.');
  changes.push({at:tr.catchClause.block.getStart(ast)+1,text:'\n    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;\n'});
  if(!tr.catchClause.variableDeclaration) changes.push({at:tr.catchClause.getStart(ast)+5,text:' (error)'});
  total++;
 }
 for(const c of changes.sort((a,b)=>b.at-a.at)) source=source.slice(0,c.at)+c.text+source.slice(c.at);
 source='import { assertPersonalImportJobAccess } from "@/lib/migration/access";\nimport { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\n'+source;
 fs.writeFileSync(file,source);
}
console.log(`${total} operações de migração PERSONAL protegidas por tipo, vínculo e capacidade.`);
