// Ferramenta somente de leitura de código; escreve apenas evidências nesta pasta.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const here = __dirname;
const logPath = path.join(here, 'leituras.json');
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : {};
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
const [cmd, ...args] = process.argv.slice(2);
if(cmd==='sql') {
  for(const a of args) for(const p of (fs.statSync(a).isDirectory()?walk(a).filter(p=>p.endsWith('.sql')):[a])) {
    const file=p.replaceAll('\\','/'),body=fs.readFileSync(p,'utf8');
    console.log('FILE '+file);
    console.log(body.replace(/--[^\n]*/g,'').replace(/\s+/g,' '));
    log[file] ||= {total:body.split(/\r?\n/).length,sha256:crypto.createHash('sha256').update(body).digest('hex'),ranges:[]};
    log[file].ranges.push([1,log[file].total]);
  }
  fs.writeFileSync(logPath,JSON.stringify(log,null,2)+'\n');
}
if(cmd==='surface'||cmd==='surface-lite') {
  const ts=require(path.join(root,'node_modules/typescript'));
  const files=args.flatMap(a=>fs.statSync(a).isDirectory()?walk(a).filter(p=>/\.(ts|tsx)$/.test(p)): [a]);
  for(const p of files) {
    const file=p.replaceAll('\\','/'),body=fs.readFileSync(p,'utf8');
    const sf=ts.createSourceFile(file,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const printer=ts.createPrinter({removeComments:true});
    const transformer=context=>{
      const visit=node=>ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)||ts.isJsxFragment(node)?ts.factory.createIdentifier('JSX_INSPECTED_SEPARATELY'):ts.visitEachChild(node,visit,context);
      return node=>ts.visitNode(node,visit);
    };
    const transformed=ts.transform(sf,[transformer]);
    console.log('FILE '+file+' LOGIC');
    for(const stmt of transformed.transformed[0].statements) if(!ts.isImportDeclaration(stmt))console.log(printer.printNode(ts.EmitHint.Unspecified,stmt,sf).replace(/\s+/g,' '));
    const elements=[],texts=[],events=[],styles=new Set();
    function visit(n) {
      const ln=sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
      if(ts.isJsxText(n)&&n.text.trim())texts.push(ln+':'+n.text.trim().replace(/\s+/g,' '));
      if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))elements.push(n.tagName.getText(sf));
      if(ts.isJsxAttribute(n)){
        const name=n.name.getText(sf);
        if(name==='className'&&n.initializer)styles.add(n.initializer.getText(sf));
        if((cmd==='surface'?/^(on|id$|htmlFor$|aria-|disabled$|required$|type$|min$|max$|value$)/:/^(onClick$|onSubmit$|onCheckedChange$|aria-|required$)/).test(name))events.push(ln+':'+n.getText(sf).replace(/\s+/g,' '));
      }
      ts.forEachChild(n,visit);
    }
    visit(sf);
    console.log('COMPONENTS '+[...new Set(elements)].join(', '));
    console.log('TEXT '+texts.join(' | '));
    console.log('CONTROLS '+events.join(' | '));
    console.log('LAYOUT '+[...styles].filter(s=>/grid|flex|overflow|max-w|md:|lg:|hidden|text-\[|font-black|uppercase|tracking|gradient/.test(s)).join(' | '));
    transformed.dispose();
    log[file] ||= {total:body.split(/\r?\n/).length,sha256:crypto.createHash('sha256').update(body).digest('hex'),ranges:[]};
    log[file].ranges.push([1,log[file].total]);log[file].mode='Lógica e árvore JSX extraídas; sem renderização';
  }
  fs.writeFileSync(logPath,JSON.stringify(log,null,2)+'\n');
}
if(cmd==='methods' || cmd==='outline') {
  const ts=require(path.join(root,'node_modules/typescript'));
  for(const spec of args) {
    const [file,filter]=spec.split('::');
    const body=fs.readFileSync(file,'utf8');
    const sf=ts.createSourceFile(file,body,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const printer=ts.createPrinter({removeComments:true});
    console.log('FILE '+file);
    for(const stmt of sf.statements) {
      const members=ts.isClassDeclaration(stmt)?stmt.members:[stmt];
      for(const m of members) {
        if(ts.isImportDeclaration(m))continue;
        const start=sf.getLineAndCharacterOfPosition(m.getStart(sf)).line+1,end=sf.getLineAndCharacterOfPosition(m.end).line+1;
        const name=m.name?.getText(sf)||'declaration';
        if(filter && !new RegExp(filter).test(name))continue;
        console.log(start+'-'+end+' '+name+(cmd==='methods'?': '+printer.printNode(ts.EmitHint.Unspecified,m,sf).replace(/\s+/g,' '):''));
        if(cmd==='methods') {
          log[file] ||= {total:body.split(/\r?\n/).length,sha256:crypto.createHash('sha256').update(body).digest('hex'),ranges:[]};
          log[file].ranges.push([start,end]);
        }
      }
    }
  }
  if(cmd==='methods')fs.writeFileSync(logPath,JSON.stringify(log,null,2)+'\n');
}
if (cmd === 'read' || cmd === 'compact' || cmd === 'routecompact') {
  const specs=args.flatMap(a=>fs.existsSync(a)&&fs.statSync(a).isDirectory()?walk(a).filter(p=>/\.(ts|tsx|sql|md)$/.test(p)).map(p=>p.replaceAll('\\','/')):[a]);
  for (const spec of specs) {
    const [file,startText,endText] = spec.split('::');
    if (/\.env|seed.*\.(ts|cjs)$|verify-login/.test(file)) throw new Error('Arquivo excluído para evitar segredos/dados de seed');
    const body = fs.readFileSync(path.resolve(root,file), 'utf8');
    const lines = body.split(/\r?\n/);
    const start = Number(startText || 1), end = Math.min(Number(endText || lines.length), lines.length);
    log[file] ||= {total:lines.length,sha256:crypto.createHash('sha256').update(body).digest('hex'),ranges:[]};
    log[file].ranges.push([start,end]);
    process.stdout.write('\nFILE '+file+' ('+lines.length+' lines)\n');
    if (cmd === 'compact' || cmd === 'routecompact') {
      const ts = require(path.join(root,'node_modules/typescript'));
      const slice = lines.slice(start-1,end).join('\n');
      const sf = ts.createSourceFile(file,slice,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
      const printer = ts.createPrinter({removeComments:true});
      for (const stmt of sf.statements) {
        if (ts.isImportDeclaration(stmt)) continue;
        const ln = start + sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line;
        if(cmd==='routecompact' && ts.isFunctionDeclaration(stmt) && stmt.body) {
          console.log(ln+': '+stmt.name?.text);
          for(const s of stmt.body.statements) {
            if(ts.isTryStatement(s)) {
              console.log(printer.printNode(ts.EmitHint.Unspecified,s.tryBlock,sf).replace(/\s+/g,' '));
              console.log('ERROR: '+(s.catchClause ? printer.printNode(ts.EmitHint.Unspecified,s.catchClause,sf).replace(/\s+/g,' ') : 'none'));
            } else console.log(printer.printNode(ts.EmitHint.Unspecified,s,sf).replace(/\s+/g,' '));
          }
          continue;
        }
        console.log(ln+': '+printer.printNode(ts.EmitHint.Unspecified,stmt,sf).replace(/\s+/g,' '));
      }
    } else process.stdout.write(lines.slice(start-1,end).map((s,i)=>`${start+i}: ${s}`).join('\n')+'\n');
  }
  fs.writeFileSync(logPath,JSON.stringify(log,null,2)+'\n');
} else if (cmd === 'stats') {
  for (const dir of args) for(const p of walk(path.resolve(root,dir))) {
    const body=fs.readFileSync(p,'utf8');
    console.log(body.split(/\r?\n/).length+'\t'+path.relative(root,p).replaceAll('\\','/'));
  }
} else if (cmd === 'inventory') {
  const files=walk(path.join(root,'src')).filter(p=>/\.(ts|tsx)$/.test(p)&&!p.includes('dataconnect-generated'));
  const data=files.map(p=>{
    const body=fs.readFileSync(p,'utf8');
    return {file:path.relative(root,p).replaceAll('\\','/'),lines:body.split(/\r?\n/).length,sha256:crypto.createHash('sha256').update(body).digest('hex'),imports:[...body.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)].map(m=>m[1]),methods:[...body.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(m=>m[1]),calls:[...body.matchAll(/(?:fetch|api\.(?:get|post|patch|put|delete))\s*\(\s*(["'`])([^"'`]+)\1/g)].map(m=>m[2])};
  });
  fs.writeFileSync(path.join(here,'inventario-tecnico.json'),JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({files:data.length,gymApi:data.filter(x=>x.file.startsWith('src/app/api/gym/')).length,gymPages:data.filter(x=>x.file.startsWith('src/app/(gym)/gym/')&&x.file.endsWith('/page.tsx')).length,superadminPages:data.filter(x=>x.file.startsWith('src/app/(superadmin)/superadmin/')&&x.file.endsWith('/page.tsx')).length}));
}
