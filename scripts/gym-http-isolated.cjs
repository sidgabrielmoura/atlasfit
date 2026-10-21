const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const isolated = path.join(root, '.tmp', 'gym-http-app');
if (!isolated.startsWith(root + path.sep) || (fs.existsSync(isolated) && fs.readdirSync(isolated).some(file => file === '.env' || file.startsWith('.env.')))) throw new Error('Destino isolado inválido ou contém configuração externa.');
fs.mkdirSync(isolated, { recursive: true });
function changed(source, destination) {
 if (fs.statSync(source).isDirectory()) return true;
 return !fs.existsSync(destination) || fs.statSync(source).size !== fs.statSync(destination).size || !fs.readFileSync(source).equals(fs.readFileSync(destination));
}
for (const directory of ['src', 'public', 'prisma']) fs.cpSync(path.join(root, directory), path.join(isolated, directory), { recursive: true, filter: changed });
for (const file of ['package.json', 'tsconfig.json', 'postcss.config.mjs']) if (changed(path.join(root, file), path.join(isolated, file))) fs.copyFileSync(path.join(root, file), path.join(isolated, file));
const configuration = fs.readFileSync(path.join(root, 'next.config.ts'), 'utf8');
const marker = 'const nextConfig: NextConfig = {';
if (!configuration.includes(marker)) throw new Error('Configuração Next alterada: revisar as otimizações exclusivas do ambiente HTTP.');
const isolatedConfiguration = configuration.replace(marker, `${marker}\n  experimental: { webpackMemoryOptimizations: true },\n  onDemandEntries: { maxInactiveAge: 300000, pagesBufferLength: 30 },`);
const configurationPath = path.join(isolated, 'next.config.ts');
if (!fs.existsSync(configurationPath) || fs.readFileSync(configurationPath, 'utf8') !== isolatedConfiguration) fs.writeFileSync(configurationPath, isolatedConfiguration);
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
Object.assign(env, {
 DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001',
 AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', AUTH_URL: 'http://127.0.0.1:31173',
 NEXTAUTH_URL: 'http://127.0.0.1:31173', AUTH_TRUST_HOST: 'true', NEXT_TELEMETRY_DISABLED: '1',
 NODE_ENV: 'development', ABLY_API_KEY: '', RESEND_API_KEY: '', ASAAS_API_KEY: '',
 ASAAS_WEBHOOK_SECRET: 'synthetic-http-webhook-secret', ASAAS_ENVIRONMENT: 'sandbox',
 NODE_OPTIONS: '--max-old-space-size=8192',
});
// Explicit opt-in passes only storage credentials. The database, authentication
// and every messaging/payment provider remain isolated.
if (process.argv.includes('--r2')) {
 const configured = require('dotenv').parse(fs.readFileSync(path.join(root, '.env')));
 const keys = ['CLOUDFLARE_ID_TOKEN_ACCESS', 'CLOUDFLARE_TOKEN_VALUE', 'CLOUDFLARE_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET'];
 if (!(configured.CLOUDFLARE_ID_TOKEN_ACCESS || configured.CLOUDFLARE_TOKEN_VALUE) || !configured.CLOUDFLARE_SECRET_ACCESS_KEY) throw new Error('Credenciais R2 indisponíveis.');
 for (const key of keys) if (configured[key]) env[key] = configured[key];
 console.log('R2 real habilitado apenas para objetos sintéticos da jornada HTTP.');
}
const next = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const logs = path.join(root, '.tmp', 'gym-stabilization');
fs.mkdirSync(logs, { recursive: true });
const logPath = path.join(logs, `http-server-${Date.now()}.log`);
const output = fs.createWriteStream(logPath, { flags: 'wx' });
console.log(`Servidor HTTP isolado; React Compiler preservado; Node sem --enable-source-maps. Log: ${path.relative(root, logPath)}`);
const child = spawn(process.execPath, [next, 'dev', '--webpack', '--disable-source-maps', '--hostname', '127.0.0.1', '--port', '31173'], { cwd: isolated, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
 output.write(chunk);
 const lines = chunk.toString().split(/\r?\n/).filter(line => /Ready in|Restarting|restart|heap|Error:|EADDRINUSE/.test(line));
 if (lines.length) console.log(lines.join('\n'));
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { output.end(); process.exitCode = code ?? 1; });
