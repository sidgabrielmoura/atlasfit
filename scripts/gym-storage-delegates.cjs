const fs = require('node:fs');
const ts = require('typescript');
for (const [file, method, delegate] of [
  ['src/app/api/storage/presigned/route.ts', 'POST', 'createStorageUpload'],
  ['src/app/api/storage/file/route.ts', 'GET', 'serveStorageFile'],
]) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const functions = ast.statements.filter(s => ts.isFunctionDeclaration(s) && s.name?.text === method);
  if (functions.length !== 1) throw new Error(`Handler inesperado: ${file}`);
  // The entire prior handler was inspected; replace its imports/constants with the shared handler.
  fs.writeFileSync(file, `import { ${delegate} } from "@/lib/storage-http";\n\nexport async function ${method}(req: Request) { return ${delegate}(req); }\n`);
}
