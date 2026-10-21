// Gera índices de evidências; não modifica código, banco nem serviços.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),ts=require('typescript');
const root=process.cwd(),here=__dirname;
const inventory=JSON.parse(fs.readFileSync(path.join(here,'inventario-tecnico.json'),'utf8'));
const reads=JSON.parse(fs.readFileSync(path.join(here,'leituras.json'),'utf8'));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name).replaceAll('\\','/')]);
const esc=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
const link=(f,l)=>`[${f}${l?':'+l:''}](<../../..${'/'+f}${l?'#L'+l:''}>)`;
const write=(f,s)=>fs.writeFileSync(path.join(here,f),s+'\n');
const line=(sf,n)=>sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
const format=n=>n.getText().replace(/\s+/g,' ');
const visit=(n,fn)=>{fn(n);ts.forEachChild(n,c=>visit(c,fn));};
const methodIndex=new Map();
for(const file of inventory.filter(x=>x.file.startsWith('src/modules/workspaces/application/')||x.file.startsWith('src/modules/payments/')).filter(x=>!x.file.includes('__tests__')).map(x=>x.file)){
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 for(const decl of sf.statements)if(ts.isClassDeclaration(decl))for(const member of decl.members)if(ts.isMethodDeclaration(member)&&member.name){
  const queries=new Set(),methods=new Set(),paging=new Set(),errors=new Set();
  visit(member,n=>{
   if(ts.isCallExpression(n)){
    const ex=n.expression.getText(sf);
    if(/^(prisma|tx)\.[^.]+\./.test(ex)){
     const arg=n.arguments[0];let where='';
     if(arg&&ts.isObjectLiteralExpression(arg))where=arg.properties.filter(p=>p.name?.getText(sf)==='where').map(format).join(' ');
     queries.add(ex+(where?' {'+where+'}':''));
    }
    if(/Service\./.test(ex))methods.add(ex);
   }
   if(ts.isPropertyAssignment(n)&&/^(take|skip|orderBy)$/.test(n.name.getText(sf)))paging.add(format(n));
   if(ts.isNewExpression(n)&&/WorkspaceAccessError|Error$/.test(n.expression.getText(sf)))errors.add(format(n));
  });
  const name=member.name.getText(sf),info={file,line:line(sf,member),class:decl.name?.text,name,queries:[...queries],calls:[...methods],paging:[...paging],errors:[...errors]};
  methodIndex.set(name,[...(methodIndex.get(name)||[]),info]);
 }
}
const inline=v=>{const d='`'.repeat(Math.max(1,...[...String(v).matchAll(/`+/g)].map(m=>m[0].length+1)));return d+' '+v+' '+d;};
function describeServices(calls){
 const found=new Map();
 for(const call of calls){const ex=call.split('(')[0],name=ex.split('.').at(-1),owner=ex.split('.')[0].toLowerCase(),candidates=methodIndex.get(name)||[],exact=candidates.filter(i=>i.class?.toLowerCase()===owner),chosen=exact.length?exact:candidates.length===1?candidates:[];for(const info of chosen)found.set(info.file+':'+info.line,info);}
 return [...found.values()].map(i=>`${link(i.file,i.line)} (${i.class}.${i.name}): consultas/escritas ${i.queries.map(inline).join('; ')||'sem prisma/tx direto'}; paginação/ordem ${i.paging.map(inline).join('; ')||'sem paginação direta'}; efeitos delegados ${i.calls.join(', ')||'não identificados'}`).join('\n\n');
}
const records=[];
const pages=inventory.filter(x=>x.file.includes('(gym)/gym/')&&x.file.endsWith('page.tsx')||x.file.includes('(superadmin)/superadmin/')&&x.file.endsWith('page.tsx'));
const relevantCalls=inventory.filter(x=>x.file.includes('(gym)')||x.file.includes('(guardian)')||x.file.includes('gym-')||x.file.includes('(superadmin)/superadmin/workspaces')||x.file.includes('superadmin/gym-settings')).flatMap(x=>x.calls||[]);
function pattern(call){return new RegExp('^'+call.split('?')[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\$\\\{.*?\\\}/g,'[^/]+')+'$');}
const routes=inventory.filter(x=>x.file.startsWith('src/app/api/')&&x.file.endsWith('/route.ts')).filter(x=>{
  const route=x.file.slice('src/app'.length).replace(/\/route.ts$/,'');
  return x.file.startsWith('src/app/api/gym/')||/^\/api\/(guardian|student\/(classes|dashboard|finance)|superadmin\/(gym-settings|workspaces|impersonate|asaas)|storage|ably\/token|cron|webhooks)/.test(route)||relevantCalls.some(c=>{const a=route.replace(/\[[^\]]+\]/g,'DYNAMIC');const b=c.split('?')[0].replace(/\$\{[^}]+\}/g,'DYNAMIC');return a===b;});
});
let api='# Inventário de APIs e contratos\n\nAnexo do [diagnóstico](diagnostico-modulo-academias.md). Extração AST dos handlers, cruzada com a inspeção de serviços e consumidores descrita no relatório. Os trechos abaixo registram o contrato implementado, inclusive validações incompletas; não representam especificação aprovada. Não houve chamadas HTTP reais. Links `#L` identificam linhas do snapshot, podendo exigir abrir o arquivo no editor.\n\nO middleware não protege `/api`: conferir o guard de cada operação. Guard compartilhado pode devolver 400/401/403/404; o catch local define a resposta restante. `anyCapability` é OU; `requiredCapabilities`/`allCapabilities` é E. Perfil efetivo depende dos grants e do fallback documentados em GYM-AUD-001/002.\n\n| Método | Rota | Guard explícito | Implementação |\n|---|---|---|---|\n';
const details=[];
for(const x of routes){
 const body=fs.readFileSync(x.file,'utf8'),sf=ts.createSourceFile(x.file,body,ts.ScriptTarget.Latest,true);
 const route=x.file.slice('src/app'.length).replace(/\/route.ts$/,'');
 for(const n of sf.statements){
  if(!ts.isFunctionDeclaration(n)||!n.name||!['GET','POST','PATCH','PUT','DELETE'].includes(n.name.text))continue;
  const method=n.name.text,calls=[],checks=[],inputs=[],returns=[],db=new Set(),business=new Set(),status=new Set();
  visit(n,a=>{
   if(ts.isCallExpression(a)){
    const ex=a.expression.getText(sf),full=format(a);
    if(/requireWorkspaceAccess|auth$|validateDeviceToken|authenticateAgent|rateLimit|verifyWebhook|verifySignature/.test(ex))calls.push(full);
    if(/searchParams\.get$|req(uest)?\.json$|\.safeParse$|\.parse$|\.get\("/.test(ex))inputs.push(full);
    if(/^[A-Za-z]+Service\.|^[a-z][A-Za-z]*Service\./.test(ex))business.add(full);
    const m=ex.match(/(?:prisma|tx)\.([^.]+)\./);if(m)db.add(m[1]);
    if(ex==='NextResponse.json')returns.push(full);
   }
   if(ts.isIfStatement(a))checks.push(format(a.expression));
   if(ts.isVariableDeclaration(a)&&ts.isObjectBindingPattern(a.name))inputs.push(format(a));
   if(ts.isPropertyAssignment(a)&&a.name.getText(sf)==='status')status.add(format(a.initializer));
  });
  const consumers=inventory.filter(c=>(c.calls||[]).some(call=>{try{return pattern(call).test(route.replace(/\[[^\]]+\]/g,'synthetic-id'));}catch{return false;}})).map(c=>c.file);
  const guard=calls.join('; ')||'Sem guard reconhecido pela extração; conferir autenticação inline/delegada';
  api+=`| ${method} | \`${route}\` | ${esc(guard)} | ${link(x.file,line(sf,n))} |\n`;
  details.push(`### ${method} ${route}\n\n- **Arquivo:** ${link(x.file,line(sf,n))}; linhas ${line(sf,n)}–${sf.getLineAndCharacterOfPosition(n.end).line+1}.\n- **Finalidade implementada:** ${method==='GET'?'Consultar/obter dados por':'Executar a operação de'} ${[...business].map(c=>c.split('(')[0]).join(', ')||route}; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.\n- **Consumidores rastreados por chamadas:** ${consumers.length?consumers.map(f=>link(f)).join('; '):'Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.'}\n- **Autenticação/autorização:** ${inline(guard)}.\n- **Entradas, filtros e paginação:** ${[...new Set(inputs)].map(inline).join('; ')||'Parâmetros de rota ou delegação; ver handler.'}\n- **Condições de validação/erros:** ${checks.map(inline).join('; ')||'Nenhum if local; conferir serviço.'}\n- **Chamadas e efeitos delegados:** ${[...business].map(inline).join('; ')||'Persistência inline/serviço não reconhecido: consultar arquivo.'}\n- **Entidades diretas:** ${[...db].join(', ')||'Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.'}\n- **Respostas e códigos locais:** ${returns.map(inline).join('; ')||'Resposta delegada/Response customizada.'} Códigos/expressões status: ${[...status].join(', ')||'padrão do Response/serviço'}.\n- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.\n\n**Rastreio da persistência e paginação do serviço chamado:**\n\n${describeServices(business)||'Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.'}\n`);
  records.push({route,method,file:x.file,line:line(sf,n),guard,consumers});
 }
}
api+='\n## Contratos por operação\n\n'+details.join('\n');write('inventario-apis.md',api);
write('operacoes.json',JSON.stringify(records,null,2));
let pg='# Inventário estrutural das páginas e clientes\n\nVer também o inventário funcional no [diagnóstico](diagnostico-modulo-academias.md). Extração estrutural de **todas as páginas das três áreas iniciais**; JSX não foi renderizado. A inspeção profunda priorizou fluxos ligados a academias. Páginas globais adjacentes têm seus limites de inspeção registrados na cobertura. Textos extraídos não representam captura de tela.\n\n';
for(const p of pages){
 const dir=path.dirname(p.file), related=inventory.filter(x=>x.file===p.file||path.dirname(x.file)===dir&&/client|loading|error/.test(path.basename(x.file)));
 const route=p.file.replace(/^src\/app\/\([^/]+\)/,'').replace(/\/page.tsx$/,'');
 pg+=`## ${route}\n\n| Arquivo | Linhas | Dependências diretas | APIs referenciadas |\n|---|---|---|---|\n`;
 for(const x of related)pg+=`| ${link(x.file)} | ${x.lines} | ${esc((x.imports||[]).join(', '))} | ${esc((x.calls||[]).join('; '))||'Servidor/ações/store ou nenhuma'} |\n`;
 for(const x of related){
  const sf=ts.createSourceFile(x.file,fs.readFileSync(x.file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),texts=[],comp=new Set(),state=new Set(),redirects=[],styles=new Set();
  visit(sf,n=>{
   if(ts.isJsxText(n)&&n.text.trim())texts.push(line(sf,n)+': '+n.text.trim().replace(/\s+/g,' '));
   if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))comp.add(n.tagName.getText(sf));
   if(ts.isCallExpression(n)&&/redirect|requireWorkspaceAccess|auth$|getActiveContext/.test(n.expression.getText(sf)))redirects.push(format(n));
   if(ts.isVariableDeclaration(n)&&n.initializer&&/useState|useSnapshot/.test(n.initializer.getText(sf)))state.add(format(n.name));
   if(ts.isJsxAttribute(n)&&n.name.getText(sf)==='className'&&n.initializer&&/md:|lg:|overflow|grid-cols|hidden/.test(n.initializer.getText(sf)))styles.add(n.initializer.getText(sf));
  });
  pg+=`\n### ${path.basename(x.file)}\n\n- Guard/contexto/redirecionamentos: ${redirects.map(v=>'`'+v+'`').join('; ')||'Delegados ao layout/store ou nenhum local.'}\n- Componentes: ${[...comp].join(', ')||'Wrapper servidor sem JSX relevante'}.\n- Estados locais: ${[...state].join(', ')||'Servidor/sem useState local'}.\n- Responsividade declarada: ${[...styles].map(v=>'`'+v+'`').join('; ')||'Sem breakpoint local extraído; avaliar componente compartilhado.'}\n- Rótulos e textos (linha): ${esc(texts.join(' · '))||'Sem texto literal'}\n`;
 }
}
write('inventario-paginas.md',pg);
const schema=fs.readFileSync('prisma/schema.prisma','utf8');
const blocks=[...schema.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(m=>({kind:m[1],name:m[2],body:m[3],line:schema.slice(0,m.index).split('\n').length}));
let data='# Dicionário de dados e migrations\n\nSnapshot literal do schema Prisma, sem valores de registros. Inclui modelos compartilhados e periféricos para permitir rastrear relações; inclusão não significa inspeção funcional completa de todo o AtlasFit. `?` é anulável, `[]` é coleção/relação, tipos sem esses marcadores são obrigatórios. `@default`, `@unique`, `@@unique`, `@@index` e `@relation` abaixo registram os defaults, restrições e ações explícitas. Relação sem `onDelete/onUpdate` usa defaults Prisma (confirmar no SQL real); String contendo ID sem `@relation` não cria FK.\n\n';
for(const b of blocks){
 data+=`## ${b.kind} ${b.name}\n\n${link('prisma/schema.prisma',b.line)}\n\n`;
 if(b.kind==='enum'){data+='Valores: '+b.body.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('//')).join(', ')+'\n\n';continue;}
 data+='| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |\n|---|---|---|\n';
 for(const raw of b.body.split('\n')){const s=raw.trim();if(!s||s.startsWith('//'))continue;const m=s.match(/^(\w+)\s+(\S+)\s*(.*)$/);data+=m?`| ${m[1]} | ${esc(m[2])} | ${esc(m[3])||'—'} |\n`:`| Restrição de modelo | — | ${esc(s)} |\n`;}
 data+='\n';
}
const migrations=walk('prisma/migrations').filter(f=>f.endsWith('.sql'));const created=new Set(),references=new Set();
data+='## Histórico SQL disponível\n\n| Migration | Tabelas criadas | ALTERs/tabelas referenciadas |\n|---|---|---|\n';
for(const file of migrations){const sql=fs.readFileSync(file,'utf8');const creates=[...sql.matchAll(/CREATE TABLE\s+"([^"]+)"/g)].map(m=>m[1]);const refs=[...sql.matchAll(/(?:ALTER TABLE|REFERENCES)\s+"([^"]+)"/g)].map(m=>m[1]);creates.forEach(t=>created.add(t));refs.forEach(t=>references.add(t));data+=`| ${link(file)} | ${creates.join(', ')||'—'} | ${[...new Set(refs)].join(', ')||'—'} |\n`;}
const missingRefs=[...references].filter(t=>!created.has(t));
data+='\n### Divergência estática\n\nTabelas referenciadas/alteradas sem CREATE TABLE localizado em qualquer migration do checkout: **'+missingRefs.join(', ')+'**. Isso demonstra dependência de baseline externo/ausente; não demonstra qual é o estado do banco implantado. Não foi aplicado SQL.\n\n';
const missingModels=blocks.filter(b=>b.kind==='model'&&!created.has(b.name)).map(b=>b.name);
data+='Modelos do schema sem CREATE TABLE com o mesmo nome: '+missingModels.join(', ')+'. Conferir eventuais `@@map` antes de comparar nomes; este índice não interpreta mappings.\n';write('modelo-dados.md',data);
let cover='# Matriz de cobertura e rastreabilidade\n\nAnexo do [diagnóstico](diagnostico-modulo-academias.md). **Estático não equivale a execução.** Intervalos representam pedidos de leitura/extração, com SHA-256 para identificar o conteúdo. Algumas saídas extensas tiveram truncamento: intervalos integrais extraídos não certificam compreensão de cada linha. Cruzamentos e evidências dos achados explicitam o que foi conferido em profundidade. JSX foi extraído, sem navegador; banco e serviços externos não foram executados.\n\n| Arquivo | Linhas | Profundidade/evidência | Fluxo/fronteira | Pendência |\n|---|---|---|---|---|\n';
const relevant=new Map();inventory.filter(x=>x.file.includes('(gym)')||x.file.includes('(superadmin)')||x.file.startsWith('src/app/api/gym/')||x.file.startsWith('src/modules/workspaces/')).forEach(x=>relevant.set(x.file,x));Object.keys(reads).forEach(f=>relevant.set(f,{file:f,lines:reads[f].total}));routes.forEach(x=>relevant.set(x.file,x));
for(const x of [...relevant.values()].sort((a,b)=>a.file.localeCompare(b.file))){const r=reads[x.file],isRoute=routes.some(t=>t.file===x.file),isPage=pages.some(t=>t.file===x.file);let mode=r?(r.mode||'Trechos/funções lidos e cruzados estaticamente'):isRoute?'Contrato AST; cruzamento no inventário de APIs':isPage?'Estrutura AST; página global adjacente':'Inventário estrutural, sem leitura integral registrada';const ranges=r?.ranges.map(a=>a.join('–')).join(', ')||'—';const flow=x.file.includes('payments')?'Gateway/webhooks/carteira':x.file.includes('workspaces')?'Domínio, contexto e operação de academias':x.file.includes('(superadmin)')?'Administração global / fronteira superadmin':x.file.includes('/api/gym/')?'Contrato da API de academia':x.file.includes('(gym)')?'Interface da academia':x.file.includes('prisma')?'Persistência/migration':'Dependência compartilhada';cover+=`| ${link(x.file)} | ${x.lines??r?.total??'?'} | ${esc(mode)}; intervalos ${ranges} | ${flow} | ${/test/.test(x.file)?'Banco real, concorrência e cenários sem mocks':'Execução conectada; renderização se UI; ambiente implantado'} |\n`;}
cover+='\n## Evidências brutas\n\n- [Inventário AST e hashes](inventario-tecnico.json): imports, chamadas HTTP literais e exportações.\n- [Pedidos de leitura e hashes](leituras.json): intervalos solicitados; ressalva de truncamento acima.\n- [Operações extraídas](operacoes.json).\n- [Tipos](verificacao-tipos.txt), [testes](verificacao-testes.txt), [provas isoladas](verificacao-provas-isoladas.json).\n\nArquivos sem inspeção integral registrada permanecem como lacuna, ainda que importados por um arquivo inspecionado. Não foram lidos valores de `.env`, seeds de usuários ou dados de produção.\n';write('cobertura.md',cover);
const meta={date:'2026-10-01',head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:cp.execFileSync('git',['status','--short'],{encoding:'utf8'}),gymRouteFiles:routes.filter(x=>x.file.startsWith('src/app/api/gym/')).length,gymOperations:records.filter(x=>x.file.startsWith('src/app/api/gym/')).length,allOperations:records.length,gymPages:pages.filter(x=>x.file.includes('(gym)')).length,superadminPages:pages.filter(x=>x.file.includes('(superadmin)')).length,models:blocks.filter(x=>x.kind==='model').length,enums:blocks.filter(x=>x.kind==='enum').length,migrations:migrations.length,filesInCoverage:relevant.size,recordedReads:Object.keys(reads).length};write('snapshot.json',JSON.stringify(meta,null,2));console.log(JSON.stringify({...meta,status:'registrado em snapshot.json'},null,2));
