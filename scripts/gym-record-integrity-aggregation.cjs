const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const isolated = read(`${folder}/verificacoes-isoladas.json`);
const integration = isolated['integracao-integridade-agregacao'];
const tenant = isolated['tenant-constraints'];
const reports = isolated['reports-aggregates'];
const deploy = read(`${folder}/verificacoes-tenant-deploy.json`);
const preflight = read(`${folder}/preflight-tenant-real.json`);
const a11y = read(`${folder}/verificacoes-configuracao-a11y.json`);
const browser = read(`${folder}/verificacoes-relatorios-browser.json`);
const volume = read(`${folder}/verificacoes-relatorios-volume.json`);
const typecheck = read(`${folder}/typecheck-contexto-final.json`);
const schemaValidation = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'validate'], { encoding: 'utf8', windowsHide: true });
assert.equal(schemaValidation.status, 0);
for (const check of [integration, tenant, reports, deploy, preflight, a11y, browser, volume]) assert.equal(check.success, true);
assert.equal(typecheck.exitCode, 0);
const summarize = check => Object.fromEntries(['startedAt', 'finishedAt', 'command', 'exitCode', 'passed', 'failed', 'skipped', 'success', 'rawFile'].filter(key => key in check).map(key => [key, check[key]]));
const files = [
 '.gitignore', 'prisma/gym-tenant-integrity.json',
 'prisma/baseline-migrations/20261009000000_gym_tenant_relations/migration.sql',
 'prisma/migrations/20261009000000_gym_tenant_relations/migration.sql',
 'scripts/gym-generate-tenant-integrity.cjs', 'scripts/gym-tenant-preflight.cjs',
 'scripts/gym-test-tenant-constraints.cjs', 'scripts/gym-verify-tenant-deploy.cjs',
 'scripts/gym-settings-a11y.cjs', 'scripts/gym-report-aggregation-browser.cjs',
 'scripts/gym-record-integrity-aggregation.cjs', 'scripts/gym-remaining-report.cjs',
 'src/modules/workspaces/application/gym-report-financial-aggregates.ts',
 'src/modules/workspaces/application/gym-analytics-service.ts',
 'src/app/(gym)/gym/finance/finance-client.tsx', 'src/app/layout.tsx',
 'src/components/application/command-menu.tsx', 'src/components/application/notification-bell.tsx',
 'src/components/application/superadmin-sidebar.tsx', 'src/components/application/superadmin-breadcrumbs.tsx',
 'tests/gym/tenant-constraints.integration.ts', 'tests/gym/report-scope.integration.ts',
 'tests/gym/report-temporal.integration.ts',
 `${folder}/integridade-agregacao-acessibilidade.md`,
 ...a11y.samples.map(sample => sample.screenshot), ...browser.samples.map(sample => sample.screenshot),
];
const intermediateBrowserFailures = fs.readdirSync('.tmp/gym-stabilization', { withFileTypes: true }).filter(entry => entry.isDirectory() && /^(settings-a11y|reports-browser)-/.test(entry.name)).flatMap(entry => {
 const file = path.join('.tmp/gym-stabilization', entry.name, 'report.json');
 if (!fs.existsSync(file)) return [];
 const check = read(file);
 return check.success === false ? [{ file: file.replaceAll('\\', '/'), startedAt: check.startedAt, finishedAt: check.finishedAt, failure: check.failure }] : [];
});
const manifest = {
 recordedAt: new Date().toISOString(), configuredDatabaseChanged: false, productionDeployed: false,
 integration: summarize(integration), tenant: summarize(tenant), reports: summarize(reports),
 deploy, preflight, volume, typecheck, a11y, browser, intermediateBrowserFailures,
 schemaValidation: { command: 'node node_modules/prisma/build/index.js validate', exitCode: schemaValidation.status, output: schemaValidation.stdout + schemaValidation.stderr },
 sources: files.map(file => ({ file, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') })),
 limitations: [
  'Two configured relations require the future schema; deployment readiness remains false.',
  'Indirect identity/unit history, documented backfills and operational performance remain open.',
  'Automated accessibility and browser samples do not verify a real screen reader or other surfaces.',
  'Historical PERSONAL/HTTP suites and old failing mock suites were not rerun in this batch.',
 ],
};
fs.writeFileSync(`${folder}/verificacoes-integridade-agregacao.json`, JSON.stringify(manifest, null, 2) + '\n');
const additions = {
 '011': 'Lote de integridade: 35 relações declaradas GYM protegidas no banco, imutabilidade de workspace em 48 tabelas e de tenant herdado em três tabelas. Trocas para PERSONAL são recusadas e relações somente PERSONAL preservadas. Preflight e DDL atômicos, sem reescrever legado. Restam identidade/referências indiretas, histórico documentado e implantação.',
 '036': 'Financeiro e aging agora agregam no PostgreSQL, conservando centavos, períodos de reversão e parcelas por unidade. Histórico sem vínculos/recibos individuais é identificado no contrato e na UI; não é declarado completo. Amostra de 5.000 faturas e 1.000 recebimentos conferida. Contratos/histórico e desempenho operacional continuam pendentes.',
 '046': 'Migração aditiva incluída na cadeia explícita da baseline e espelhada na cadeia histórica, sem alterar a baseline anterior. Instalação fresca/repetida, status/diff e rollback de preflight tardio aprovados. Inventário real somente em leitura: 33 relações sem divergência e duas dependentes do schema futuro. readyToMigrate continua false.',
 '050': 'Retomada conferiu 295 integrações PostgreSQL completas sem falhas/skips, schema/TypeScript, implantação local de integridade e Chrome focal. Esse lote não substitui a suíte antiga de mocks, PERSONAL/HTTP históricos nem a homologação das outras superfícies.',
 '051': 'Configuração global conferida em quatro combinações (390/1280 pixels, claro/escuro), sem violações automáticas/overflow; nomes acessíveis, teclado, contraste e foco ao fechar notificações verificados. Chrome dos relatórios passou em duas larguras. Leitor de tela real e demais superfícies permanecem pendentes.',
 '052': 'Somatórios financeiros e aging saíram da hidratação de faturas/recibos para agregações no banco. Uma amostra sintética de 5.000 faturas e 1.000 recebimentos passou. Histórico de contratos, paginação restante, índices e medição operacional continuam abertos.',
};
const states = read(`${folder}/tratamento.json`);
const marker = '09/10/2026 — integridade/agregação/acessibilidade:';
const validation = `${marker} ${integration.passed} integrações completas/0 falhas/0 skips; tenant ${tenant.passed}/0; relatórios ${reports.passed}/0; deploy fresco/repetido/status/diff e TypeScript exit 0; configuração global 4 amostras Chrome/axe e relatórios 2 larguras/HTTP focal. Manifesto verificacoes-integridade-agregacao.json. Achados compostos permanecem abertos.`;
for (const [id, correction] of Object.entries(additions)) {
 const state = states[`GYM-AUD-${id}`];
 if (!state.correction.includes(correction)) state.correction += ' ' + correction;
 state.validation = [...state.validation.filter(text => !text.startsWith(marker)), validation];
 state.files = [...new Set([...state.files, ...files.filter(file => !file.endsWith('.png')), `${folder}/verificacoes-integridade-agregacao.json`])];
}
fs.writeFileSync(`${folder}/tratamento.json`, JSON.stringify(states, null, 2) + '\n');
for (const script of ['scripts/gym-stabilization-report.cjs', 'scripts/gym-remaining-report.cjs']) {
 const result = spawnSync(process.execPath, [script], { stdio: 'inherit', windowsHide: true }); assert.equal(result.status, 0);
}
console.log(JSON.stringify({ success: true, integration: integration.passed, tenant: tenant.passed, reports: reports.passed, configuredReadyToMigrate: preflight.readyToMigrate }));
