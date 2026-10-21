const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, '.tmp', `gym-clean-install-${randomUUID()}`);
fs.mkdirSync(destination, { recursive: true });
for (const file of ['package.json', 'package-lock.json', 'prisma.config.ts']) {
  fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
for (const directory of ['prisma', 'src/dataconnect-generated']) {
  fs.cpSync(path.join(root, directory), path.join(destination, directory), { recursive: true });
}
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, {
  DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001',
  AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', NEXT_TELEMETRY_DISABLED: '1',
});
const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!fs.existsSync(npm)) throw new Error('npm CLI is not available next to the Node executable.');
const report = {
  startedAt: new Date().toISOString(), command: 'npm ci --no-audit --no-fund',
  nodeVersion: process.version, platform: process.platform, cleanDirectory: path.relative(root, destination).replaceAll('\\', '/'),
  manifestSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'package.json'))).digest('hex'),
  lockSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'package-lock.json'))).digest('hex'),
  externalCredentialsAvailable: false, success: false,
  limitations: ['Local Windows installation; this does not verify installation on the publication host.'],
};
const logPath = path.join(root, '.tmp/gym-stabilization/final-install.log');
fs.mkdirSync(path.dirname(logPath), { recursive: true });
const log = fs.openSync(logPath, 'w');
const child = spawn(process.execPath, [npm, 'ci', '--no-audit', '--no-fund'], {
  cwd: destination, env, stdio: ['ignore', log, log], windowsHide: true,
});
child.on('error', error => { report.error = error.code || error.message; });
child.on('close', code => {
  report.exitCode = code; report.finishedAt = new Date().toISOString(); report.success = code === 0;
  fs.closeSync(log);
  fs.writeFileSync(path.join(root, 'docs/audits/academias/estabilizacao/verificacoes-final-install.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report)); process.exitCode = code ?? 1;
});
console.log('Clean npm installation started without external credentials. Log: .tmp/gym-stabilization/final-install.log');
