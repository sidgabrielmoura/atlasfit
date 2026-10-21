const fs = require('node:fs');
const file = 'src/app/(gym)/gym/finance/finance-client.tsx';
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
if (text.includes('const availableTabs')) throw new Error('Abas já atualizadas.');
text = text.replace('      if (tabParam) {', '      if (tabParam && availableTabs.includes(tabParam)) {');
text = text.replace('  const canManage = userCapabilities.includes("workspace.manage");\n', '');
const marker = '  const [activeTab, setActiveTab] = useState("invoices");';
text = text.replace(marker, `  const availableTabs = ["invoices", "expenses", "accounts", ...(userCapabilities.includes("payments.read") ? ["payments", "cash-drawer"] : []), ...(userCapabilities.includes("reports.finance") ? ["metrics"] : [])];
${marker}`);
for (const [tab, label, cap] of [['metrics','Métricas & Relatórios','reports.finance'], ['payments','Pagamentos Balcão','payments.read'], ['cash-drawer','Caixa Recepção','payments.read']]) {
 text = text.replace(`<TabsTrigger value="${tab}">${label}</TabsTrigger>`, `{userCapabilities.includes("${cap}") && <TabsTrigger value="${tab}">${label}</TabsTrigger>}`);
 const start = text.indexOf(`<TabsContent value="${tab}"`); const end = text.indexOf('</TabsContent>', start);
 if (start < 0 || end < 0) throw new Error('Conteúdo da aba ausente.');
 text = text.slice(0,start) + `{userCapabilities.includes("${cap}") && ` + text.slice(start,end) + '</TabsContent>}' + text.slice(end + '</TabsContent>'.length);
}
text = text.replace('Valor Total Quitado:', 'Valor recebido:');
fs.writeFileSync(file, text);
console.log('Abas limitadas às capacidades disponíveis nas unidades autorizadas.');
