const fs = require('node:fs'); const ts = require('typescript');
const file = 'src/modules/workspaces/application/gym-import-service.ts';
let source = fs.readFileSync(file, 'utf8'); const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const replacements = [];
const bodies = {
 previewImport: '\n    return previewGymImport(input);\n  ',
 commitImport: '\n    return commitGymImport(input);\n  ',
 parseCurrencyToCents: '\n    const amount = valStr ? parseBrlCents(valStr) : 0;\n    if (amount === null) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Valor monetário inválido.");\n    return amount;\n  ',
 generateSampleCsv: '\n    return "\\uFEFF" + ["Nome", "Email", "Telefone", "CPF", "Data_Nascimento", "Matricula", "Plano", "Valor_Mensalidade", "Data_Inicio", "Data_Termino", "Saldo_Devedor", "Vencimento_Saldo", "Saldo_Credor", "Cartao_Acesso", "Responsavel_Nome", "Responsavel_CPF", "Responsavel_Telefone", "Parentesco"].join(";") + "\\r\\n";\n  ',
};
function walk(node) { if (ts.isMethodDeclaration(node) && node.body && Object.hasOwn(bodies, node.name.getText(ast))) replacements.push({ start: node.body.getStart(ast)+1, end: node.body.end-1, body: bodies[node.name.getText(ast)] }); ts.forEachChild(node, walk); }
walk(ast); if (replacements.length !== 4) throw Error('Esperava exatamente os quatro métodos GYM.');
for (const r of replacements.sort((a,b)=>b.start-a.start)) source = source.slice(0,r.start)+r.body+source.slice(r.end);
const firstInterface = source.indexOf('export interface');
source = 'import { previewGymImport, commitGymImport } from "./gym-import-commands";\nimport { parseBrlCents } from "../domain/currency-input";\nimport { WorkspaceAccessError } from "../domain/types";\n\n' + source.slice(firstInterface);
fs.writeFileSync(file, source);
console.log('Importação delegada a comandos com prévia persistida.');
