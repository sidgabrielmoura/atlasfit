const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/modules/workspaces/application/cash-drawer-expense-service.ts';
let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const service = ast.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === 'GymCashExpenseService');
const methods = { createFinancialAccount: 'createInternalAccount', transferBetweenAccounts: 'transferInternalAccounts', openCashDrawer: 'openInternalCash', recordCashMovement: 'moveInternalCash', closeCashDrawer: 'closeInternalCash', reconcileCashDrawer: 'reconcileInternalCash', createExpense: 'createInternalExpense', payExpense: 'payInternalExpense', cancelExpense: 'cancelInternalExpense' };
const edits = Object.entries(methods).map(([name, target]) => {
  const method = service?.members.find(s => ts.isMethodDeclaration(s) && s.name?.getText(ast) === name);
  if (!method?.body) throw new Error('Método não localizado: ' + name);
  return { start: method.body.pos, end: method.body.end, text: ` { return ${target}(input); }` };
});
for (const edit of edits.sort((a,b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
if (!source.includes('from "./cash-mutations"')) source = `import { ${Object.values(methods).join(', ')} } from "./cash-mutations";\n` + source;
fs.writeFileSync(file, source);
