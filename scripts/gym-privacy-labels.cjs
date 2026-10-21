const fs = require('node:fs');
for (const file of ['src/components/privacy/gym-privacy-requests.tsx', 'src/components/privacy/guardian-privacy-requests.tsx']) {
 const old = fs.readFileSync(file, 'utf8');
 const next = old.replace('"use client";', '"use client";\nimport { privacyTypeLabel, privacyStatusLabel } from "@/modules/workspaces/domain/privacy-labels";').replaceAll('{row.type}', '{privacyTypeLabel(row.type)}').replaceAll('{row.status}', '{privacyStatusLabel(row.status)}');
 fs.writeFileSync(file, next);
}
const file = 'scripts/gym-privacy-visual.cjs'; const old = fs.readFileSync(file, 'utf8'); fs.writeFileSync(file, old.replace("hasText: 'ACCESS'", "hasText: 'Acesso aos dados'").replace('row.getByText(/COMPLETED/)', 'row.getByText(/Concluído/)'));
