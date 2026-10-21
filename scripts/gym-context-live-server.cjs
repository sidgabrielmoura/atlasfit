const fs = require('node:fs'), { spawn } = require('node:child_process');
(async () => {
  try { await fetch('http://127.0.0.1:31173/api/auth/session', { signal: AbortSignal.timeout(2000) }); throw new Error('Preserve existing server on port 31173.'); }
  catch (error) { if (error.message.includes('Preserve')) throw error; }
  const server = spawn(process.execPath, ['scripts/gym-http-isolated.cjs'], { stdio: 'inherit', windowsHide: true });
  fs.writeFileSync('.tmp/gym-stabilization/context-owned-server.json', JSON.stringify({ pid: server.pid, parentPid: process.pid, cwd: process.cwd(), startedAt: new Date().toISOString(), origin: 'http://127.0.0.1:31173' }, null, 2));
  server.on('exit', code => { process.exitCode = code ?? 1; });
})().catch(error => { console.error(error.message); process.exitCode = 1; });
