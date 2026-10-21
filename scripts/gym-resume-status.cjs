const fs = require('node:fs');
const report = JSON.parse(fs.readFileSync('docs/audits/academias/estabilizacao/verificacoes-isoladas.json', 'utf8'));
for (const key of ['integracao-entregas-completa', 'http-completo-entregas', 'servicos-externos']) {
  const check = report[key];
  console.log(JSON.stringify({ key, available: !!check, passed: check?.passed, failed: check?.failed, success: check?.success, finishedAt: check?.finishedAt, rawFile: check?.rawFile }));
  if (process.argv.includes('--failures') && check?.failed) {
    const raw = JSON.parse(fs.readFileSync(check.rawFile, 'utf8'));
    for (const suite of raw.testResults) for (const test of suite.assertionResults) if (test.status === 'failed') console.log(JSON.stringify({ name: test.fullName, messages: test.failureMessages.map(message => message.slice(0, 1600).replace(/token=[a-f0-9]+/g, 'token=[redacted]')) }));
  }
}
const log = '.tmp/gym-stabilization/http-server-1791389003381.log';
if (process.argv.includes('--batches')) {
  const summary = JSON.parse(fs.readFileSync('docs/audits/academias/estabilizacao/verificacoes-http-lotes.json', 'utf8'));
  console.log(JSON.stringify(summary));
  const files = fs.readdirSync('.tmp/gym-stabilization').filter(name => name.startsWith('http-batch-')).sort();
  if (files.length) {
    const raw = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/' + files.at(-1), 'utf8'));
    console.log(JSON.stringify(raw.testResults.flatMap(suite => suite.assertionResults.map(test => ({ name: test.fullName, status: test.status }))).slice(0, 14)));
  }
}
if (fs.existsSync(log)) console.log(fs.readFileSync(log, 'utf8').split('\n').slice(-12).join('\n').replace(/token=[a-f0-9]+/g, 'token=[redacted]'));
