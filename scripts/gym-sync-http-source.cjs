const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const isolated = path.resolve(root, '.tmp/gym-http-app');
if (!isolated.startsWith(root + path.sep) || fs.readdirSync(isolated).some(file => file === '.env' || file.startsWith('.env.'))) throw new Error('Cópia HTTP não isolada.');
let changed = 0;
// Remove only stale sources in our own isolated copy, after checking both roots.
const sourceRoot = path.resolve(root, 'src');
const targetRoot = path.resolve(isolated, 'src');
if (!targetRoot.startsWith(isolated + path.sep) || !sourceRoot.startsWith(root + path.sep)) throw new Error('Invalid source roots');
function prune(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const destination = path.resolve(directory, entry.name);
    if (!destination.startsWith(targetRoot + path.sep) || entry.isSymbolicLink()) throw new Error('Unexpected isolated source');
    const source = path.join(sourceRoot, path.relative(targetRoot, destination));
    if (entry.isDirectory()) { prune(destination); if (!fs.existsSync(source) && fs.readdirSync(destination).length === 0) fs.rmdirSync(destination); }
    else if (!fs.existsSync(source)) { fs.unlinkSync(destination); changed++; }
  }
}
prune(targetRoot);
fs.cpSync(path.join(root, 'src'), path.join(isolated, 'src'), { recursive: true, filter: (source, destination) => {
  if (fs.statSync(source).isDirectory()) return true;
  if (fs.existsSync(destination) && fs.statSync(source).size === fs.statSync(destination).size && fs.readFileSync(source).equals(fs.readFileSync(destination))) return false;
  changed++; return true;
} });
console.log(`${changed} fontes alteradas sincronizadas; arquivos idênticos preservados para evitar recompilação integral.`);
