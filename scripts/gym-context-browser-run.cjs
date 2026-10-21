const { spawn, spawnSync } = require('node:child_process'), run = require('./gym-check-runner.cjs');
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, { DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', NEXT_TELEMETRY_DISABLED: '1', ABLY_API_KEY: '', RESEND_API_KEY: '', ASAAS_API_KEY: '' });
let server;
(async () => {
  try { await fetch('http://127.0.0.1:31173/api/auth/session', { signal: AbortSignal.timeout(2000) }); throw new Error('Preserve existing server on port 31173.'); } catch (error) { if (error.message?.includes('Preserve')) throw error; }
  run('context-browser-fixture', ['--config', 'vitest.gym-context-browser.config.ts']); if (process.exitCode) return;
  server = spawn(process.execPath, ['scripts/gym-http-isolated.cjs'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '', exited = false; server.on('exit', () => { exited = true; }); for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-5000); });
  const limit = Date.now() + 120000; while (!/Ready in/.test(output)) { if (exited || Date.now() > limit) throw new Error('Application readiness failed: ' + output.slice(-500)); await new Promise(resolve => setTimeout(resolve, 500)); }
  const child = spawn(process.execPath, ['scripts/gym-context-browser.cjs'], { env, stdio: 'inherit', windowsHide: true }); process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => { if (server) spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); });
