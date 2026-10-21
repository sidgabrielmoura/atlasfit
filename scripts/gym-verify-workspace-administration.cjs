const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const startedAt = new Date().toISOString();
const args = ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'];
const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
fs.writeFileSync('docs/audits/academias/estabilizacao/typecheck-administracao-workspace.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), command: ['node', ...args].join(' '), exitCode: result.status, output: result.stdout + result.stderr }, null, 2) + '\n');
process.stdout.write(result.stdout); process.stderr.write(result.stderr);
console.log(`TypeScript administração de workspace: exit ${result.status}.`);
process.exitCode = result.status ?? 1;
