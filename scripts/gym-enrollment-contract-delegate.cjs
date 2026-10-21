const fs = require('node:fs'); const ts = require('typescript');
const file = 'src/modules/workspaces/application/enrollment-service.ts'; let code = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS); let target;
function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(source) === 'acceptContract') target = node; ts.forEachChild(node, visit); }
visit(source); if (!target) throw Error('Método de contrato não identificado.');
code = code.slice(0, target.getStart(source)) + 'async acceptContract(input: AcceptContractInput) { return acceptGymContract(input); }' + code.slice(target.end);
if (!code.includes('import { acceptGymContract }')) code = 'import { acceptGymContract } from "./enrollment-contract";\n' + code;
fs.writeFileSync(file, code);
