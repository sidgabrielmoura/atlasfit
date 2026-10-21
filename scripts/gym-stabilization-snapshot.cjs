const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = process.cwd();
const destination = path.join(root, 'docs/audits/academias/estabilizacao');
fs.mkdirSync(destination, { recursive: true });
const snapshotPath = path.join(destination, 'estado-inicial.json');
if (fs.existsSync(snapshotPath)) throw new Error('O snapshot inicial já existe; não será sobrescrito.');
const files = execFileSync('rg', ['--files', '--hidden', '-g', '!node_modules', '-g', '!.git', '-g', '!.next', '-g', '!.tmp'], { encoding: 'utf8' }).trim().split(/\r?\n/);
const hashes = {};
for (const file of files) {
  const buffer = fs.readFileSync(path.join(root, file));
  hashes[file.replaceAll('\\', '/')] = crypto.createHash('sha256').update(buffer).digest('hex');
}
fs.writeFileSync(snapshotPath, JSON.stringify({ capturedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), status: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }), hashes }, null, 2));
console.log(`Snapshot salvo: ${files.length} arquivos; nenhum dado de ambiente incluído.`);
