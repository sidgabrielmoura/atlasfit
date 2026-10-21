const fs = require('node:fs');
const label = process.argv[2] || 'http';
const report = JSON.parse(fs.readFileSync('docs/audits/academias/estabilizacao/verificacoes-isoladas.json', 'utf8'));
const token = report[label]?.command.split(' ').find(value => value.startsWith('--outputFile='));
if (!token) throw Error('Execução não localizada.');
const raw = JSON.parse(fs.readFileSync(token.slice('--outputFile='.length), 'utf8'));
const failed = raw.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed').map(test => { const message = test.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, ''); return { file: suite.name, name: test.fullName, durationMs: test.duration, message: message.length <= 1000 ? message : `${message.slice(0, 250)}\n...\n${message.slice(-700)}` }; }));
for (const test of failed.slice(0, 12)) console.log(JSON.stringify(test));
console.log(`${failed.length} falhas; traces completos somente no artefato local isolado.`);
