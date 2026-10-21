const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const folder = '.tmp/gym-stabilization';
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, { DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', GYM_HTTP_ORIGIN: 'http://127.0.0.1:31173', ABLY_API_KEY: '', RESEND_API_KEY: '', ASAAS_API_KEY: '' });
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const resultPath = 'docs/audits/academias/estabilizacao/verificacoes-http-lotes.json';
const historyPath = `${folder}/http-lotes-${Date.now()}-summary.json`;
const summary = { startedAt: new Date().toISOString(), success: false, selected: [], batches: [], passed: 0, failed: 0 };
function save() {
  fs.mkdirSync(folder, { recursive: true });
  const rendered = JSON.stringify(summary, null, 2) + '\n';
  fs.writeFileSync(resultPath, rendered); fs.writeFileSync(historyPath, rendered);
}
async function startServer() {
  try { await fetch(env.GYM_HTTP_ORIGIN + '/api/auth/session', { signal: AbortSignal.timeout(2000) }); throw new Error('Port 31173 is occupied; preserve the existing server and inspect its owner.'); }
  catch (error) { if (error.message?.includes('occupied')) throw error; }
  const server = spawn(process.execPath, ['scripts/gym-http-isolated.cjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '', stopped = false;
  server.on('exit', () => { stopped = true; });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-20_000); });
  for (let count = 0; count < 120; count++) {
    if (stopped) throw new Error(`Isolated server exited: ${output.slice(-1200)}`);
    if (/Ready in/.test(output)) return server;
    await delay(1000);
  }
  spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  throw new Error('Isolated server readiness timed out.');
}
(async () => {
  const listed = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'list', '--config', 'vitest.gym-http.config.ts', '--json'], { env, encoding: 'utf8' });
  assert.equal(listed.status, 0, listed.stderr.slice(0, 1000));
  const tasks = JSON.parse(listed.stdout);
  // Vitest list separates ancestors with " > "; testNamePattern uses spaces.
  const names = tasks.map(task => typeof task.name === 'string' ? task.name.replaceAll(' > ', ' ') : task.name);
  assert(names.length > 0 && names.every(name => typeof name === 'string'), 'Unexpected Vitest list output.');
  assert.equal(new Set(names).size, names.length, 'Test names must be unique.');
  const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
  const selected = filter ? names.filter(name => filter.test(name)) : names;
  assert(selected.length > 0, 'No HTTP tests selected.');
  summary.selected = selected;
  fs.mkdirSync(folder, { recursive: true });
  for (let offset = 0; offset < selected.length; offset += 4) {
    const batch = selected.slice(offset, offset + 4);
    const rawFile = `${folder}/http-batch-${Date.now()}-${offset}.json`;
    const server = await startServer();
    try {
      const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.gym-http.config.ts', '-t', `^(?:${batch.map(escape).join('|')})$`, '--reporter=json', `--outputFile=${rawFile}`], { env, stdio: 'inherit', windowsHide: true });
      const result = { status: await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); }) };
      assert(fs.existsSync(rawFile), 'HTTP report missing.');
      const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
      const executed = raw.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status !== 'skipped' && test.status !== 'pending'));
      summary.passed += raw.numPassedTests; summary.failed += raw.numFailedTests;
      summary.batches.push({ selected: batch, rawFile, exitCode: result.status, passed: raw.numPassedTests, failed: raw.numFailedTests, skipped: raw.numPendingTests, failures: executed.filter(test => test.status === 'failed').map(test => ({ name: test.fullName, messages: test.failureMessages })) });
      save();
      assert.equal(executed.length, batch.length, 'Filtered HTTP batch did not execute every selected test.');
      console.log(`HTTP lote ${summary.batches.length}: ${raw.numPassedTests} passaram, ${raw.numFailedTests} falharam.`);
    } finally {
      // This exact process was spawned above and belongs to this test batch.
      spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      await delay(1500);
    }
  }
  summary.finishedAt = new Date().toISOString();
  summary.success = summary.failed === 0 && summary.passed === selected.length;
  save();
  console.log(JSON.stringify({ success: summary.success, passed: summary.passed, failed: summary.failed, selected: selected.length }));
  process.exitCode = summary.success ? 0 : 1;
})().catch(error => { summary.error = error.message; save(); console.error(error.message); process.exitCode = 1; });
