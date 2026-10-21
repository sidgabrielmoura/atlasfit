const { spawn, spawnSync } = require('node:child_process');
const run = require('./gym-check-runner.cjs');
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, { DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', NEXT_TELEMETRY_DISABLED: '1', ABLY_API_KEY: '', RESEND_API_KEY: '', ASAAS_API_KEY: '' });
let server;
(async () => {
  try { await fetch('http://127.0.0.1:31173/api/auth/session', { signal: AbortSignal.timeout(2000) }); throw new Error('Preserve the existing server on port 31173.'); }
  catch (error) { if (error.message?.includes('Preserve')) throw error; }
  run('configuration-browser-fixture', ['--config', 'vitest.gym-configuration-browser.config.ts']);
  if (process.exitCode) return;
  server = spawn(process.execPath, ['scripts/gym-http-isolated.cjs'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '', exited = false; server.on('exit', () => { exited = true; });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-5000); });
  const limit = Date.now() + 120_000;
  while (!/Ready in/.test(output)) {
    if (exited || Date.now() > limit) throw new Error('Isolated application not ready: ' + output.slice(-500));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // Keep draining the development server pipes while Chrome runs. spawnSync blocks
  // these readers and can stall chunk compilation once the output buffer fills.
  const browserCheck = spawn(process.execPath, ['scripts/gym-configuration-browser.cjs'], { env, stdio: 'inherit', windowsHide: true });
  process.exitCode = await new Promise((resolve, reject) => {
    browserCheck.once('error', reject);
    browserCheck.once('exit', code => resolve(code ?? 1));
  });
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => {
  if (server) spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
});
