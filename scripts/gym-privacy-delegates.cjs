const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/modules/workspaces/application/gym-offboarding-service.ts';
let source = fs.readFileSync(file, 'utf8');
for (const [method, body] of [['exportDataSubjectDossier','{ return exportGymDataSubject(input); }'], ['requestDataSubjectDeletion','{ return requestGymDataDeletion(input); }']]) {
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
 let found;
 function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === method) found = node; ts.forEachChild(node, visit); }
 visit(ast);
 if (!found?.body) throw new Error(`Missing ${method}`);
 source = source.slice(0, found.body.getStart(ast)) + body + source.slice(found.body.end);
}
source = 'import { exportGymDataSubject, requestGymDataDeletion } from "./privacy-service";\n' + source;
source = source.replace(/  \/\*\*\s*\* 5\. DIREITO À ELIMINAÇÃO[\s\S]*?\*\//, '  /** Records a pending local request; no global identity or historical data is erased. */');
fs.writeFileSync(file, source);
