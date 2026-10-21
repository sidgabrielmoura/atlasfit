const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const files = [];
function walk(folder) { for (const entry of fs.readdirSync(folder, { withFileTypes: true })) { const file = path.join(folder, entry.name); if (entry.isDirectory()) walk(file); else if (entry.name === 'route.ts') files.push(file); } }
walk('src/app/api/gym');
let changed = 0;
for (const file of files) {
 let source = fs.readFileSync(file, 'utf8');
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
 const edits = [];
 for (const statement of ast.statements) {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !['@/modules/workspaces', '@/modules/workspaces/application/guard'].includes(statement.moduleSpecifier.text)) continue;
  const bindings = statement.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) continue;
  for (const element of bindings.elements) {
   if ((element.propertyName?.text ?? element.name.text) === 'requireWorkspaceAccess') edits.push({ start: element.getStart(ast), end: element.end, text: `requireGymWorkspaceAccess as ${element.name.text}` });
  }
 }
 if (!edits.length) continue;
 for (const edit of edits.sort((a,b) => b.start - a.start)) source = source.slice(0,edit.start) + edit.text + source.slice(edit.end);
 fs.writeFileSync(file, source); changed++;
}
console.log(`${changed} handlers vinculados ao guard GYM; serviços e guards de dispositivo não substituídos.`);
