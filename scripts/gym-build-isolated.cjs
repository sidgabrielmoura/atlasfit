const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, '.tmp', 'gym-final-build');
const evidence = path.join(root, 'docs/audits/academias/estabilizacao/verificacoes-final-build.json');
fs.mkdirSync(destination, { recursive: true });
if (fs.readdirSync(destination).some(file => file === '.env' || file.startsWith('.env.'))) {
  throw new Error('The isolated build directory contains external configuration.');
}
for (const directory of ['src', 'public', 'prisma']) {
  fs.cpSync(path.join(root, directory), path.join(destination, directory), { recursive: true });
}
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'prisma.config.ts']) {
  fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
if (!fs.existsSync(path.join(destination, 'node_modules'))) {
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(destination, 'node_modules'), 'junction');
}
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, {
  DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001',
  AUTH_SECRET: 'isolated-gym-test-secret-not-for-production',
  AUTH_URL: 'http://127.0.0.1:31173',
  NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: '--max-old-space-size=8192',
});
const report = {
  startedAt: new Date().toISOString(), configuredDatabaseChanged: false,
  externalCredentialsAvailable: false, success: false,
  scope: 'Production build with existing local dependencies and isolated configuration; clean installation is verified separately.',
};
const logPath = path.join(root, '.tmp/gym-stabilization/final-build.log');
fs.mkdirSync(path.dirname(logPath), { recursive: true });
const log = fs.openSync(logPath, 'w');
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build'], {
  cwd: destination, env, stdio: ['ignore', log, log], windowsHide: true,
});
child.on('error', error => { report.error = error.code || error.message; });
child.on('close', code => {
  report.exitCode = code; report.success = code === 0; report.finishedAt = new Date().toISOString();
  fs.closeSync(log);
  fs.writeFileSync(evidence, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  process.exitCode = code ?? 1;
});
console.log('Production build started with isolated configuration. Log: .tmp/gym-stabilization/final-build.log');
