const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/app/(gym)/gym/enrollments/enrollments-client.tsx';
let source = fs.readFileSync(file,'utf8');
const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const edits = [];
function visit(node) {
 if (ts.isVariableStatement(node) && /^const \[sub(RecurrenceMode|BillingType|Card)/.test(node.getText(ast))) { edits.push({start: node.getStart(ast),end:node.end,text:''}); return; }
 if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleSetupSubscriptionSubmit') {
  edits.push({start:node.initializer.getStart(ast),end:node.initializer.end,text:`async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentToSetupSubscription) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/gym/enrollments/' + enrollmentToSetupSubscription.id + '/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, recurrenceMode: 'LOCAL', billingType: 'UNDEFINED', customFirstDueDate: subFirstDueDate || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Não foi possível configurar a recorrência.');
      toast.success('Mensalidades internas configuradas. Registre os recebimentos no financeiro.');
      setEnrollmentToSetupSubscription(null);
      await loadEnrollments(selectedStatusTab, searchQuery);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao configurar mensalidades.'); }
    finally { setIsSubmitting(false); }
  }`}); return;
 }
 if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'form' && node.openingElement.getText(ast).includes('handleSetupSubscriptionSubmit')) {
  const children = node.children.filter(child => !ts.isJsxText(child));
  for (const child of children.slice(0,3)) edits.push({start:child.getStart(ast),end:child.end,text:''});
  return;
 }
 ts.forEachChild(node,visit);
}
visit(ast);
for (const edit of edits.sort((a,b)=>b.start-a.start)) source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
source=source.replace(/setSubRecurrenceMode\([^;]+\);\s*/g,'').replace(/setSubBillingType\([^;]+\);\s*/g,'').replace('Configurar Recorrência & Assinatura Externa','Mensalidades recorrentes').replace('Defina como os ciclos de mensalidade serão cobrados: via Asaas (cartão/checkout automático) ou controle local.','As mensalidades são geradas internamente. O pagamento é registrado pela equipe.').replace('"Recorrente · Asaas"','"Assinatura externa legada"');
fs.writeFileSync(file,source);
