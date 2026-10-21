const fs = require('node:fs');
const findings = JSON.parse(fs.readFileSync('docs/audits/academias/achados.json', 'utf8'));
for (const finding of findings.filter(item => process.argv.slice(2).includes(item.id.slice(-3)))) console.log(JSON.stringify({ id: finding.id, title: finding.title, evidence: finding.evidence.slice(0, 1000), dependencies: finding.dependencies }));
