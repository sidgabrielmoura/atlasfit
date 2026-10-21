const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, { DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', GYM_HTTP_ORIGIN: 'http://127.0.0.1:31173' });
let server;
(async () => {
  try { await fetch(env.GYM_HTTP_ORIGIN + '/api/auth/session', { signal: AbortSignal.timeout(2000) }); throw new Error('Preserve the existing server on port 31173.'); }
  catch (error) { if (error.message?.includes('Preserve')) throw error; }
  server = spawn(process.execPath, ['scripts/gym-production-isolated.cjs'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '', exited = false; server.on('exit', () => { exited = true; });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-20000); });
  const deadline = Date.now() + 120000;
  while (!/Ready in/.test(output)) { if (exited || Date.now() > deadline) throw new Error('Production app not ready: ' + output.slice(-1000)); await new Promise(resolve => setTimeout(resolve, 500)); }
  const rawFile = '.tmp/gym-stabilization/production-expense-' + Date.now() + '.json';
  const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.gym-http.config.ts', '-t', 'despesa manual percorre', '--reporter=json', '--outputFile=' + rawFile], { env, stdio: 'inherit', windowsHide: true });
  const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
  const raw = JSON.parse(fs.readFileSync(rawFile));
  const assertions = raw.testResults.flatMap(suite => suite.assertionResults.filter(item => item.status !== 'skipped' && item.status !== 'pending'));
  const report = { completedAt: new Date().toISOString(), appMode: 'production', configuredDatabaseChanged: false, rawFile, exitCode, success: exitCode === 0 && raw.numPassedTests === 1 && raw.numFailedTests === 0, assertions };
  fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-despesa-producao.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ success: report.success, passed: raw.numPassedTests, failed: raw.numFailedTests })); process.exitCode = report.success ? 0 : 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => { if (server) spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); });
