const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const run = require('./gym-check-runner.cjs');
const configured = require('dotenv').parse(fs.readFileSync('.env'));
const keys = ['CLOUDFLARE_ID_TOKEN_ACCESS', 'CLOUDFLARE_TOKEN_VALUE', 'CLOUDFLARE_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET'];
const additions = Object.fromEntries(keys.filter(key => configured[key]).map(key => [key, configured[key]]));
if (!(additions.CLOUDFLARE_ID_TOKEN_ACCESS || additions.CLOUDFLARE_TOKEN_VALUE) || !additions.CLOUDFLARE_SECRET_ACCESS_KEY) throw Error('Credenciais R2 indisponíveis.');
const origin = 'http://127.0.0.1:31173';
let server;
(async () => {
 try {
  try { await fetch(origin + '/api/auth/csrf', { signal: AbortSignal.timeout(1000) }); throw Error('A porta isolada já está ocupada; não reutilizar servidor de configuração desconhecida.'); }
  catch (error) { if (error.message.startsWith('A porta')) throw error; }
  server = spawn(process.execPath, ['scripts/gym-http-isolated.cjs', '--r2'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  server.stdout.on('data', chunk => process.stdout.write(chunk));
  server.stderr.on('data', chunk => process.stderr.write(chunk));
  let ready = false;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
   if (server.exitCode !== null) throw Error('O servidor isolado encerrou antes da verificação.');
   try { const response = await fetch(origin + '/api/auth/csrf', { signal: AbortSignal.timeout(3000) }); if (response.ok) { ready = true; break; } }
   catch {}
   await delay(1000);
  }
  if (!ready) throw Error('Servidor HTTP isolado não ficou disponível.');
  run('r2-http-real', ['--config', 'vitest.r2-http.config.ts'], { ...additions, GYM_HTTP_ORIGIN: origin, GYM_R2_HTTP: 'synthetic-only-20261010' });
 } finally {
  if (server?.pid && server.exitCode === null) {
   if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
   else server.kill('SIGTERM');
  }
 }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
