const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), records = [];
function target(relative) { const result = path.resolve(root, relative); if (!result.startsWith(root + path.sep)) throw new Error('Outside workspace'); return result; }
function backup(relative) { const file=target(relative), content=fs.readFileSync(file); const destination=target('.tmp/gym-retired-sources/'+relative); if(!fs.existsSync(destination)){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,content);} records.push({path:relative,sha256:crypto.createHash('sha256').update(content).digest('hex')});return content.toString('utf8').replace(/\r\n/g,'\n'); }
const removed = [
 'src/app/(gym)/gym/analytics/analytics-client.tsx',
 ...['gym-050','gym-051','gym-052','gym-060','gym-061','gym-062','gym-063','gym-070','gym-081','gym-082','gym-turnstiles-killswitch'].map(name=>`src/modules/workspaces/__tests__/${name}.test.ts`),
 // Obsolete offboarding mock mixes removed integrations. PostgreSQL coverage is retained.
 'src/modules/workspaces/__tests__/gym-080.test.ts',
 ...['gym-access-decision-only','gym-apply-booking-isolated','gym-apply-device-isolated','gym-booking-delegates','gym-contingency-contract-tests','gym-credential-command-delegates','gym-crm-conversion-delegate','gym-device-command-delegates','gym-device-recovery-delegates','gym-offline-cache-transaction','gym-offline-events-transaction','gym-online-passage-transaction','gym-reception-credential-labels'].map(name=>`scripts/${name}.cjs`),
];
for(const relative of removed) { if(!fs.existsSync(target(relative)))throw new Error('Missing source '+relative);backup(relative);fs.unlinkSync(target(relative)); }
function edit(relative, fn) {fs.writeFileSync(target(relative),fn(backup(relative)));}
function nodes(text,test){const source=ts.createSourceFile('source.ts',text,ts.ScriptTarget.Latest,true),spans=[];function visit(n){if(test(n)){spans.push([n.getFullStart(),n.end]);return;}ts.forEachChild(n,visit);}visit(source);for(const[a,b]of spans.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+text.slice(b);return text;}
function removeTest(text, title){return nodes(text,n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&['it','test'].includes(n.expression.expression.getText())&&title(n.expression.arguments[0]?.getText()||''));}
edit('tests/gym/operation-authority.integration.ts',text=>{
 text=removeTest(text,title=>/última vaga e fila|reserva própria|responsável legítimo age|sem substituto cancela reserva/.test(title));
 text=nodes(text,n=>(ts.isImportDeclaration(n)&&/booking-mutations|gym-booking-service/.test(n.moduleSpecifier.getText()))||(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['modality','room','startsAt','session'].includes(d.name.getText())))||(ts.isExpressionStatement(n)&&n.getText().includes('prisma.gymClassSession.')));
 return text.replace(', students, session }',', students }').replace(', reassignedSessionsCount: 1','').replace('recursos, filas e privacidade','recursos e privacidade');
});
edit('tests/gym/student-registration.integration.ts',text=>nodes(removeTest(text,title=>title.includes('conversão CRM')),n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.getText().includes('gym-crm-service')));
edit('tests/gym/http.spec.ts',text=>removeTest(text,title=>/substituição HTTP|feed da recepção|passagens HTTP|agente HTTP|avaliação de recepção|responsável sem vínculo de equipe reserva/.test(title)));
edit('tests/gym/reception-scope.integration.ts',text=>{
 text=nodes(text,n=>(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText()==='accessedAt'))||(ts.isExpressionStatement(n)&&/prisma.gym(?:AccessLog|DeviceCommand)\./.test(n.getText())));
 return text.replace('"access.read"','"students.read"').replace(', lastAccess: accessedAt.toISOString()','').replace('matrícula e saldo vêm do contrato/fatura; última passagem vem do log e GET não gera efeitos','matrícula e saldo vêm do contrato/fatura; consulta não gera cobrança');
});
fs.writeFileSync(target('docs/audits/academias/estabilizacao/retirada-modulos-testes.json'),JSON.stringify({reason:'Escopo retirado por instrução do usuário; cenários de financeiro, autorização, importação e dados preservados.',removed,records},null,2)+'\n');
console.log(`${removed.length} arquivos retirados; testes PostgreSQL pertinentes preservados.`);
