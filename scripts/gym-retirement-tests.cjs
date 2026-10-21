const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/modules/workspaces/__tests__/gym-040.test.ts';
const source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const edits = [];
const args = {
 onboardGymAccount: '{ workspaceId: "gym", actorUserId: "operator", name: "Empresa", cnpj: "00000000000000", email: "test@example.invalid", phone: "00000000000", postalCode: "00000000", address: "Teste", addressNumber: "1", province: "Teste" }',
 syncGymBalance: '"gym"',
 createGymBilling: '{ workspaceId: "gym", actorUserId: "operator", studentUserId: "student", title: "Teste", amountInCents: BigInt(100), paymentMethod: WalletPaymentMethod.PIX, dueDate: new Date() }',
};
function visit(node) {
 if (ts.isCallExpression(node) && node.expression.getText(ast) === 'it') {
  const fn = node.arguments[1];
  if (fn && ts.isArrowFunction(fn) && ts.isBlock(fn.body)) {
   const method = Object.keys(args).find(m => fn.body.getText(ast).includes(`gymFinancialService.${m}(`));
   if (method) {
    edits.push({start: node.arguments[0].getStart(ast), end: node.arguments[0].end, text: JSON.stringify(`caminho ${method} retirado: não chama gateway nem altera histórico`)});
    edits.push({start: fn.body.getStart(ast), end: fn.body.end, text: `{ await expect(gymFinancialService.${method}(${args[method]})).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); for (const operation of Object.values(mockAsaasAdapter)) expect(operation).not.toHaveBeenCalled(); expect(mockPrisma.auditLog.create).not.toHaveBeenCalled(); }`});
   }
  }
 }
 ts.forEachChild(node, visit);
}
visit(ast);
let result = source;
for (const edit of edits.sort((a,b) => b.start-a.start)) result = result.slice(0,edit.start)+edit.text+result.slice(edit.end);
fs.writeFileSync(file,result);
const subscriptionFile = 'src/modules/workspaces/__tests__/gym-042.test.ts';
let subscriptionSource = fs.readFileSync(subscriptionFile,'utf8');
const subscriptionAst = ts.createSourceFile(subscriptionFile, subscriptionSource, ts.ScriptTarget.Latest, true);
let obsolete;
function findReconciliation(node) {
 if (ts.isCallExpression(node) && node.expression.getText(subscriptionAst) === 'it') {
  const fn = node.arguments[1];
  if (fn && ts.isArrowFunction(fn) && fn.body.getText(subscriptionAst).includes('subscriptionService.reconcileSubscription(')) obsolete = fn.body;
 }
 ts.forEachChild(node, findReconciliation);
}
findReconciliation(subscriptionAst);
if (obsolete) subscriptionSource = subscriptionSource.slice(0,obsolete.getStart(subscriptionAst)) + '{ await expect(subscriptionService.reconcileSubscription({ workspaceId: "gym", enrollmentId: "legacy", actorUserId: "actor" })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); expect(mockPrisma.gymInvoice.update).not.toHaveBeenCalled(); }' + subscriptionSource.slice(obsolete.end);
fs.writeFileSync(subscriptionFile, subscriptionSource);
