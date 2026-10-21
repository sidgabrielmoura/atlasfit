const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = 'docs/audits/academias/estabilizacao';
const states = JSON.parse(fs.readFileSync(`${root}/tratamento.json`, 'utf8'));
const checks = JSON.parse(fs.readFileSync(`${root}/verificacoes-isoladas.json`, 'utf8'));
const files = states['GYM-AUD-018'].files.filter(file => fs.existsSync(file) && (file.startsWith('src/') || file.startsWith('tests/') || file.startsWith('prisma/')));
const sourceHashes = Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const labels = ['report-scope', 'http-report-scope', 'finance-page', 'http-finance-page', 'invoice-retry'];
const relevantChecks = Object.fromEntries(labels.map(label => [label, checks[label]]));
const typecheck = JSON.parse(fs.readFileSync(`${root}/typecheck-financeiro-unidades.json`, 'utf8'));
const report = {
 recordedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
 environment: { database: 'atlasfit_gym_stabilization_20261001', host: '127.0.0.1', port: 56432, httpPort: 31173, productionInspected: false },
 sourceHashes, checks: relevantChecks, typecheck,
 limits: ['Não homologa navegador/mobile, R2, serviços externos, dados reais, scheduler ou produção.', 'Lotes focalizados não aprovam casos fora do filtro nem substituem a suíte antiga com falhas.', 'Hashes registram o checkout após o lote; resultados históricos conservam suas próprias datas.', 'Cadeia histórica de migrations e implantação continuam pendentes.'],
};
fs.writeFileSync(`${root}/verificacoes-relatorios-financeiro.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Fonte registrada: ${files.length} arquivos; TypeScript exit ${typecheck.exitCode}; resultados por lote preservados.`);
