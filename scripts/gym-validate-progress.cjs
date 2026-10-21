const fs = require('node:fs');
const path = require('node:path');
const folder = 'docs/audits/academias/estabilizacao';
const states = JSON.parse(fs.readFileSync(`${folder}/tratamento.json`, 'utf8'));
const expected = Array.from({ length: 65 }, (_, index) => `GYM-AUD-${String(index + 1).padStart(3, '0')}`);
if (Object.keys(states).length !== 65 || expected.some(id => !states[id])) throw Error('Catálogo incompleto ou IDs alterados.');
const rendered = fs.readFileSync(`${folder}/tratamento-achados.md`, 'utf8');
if (expected.some(id => !rendered.includes(`## ${id}`))) throw Error('Achado não renderizado.');
const missing = [...new Set(Object.values(states).flatMap(state => state.files).filter(file => !fs.existsSync(file)))];
for (const file of missing) console.log(`Referência não localizada: ${file}`);
let links = 0;
for (const file of [path.resolve(folder, '..', 'estabilizacao-modulo-academias.md'), ...fs.readdirSync(folder).filter(file => file.endsWith('.md')).map(file => path.join(folder, file))]) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1]; if (target.startsWith('http') || target.startsWith('#') || target.includes(' ')) continue;
    const local = path.resolve(path.dirname(file), target.split('#')[0]);
    if (!fs.existsSync(local)) throw Error(`Link ausente em ${file}: ${target}`);
    links++;
  }
}
const counts = {};
for (const state of Object.values(states)) counts[state.state] = (counts[state.state] || 0) + 1;
console.log(JSON.stringify({ achados: expected.length, estados: counts, linksVerificados: links, referenciasAusentes: missing.length }));
if (missing.length) process.exitCode = 1;
