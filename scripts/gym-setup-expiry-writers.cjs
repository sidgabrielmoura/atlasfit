const fs = require('node:fs'); const ts = require('typescript');
const files = ['src/modules/workspaces/application/gym-student-service.ts','src/modules/workspaces/application/gym-import-service.ts','src/app/api/personal/clients/route.ts','src/app/api/personal/clients/pending/route.ts','src/app/api/personal/clients/[id]/resend-invite/route.ts','src/app/api/personal/crm/[id]/convert/route.ts','src/lib/auth/password-reset-service.ts','src/lib/auth/admin-user-service.ts'];
for (const file of files) {
 let source = fs.readFileSync(file, 'utf8'); const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true); const edits = [];
 function visit(node) {
  if (ts.isCallExpression(node) && /(?:prisma|tx)\.user\.(?:create|update|updateMany)$/.test(node.expression.getText(ast))) {
   const argument = node.arguments[0];
   if (argument && ts.isObjectLiteralExpression(argument)) {
    const data = argument.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'data');
    if (data && ts.isObjectLiteralExpression(data.initializer)) {
     const object = data.initializer; const token = object.properties.find(p => p.name?.getText(ast) === 'setupToken');
     if (token && !object.properties.some(p => p.name?.getText(ast) === 'setupTokenExpiresAt')) {
      const expression = ts.isPropertyAssignment(token) ? token.initializer.getText(ast) : 'setupToken';
      edits.push({ start: token.getStart(ast), text: `setupTokenExpiresAt: ${expression === 'null' ? 'null' : 'newSetupTokenExpiry()'},\n` });
     }
    }
   }
  }
  ts.forEachChild(node, visit);
 }
 visit(ast);
 for (const edit of edits.sort((a,b) => b.start - a.start)) source = source.slice(0,edit.start) + edit.text + source.slice(edit.start);
 if (source.includes('newSetupTokenExpiry()') && !source.includes('import { newSetupTokenExpiry }')) source = 'import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";\n' + source;
 fs.writeFileSync(file,source);
 console.log(`${file}: ${edits.length} emissão/limpeza de prazo.`);
}
