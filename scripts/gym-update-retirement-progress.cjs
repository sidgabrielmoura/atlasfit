const fs=require('node:fs');
const folder='docs/audits/academias/estabilizacao',file=`${folder}/tratamento.json`;
const states=JSON.parse(fs.readFileSync(file,'utf8'));
const retired=[];
for(const artifact of ['retirada-modulos-manifest.json','retirada-modulos-testes.json','retirada-wallet-orfaos.json']) {
 const manifest=JSON.parse(fs.readFileSync(`${folder}/${artifact}`,'utf8'));
 for(const record of manifest.records||manifest.targets||[]) retired.push(typeof record==='string'?record:record.path);
 retired.push(...(manifest.removed||[]));
}
const known=new Set(retired.filter(Boolean));
for(const state of Object.values(states)) {
 const missing=state.files.filter(path=>!fs.existsSync(path));
 for(const path of missing) if(!known.has(path)&&!fs.existsSync(`.tmp/gym-retired-sources/${path}`))throw new Error('Unexplained missing reference: '+path);
 state.retiredFiles=[...new Set([...(state.retiredFiles||[]),...missing])];
 state.files=state.files.filter(path=>fs.existsSync(path));
 if(missing.length&&!state.files.includes(`${folder}/retirada-modulos.md`))state.files.push(`${folder}/retirada-modulos.md`);
}
for(const number of [28,32,33,34,35,37,38,39,40,41,56,62,63]) {
 const id=`GYM-AUD-${String(number).padStart(3,'0')}`,state=states[id];
 state.state='Desativado ou retirado do escopo com segurança';
 state.currentConfirmation='Escopo GYM retirado por instrução explícita do usuário. Ausência das fontes/endpoints e retirada dos consumidores verificadas; dados históricos preservados. Não declara correção/homologação de integração física ou operação externa.';
 state.correction='Retirada das páginas, APIs, serviços, permissões, canais e consumidores exclusivos conforme retirada-modulos.md. Wallet mantém resposta 410 e consulta local de legado. Schema/migrations e fatos históricos preservados; não houve cancelamento externo ou purga. Implantação/agentes externos não foram inspecionados.';
 state.files=[`${folder}/retirada-modulos.md`,`${folder}/retirada-modulos-manifest.json`,'tests/gym/module-retirement.integration.ts','tests/gym/http.spec.ts'];
 state.validation=['PostgreSQL isolado: 41 cenários pertinentes aprovados. HTTP isolado: 3 cenários passaram (rotas retiradas 404, configuração e recepção SSR); 21 fora do filtro não foram executados.'];
 state.dependencies='Task futura separada para CRM/aulas/hardware se autorizada; revisão administrativa de histórico externo, sem ação automática.';
}
states['GYM-AUD-058'].correction='Recepção protegida no servidor por students.read e escopo de unidade atual. Snapshot paginado não entrega financeiro sem invoices.read. Módulo físico/feed/comandos retirados; não há liberação física anunciada. UI simplificada em verificação HTTP; testes PostgreSQL de isolamento/revogação e ausência de campos sensíveis passaram.';
states['GYM-AUD-058'].files=['src/app/(gym)/gym/reception/page.tsx','src/app/(gym)/gym/reception/reception-client.tsx','src/modules/workspaces/application/gym-reception-query.ts','src/modules/workspaces/application/gym-unit-access.ts','tests/gym/reception-scope.integration.ts','tests/gym/module-retirement.integration.ts',`${folder}/retirada-modulos.md`];
states['GYM-AUD-045'].scopeRevision='CRM/aulas/acesso físico retirados; biblioteca e prescrição GYM mantidas. Handover não usa mais aulas. Verificação visual/avançada de treinos segue pendente.';
fs.writeFileSync(file,JSON.stringify(states,null,2)+'\n');
const main='docs/audits/academias/estabilizacao-modulo-academias.md';let text=fs.readFileSync(main,'utf8');
const start='<!-- escopo-atual-inicio -->',end='<!-- escopo-atual-fim -->';
const counts={}; for(const state of Object.values(states))counts[state.state]=(counts[state.state]||0)+1;
const section=`${start}\n## Escopo atual após instrução de 02/10\n\nCRM, aulas e equipamentos GYM foram retirados das fontes operacionais. [Retirada e verificação](estabilizacao/retirada-modulos.md) substituem o escopo dos lotes físicos abaixo, mantidos como histórico. O personal vinculado será a última etapa: reutilizar a área PERSONAL com operações/visibilidade próprias do GYM e workspace autônomo privado, trial/quota/paywall existentes. Essa etapa ainda não foi implementada.\n\nPosição deste marco: ${counts["Corrigido e verificado"]||0} achados corrigidos e verificados, ${counts["Desativado ou retirado do escopo com segurança"]||0} retirados do escopo, ${counts["Implementado, aguardando verificação específica"]||0} implementados aguardando verificação específica e ${counts.Pendente||0} pendentes. Os estados não significam 46 processos independentes, nem que correções parciais estejam homologadas.\n${end}`;
if(text.includes(start)){const a=text.indexOf(start),b=text.indexOf(end,a);text=text.slice(0,a)+section+text.slice(b+end.length);}else text=text.replace('\n## Estado inicial',`\n${section}\n\n## Estado inicial`);
text=text.replace(/Posição após o lote de configuração global:[^\n]+/,'A posição anterior ao novo escopo está preservada nos resultados históricos; o marco atual está registrado abaixo.');
fs.writeFileSync(main,text);
console.log('Scope revision recorded individually; remaining compound findings kept pending.');
