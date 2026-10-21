const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');

module.exports = function runGymCheck(label, args, additions = {}) {
 const folder = '.tmp/gym-stabilization'; fs.mkdirSync(folder, { recursive: true });
 const rawFile = `${folder}/${label}-${randomUUID()}-raw.json`;
 const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
 const env = Object.fromEntries(allowed.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
 Object.assign(env, { DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', ABLY_API_KEY: '', RESEND_API_KEY: '', ASAAS_API_KEY: '', AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', NEXT_TELEMETRY_DISABLED: '1' }, additions);
 const startedAt = new Date().toISOString();
 const cli = ['node_modules/vitest/vitest.mjs', 'run', ...args, '--reporter=json', `--outputFile=${rawFile}`];
 const result = spawnSync(process.execPath, cli, { env, stdio: 'inherit' });
 if (fs.existsSync(rawFile)) {
  const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  const assertions = raw.testResults.flatMap(file => file.assertionResults.map(test => ({ file: path.relative(process.cwd(), file.name).replaceAll('\\', '/'), name: test.fullName, status: test.status, durationMs: test.duration })));
  const reportFile = 'docs/audits/academias/estabilizacao/verificacoes-isoladas.json';
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  report[label] = { startedAt, finishedAt: new Date().toISOString(), command: ['node', ...cli].join(' '), exitCode: result.status, passed: raw.numPassedTests, failed: raw.numFailedTests, skipped: raw.numPendingTests, suites: raw.numTotalTestSuites, success: raw.success === true && result.status === 0, rawFile, suiteErrors: raw.testResults.filter(file => file.status === 'failed').map(file => ({ file: path.relative(process.cwd(), file.name).replaceAll('\\', '/'), message: file.message })), assertions };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`${label}: ${raw.numPassedTests} passaram, ${raw.numFailedTests} falharam, ${raw.numPendingTests} pendentes. Exit ${result.status}.`);
  const failures = assertions.filter(test => test.status === 'failed');
  for (const test of failures.slice(0, 10)) console.log(`${test.status}: ${test.file} :: ${test.name}`);
  if (failures.length > 10) console.log(`Mais ${failures.length - 10} falhas constam integralmente no artefato ${reportFile}.`);
  if (raw.numPendingTests) console.log(`${raw.numPendingTests} casos não executados constam no artefato; filtros de execução não verificam esses casos.`);
 }
 process.exitCode = result.status ?? 1;
};
