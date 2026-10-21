const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function edit(file, fn) {
  const target = path.resolve(root, file);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid target');
  const text = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  const backup = path.join(root, '.tmp/gym-retired-sources', file);
  if (!fs.existsSync(backup)) { fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.writeFileSync(backup, text); }
  fs.writeFileSync(target, fn(text));
}
function nodes(text, test) {
  const file = ts.createSourceFile('file.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  function visit(n) { if (test(n)) { edits.push([n.getFullStart(), n.end]); return; } ts.forEachChild(n, visit); }
  visit(file);
  for (const [a,b] of edits.sort((a,b) => b[0]-a[0])) text = text.slice(0,a)+text.slice(b);
  return text;
}
function jsx(text, tag, match, maxSize = 4000) {
  return nodes(text, n => ts.isJsxElement(n) && n.openingElement.tagName.getText() === tag && n.getText().length < maxSize && match(n.getText()));
}
const props = new Set(['maxDevices','allowMinorSelfCheckin','biometricValidationMode','cancelFutureSessionsWithoutSubstitute']);
function dropProps(text) {
  const source = ts.createSourceFile('file.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), edits = [];
  function visit(n) {
    if ((ts.isPropertyAssignment(n) || ts.isPropertySignature(n)) && props.has(n.name.getText())) {
      let a = n.getFullStart(), b = n.end;
      if (ts.isPropertyAssignment(n)) { while (/\s/.test(text[b] || '')) b++; if (text[b] === ',') b++; else { let p=a-1; while(p>=0 && /\s/.test(text[p])) p--; if(text[p]===',')a=p; } }
      edits.push([a,b]); return;
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
  for(const[a,b]of edits.sort((a,b)=>b[0]-a[0])) text=text.slice(0,a)+text.slice(b);
  return text;
}
edit('src/app/(superadmin)/superadmin/gym-settings/page.tsx', text => {
  text = jsx(text, 'div', x => x.includes('id="gym-hardware"'));
  text = jsx(text, 'Card', x => x.includes('Integrações e segurança'));
  text = jsx(text, 'AlertDialog', x => x.includes('confirmDisable'));
  text = nodes(text, n => (ts.isImportDeclaration(n) && n.moduleSpecifier.getText().includes('/alert-dialog')) || (ts.isVariableStatement(n) && n.getText().includes('[confirmDisable,')));
  text = text.replace('"turnstilesEnabled", ', '').replace(/^  \{ key: "defaultMaxDevices"[^\n]*\n/m, '');
  return text;
});
edit('src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx', text => {
  text = jsx(text, 'Card', x => x.includes('Terminais / Catracas'));
  for (const id of ['maxDevices', 'biometricMode', 'allowMinorSelfCheckin']) text = jsx(text, 'div', x => x.includes(`htmlFor="${id}"`), 2400);
  text = dropProps(text);
  return text.replace('Parâmetros de Licença e Políticas de Acesso','Licença e operação').replace('Defina os limites de contrato corporativo e as regras de controle de acesso/catraca para esta academia.','Limites e preferências desta academia.').replace('Políticas Operacionais & Catraca','Preferências operacionais').replace('Dias de tolerância antes do bloqueio automático na catraca.','Tolerância aplicada à inadimplência.').replace('Gestão das filiais físicas, catracas e terminais vinculados ao workspace.','Unidades vinculadas à academia.');
});
edit('src/app/(superadmin)/superadmin/workspaces/page.tsx', text => text.replace(/catracas/gi, 'unidades'));
edit('src/app/(guardian)/guardian/dependents/dependents-client.tsx', text => jsx(text, 'div', x => x.includes('Políticas de Acesso à Catraca'), 1800).replace(/\{\/\* Turnstile \/ Biometric access policies \*\/\}/g, ''));
edit('src/app/(gym)/gym/import/import-client.tsx', text => jsx(text, 'div', x => x.includes('commitResult.createdAccessGrantsCount'), 1000));
edit('src/modules/workspaces/application/gym-import-service.ts', text => text.replace(', "Cartao_Acesso"','').replace('faturas de abertura e credenciais','faturas de abertura'));
edit('src/modules/workspaces/application/gym-import-commands.ts', text => text.replace(' const seenCards = new Set<string>();',''));
edit('src/app/(gym)/gym/import/page.tsx', text => text.replace(/,?\s*credenciais/g, ''));
edit('src/app/(gym)/gym/finance/finance-client.tsx', text => {
  text = jsx(text, 'TabsContent', x => x.includes('physicalAttendance'), 5000);
  text = nodes(text, n => ts.isJsxSelfClosingElement(n) && n.getText().includes('overviewData.physicalAttendance'));
  text = nodes(text, n => ts.isJsxElement(n) && n.openingElement.tagName.getText() === 'TabsTrigger' && n.openingElement.getText().includes('value="attendance"'));
  return text;
});
edit('src/modules/workspaces/application/enrollment-service.ts', text => nodes(text, n => ts.isMethodDeclaration(n) && n.name.getText() === 'checkStudentTurnstileAccess'));
for(const file of ['src/app/api/gym/team/[id]/offboard/route.ts']) {
  if(fs.existsSync(path.join(root,file))) edit(file, dropProps);
}
console.log('Retired UI and configuration consumers removed.');
