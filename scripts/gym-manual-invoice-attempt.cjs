const fs = require('node:fs');
function edit(file, transform) { fs.writeFileSync(file, transform(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'))); }
edit('src/modules/workspaces/application/manual-invoice-service.ts', text => {
 const marker = 'invoiceNumber: `FAT-';
 if (!text.includes(marker)) throw new Error('Create fatura não localizado.');
 return text.replace(marker, 'issuanceKey, issuanceFingerprint, ' + marker);
});
edit('src/app/(gym)/gym/finance/finance-client.tsx', text => {
 text = 'import { useRequestAttempt } from "@/hooks/use-request-attempt";\n' + text;
 // Keep the directive first.
 text = text.replace('import { useRequestAttempt } from "@/hooks/use-request-attempt";\n"use client";', '"use client";\nimport { useRequestAttempt } from "@/hooks/use-request-attempt";');
 text = text.replace('  const [paymentRequestKey, setPaymentRequestKey] = useState(() => crypto.randomUUID());', '  const invoiceAttempt = useRequestAttempt(`GYM:${workspaceId}:INVOICE`);\n  const paymentAttempt = useRequestAttempt(`GYM:${workspaceId}:INVOICE_PAYMENT:${payInPersonForm.invoiceId || "none"}`);');
 // Hook must follow declaration of the selected invoice form.
 const hook = '  const paymentAttempt = useRequestAttempt(`GYM:${workspaceId}:INVOICE_PAYMENT:${payInPersonForm.invoiceId || "none"}`);\n';
 text = text.replace(hook, '').replace('  const canIssue =', hook + '\n  const canIssue =');
 text = text.replace('        idempotencyKey: paymentRequestKey,\n', '');
 const invoiceRequest = '      const res = await fetch("/api/gym/finance/invoices",';
 text = text.replace(invoiceRequest, '      const idempotencyKey = invoiceAttempt.keyFor(JSON.stringify(payload));\n' + invoiceRequest);
 text = text.replace('body: JSON.stringify(payload)\n      });\n\n      if (!res.ok)', 'body: JSON.stringify({ ...payload, idempotencyKey })\n      });\n\n      if (!res.ok)');
 // Payment key is computed from its request just before sending, not from editable fields.
 const paymentRequest = '      const res = await fetch("/api/gym/finance/payments",';
 text = text.replace(paymentRequest, '      const idempotencyKey = paymentAttempt.keyFor(JSON.stringify(payload));\n' + paymentRequest);
 text = text.replace('setPaymentRequestKey(crypto.randomUUID());', 'paymentAttempt.confirmed();');
 text = text.replace('      toast.success("Fatura emitida com sucesso no sistema!");', '      invoiceAttempt.confirmed();\n      toast.success("Fatura emitida.");');
 return text;
});
// Preserve the security assertions; add the request identity now required by the command.
edit('tests/gym/manual-finance.integration.ts', text => text.replace('const input = { workspaceId: f.workspace.id, actorUserId: receptionist.id, studentMemberId:', 'const input = { idempotencyKey: randomUUID(), workspaceId: f.workspace.id, actorUserId: receptionist.id, studentMemberId:'));
edit('tests/gym/finance-unit-scope.integration.ts', text => text.replace('issueManualInvoice({ workspaceId:', 'issueManualInvoice({ idempotencyKey: randomUUID(), workspaceId:').replace('const input = { workspaceId:', 'const input = { idempotencyKey: randomUUID(), workspaceId:').replace('discountPercentage: 0.29,', 'idempotencyKey: randomUUID(), discountPercentage: 0.29,'));
console.log('Emissão e recebimento usam tentativa persistente; fixtures refletem o contrato obrigatório.');
