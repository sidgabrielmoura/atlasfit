const fs = require('node:fs');
const ts = require('typescript');
for (const file of ['src/modules/workspaces/application/gym-financial-service.ts', 'src/modules/workspaces/application/gym-wallet-reconciliation-service.ts']) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.body && (node.name.getText(ast) === 'getOrCreatePayerGatewayCustomer' || node.body.statements.some(s => ts.isExpressionStatement(s) && s.expression.getText(ast) === 'rejectActiveGymGateway()'))) {
      edits.push({ start: node.body.getStart(ast), end: node.body.end, text: '{\n    rejectActiveGymGateway();\n  }' });
    }
    if (ts.isPropertyDeclaration(node) && node.name.getText(ast) === 'adapter') edits.push({ start: node.getStart(ast), end: node.end, text: '' });
    if (ts.isImportDeclaration(node) && /asaas-adapter|subaccount-crypto|fee-calculator/.test(node.moduleSpecifier.text)) edits.push({start: node.getStart(ast), end: node.end, text: ''});
    ts.forEachChild(node, visit);
  }
  visit(ast);
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  fs.writeFileSync(file, result);
}
