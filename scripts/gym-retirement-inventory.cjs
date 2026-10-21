const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'docs/audits/academias/estabilizacao');
const directories = [
 'src/app/(gym)/gym/crm', 'src/app/(gym)/gym/classes', 'src/app/(gym)/gym/access',
 'src/app/api/gym/crm', 'src/app/api/gym/classes', 'src/app/api/gym/access', 'src/app/api/gym/devices', 'src/app/api/gym/biometrics',
 'src/app/api/gym/operations', 'src/app/api/gym/pilot', 'src/app/api/gym/reception/feed', 'src/app/api/gym/enrollments/check-access',
 'src/app/api/student/classes', 'src/app/api/guardian/dependents/[id]/classes',
];
const filenames = [
 'booking-mutations.ts', 'control-id-adapter.ts', 'gym-access-policy-service.ts', 'gym-biometrics-service.ts',
 'gym-booking-service.ts', 'gym-class-service.ts', 'gym-crm-service.ts', 'gym-crm-conversion.ts',
 'gym-device-service.ts', 'gym-device-commands.ts', 'gym-device-recovery-commands.ts', 'gym-credential-commands.ts',
 'gym-offline-reconciliation-service.ts', 'gym-recovery-service.ts', 'gym-pilot-readiness-service.ts',
 'device-agent-http.ts', 'device-command-dto.ts', 'device-event-context.ts',
];
const files = filenames.map(name => `src/modules/workspaces/application/${name}`).concat([
 'src/modules/workspaces/domain/access-evaluation-contract.ts', 'src/modules/workspaces/domain/device-command-contract.ts', 'src/modules/workspaces/domain/device-event-contract.ts',
 'tests/gym/access-evaluation.integration.ts', 'tests/gym/device-commands.integration.ts', 'tests/gym/device-recovery.integration.ts',
]);
function inside(relative) {
 const resolved = path.resolve(root, relative);
 if (!resolved.startsWith(root + path.sep) || resolved === root) throw Error(`Path outside workspace: ${relative}`);
 return resolved;
}
function walk(relative) {
 const absolute = inside(relative); if (!fs.existsSync(absolute)) return [];
 if (fs.statSync(absolute).isFile()) return [relative.replaceAll('\\', '/')];
 return fs.readdirSync(absolute).flatMap(name => walk(path.join(relative, name)));
}
const targets = [...new Set([...directories.flatMap(walk), ...files.flatMap(walk)])].sort();
const snapshotFile = path.join(folder, 'snapshot-antes-retirada-modulos.json');
if (!fs.existsSync(snapshotFile)) fs.writeFileSync(snapshotFile, JSON.stringify({ createdAt: new Date().toISOString(), reason: 'Retirada explícita pelo usuário de CRM GYM, aulas GYM e hardware; sem alterações no banco.', files: targets.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(inside(file))).digest('hex') })) }, null, 2));
const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
for (const file of targets) {
 const bytes = fs.readFileSync(inside(file));
 const expected = snapshot.files.find(item => item.file === file);
 if (!expected || expected.sha256 !== crypto.createHash('sha256').update(bytes).digest('hex')) throw Error(`Source changed after snapshot: ${file}`);
 const backup = inside(path.join('.tmp/gym-retired-sources', file));
 fs.mkdirSync(path.dirname(backup), { recursive: true });
 if (!fs.existsSync(backup)) fs.writeFileSync(backup, bytes);
}
const manifest = { directories, files, targets };
fs.writeFileSync(path.join(folder, 'retirada-modulos-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Inventário de retirada: ${targets.length} arquivos; snapshot e cópia local fora da aplicação preservados. Nenhum arquivo removido.`);
