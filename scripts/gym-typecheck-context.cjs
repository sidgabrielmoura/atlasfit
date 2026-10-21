const fs = require('node:fs'), { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', '--tsBuildInfoFile', '.tmp/gym-stabilization/typecheck-advanced.tsbuildinfo', '--pretty', 'false'], { encoding: 'utf8', windowsHide: true, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
const report = { recordedAt: new Date().toISOString(), exitCode: result.status ?? 1, output: result.stdout + result.stderr };
fs.writeFileSync('docs/audits/academias/estabilizacao/typecheck-contexto-final.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report)); process.exitCode = report.exitCode;
