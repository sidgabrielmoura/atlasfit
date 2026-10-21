const fs = require('node:fs'); const file = 'src/components/application/gym-student-finance.tsx'; let code = fs.readFileSync(file, 'utf8');
const before = 'receiptNumber: z.string(), paidAt: z.string(), paymentMethod: z.string()';
if (!code.includes(before)) throw Error('Schema de recibo não encontrado.');
code = code.replace(before, before + ', reversed: z.boolean(), reversedAt: z.string().nullable()');
const receipt = '<p key={receipt.receiptNumber}>{brl(receipt.amountInCents)} · {new Date(receipt.paidAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Recibo {receipt.receiptNumber}</p>';
if (!code.includes(receipt)) throw Error('Linha de recibo não encontrada.');
code = code.replace(receipt, '<p key={receipt.receiptNumber} className={receipt.reversed ? "text-muted-foreground" : undefined}>{brl(receipt.amountInCents)} · {new Date(receipt.paidAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Recibo {receipt.receiptNumber}{receipt.reversed ? " · Revertido" : ""}</p>');
fs.writeFileSync(file, code);
