const fs = require('node:fs');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const results = JSON.parse(fs.readFileSync(`${folder}/verificacoes-isoladas.json`, 'utf8'));
const files = [
  'src/modules/workspaces/application/cash-mutations.ts', 'src/modules/workspaces/application/cash-drawer-expense-service.ts',
  'src/app/api/gym/finance/accounts/route.ts', 'src/app/api/gym/finance/transfers/route.ts', 'src/app/api/gym/finance/expenses/route.ts',
  'src/app/api/gym/finance/cash-drawer/route.ts', 'src/app/api/gym/finance/cash-drawer/movements/route.ts',
  'src/app/api/gym/finance/cash-drawer/close/route.ts', 'src/app/api/gym/finance/cash-drawer/reconcile/route.ts',
  'src/app/(gym)/gym/finance/components/accounts-tab.tsx', 'src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx',
  'src/app/(gym)/gym/finance/components/internal-finance-contract.ts', 'src/hooks/use-request-attempt.ts',
  'tests/gym/cash-expense.integration.ts', 'tests/gym/http.spec.ts', 'prisma/migrations/20261003020000_gym_cash_movement_retry/migration.sql',
];
for (const label of ['cash-movement-scope', 'http-cash-movement-scope']) if (!results[label]?.success) throw new Error(`Resultado aprovado não localizado: ${label}`);
fs.writeFileSync(`${folder}/verificacoes-caixa-contratos.json`, JSON.stringify({
  recordedAt: new Date().toISOString(),
  postgres: results['cash-movement-scope'], http: results['http-cash-movement-scope'],
  typecheck: { command: 'node node_modules/typescript/bin/tsc --noEmit --incremental false', execSession: 73843, exitCode: 0, output: '', evidence: 'Sessão concluída no tool write_stdin; horário de início não capturado neste artefato.' },
  prismaValidate: { command: 'node node_modules/prisma/build/index.js validate', exitCode: 0, output: 'The schema at prisma/schema.prisma is valid.', scope: 'Validação, sem migration ou acesso a dados.' },
  diffCheck: { scopedCommand: 'git diff --check -- prisma/schema.prisma', scopedExitCode: 0, fullTrackedPreviousResult: 'Whitespace encontrado em arquivos compartilhados fora deste lote; não aprovado globalmente.', previousFiles: ['src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx', 'src/app/api/personal/clients/[id]/evaluations/route.ts', 'src/app/api/personal/clients/[id]/files/route.ts', 'src/app/api/personal/clients/[id]/progress/photos/route.ts', 'src/app/api/personal/clients/[id]/workouts/route.ts', 'src/app/api/superadmin/security/totp/devices/route.ts', 'src/app/api/superadmin/security/totp/disable/route.ts'] },
  sourceHashes: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
  limits: ['HTTP não verifica browser, mobile ou teclado.', 'GET de despesas atual tem verificação PostgreSQL/compilação, sem nova jornada HTTP própria.', 'Recuperação da chave em sessionStorage foi implementada/inspecionada, ainda sem navegador real.', 'Nenhuma implantação, cobrança, mensagem, equipamento ou mudança em dados reais.', 'Baseline histórica e reconciliação continuam pendentes.'],
}, null, 2) + '\n');
console.log('Artefatos de caixa, escopo e limites registrados sem credenciais.');
