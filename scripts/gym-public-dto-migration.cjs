const fs = require('node:fs');
const ts = require('typescript');
const dir = 'src/modules/workspaces/application';
let count = 0;
for (const file of fs.readdirSync(dir).filter((file) => file.endsWith('.ts'))) {
  const target = `${dir}/${file}`;
  let source = fs.readFileSync(target, 'utf8');
  if (!/user:\s*true/.test(source)) continue;
  source = source.replace(/user:\s*true/g, 'user: { select: gymPublicUserSelect }');
  source = 'import { gymPublicUserSelect } from "../domain/public-user";\n' + source;
  fs.writeFileSync(target, source);
  count++;
}
const target = `${dir}/enrollment-service.ts`;
let source = fs.readFileSync(target, 'utf8');
const tree = ts.createSourceFile(target, source, ts.ScriptTarget.Latest, true);
const positions = [];
function visit(node) {
  if (ts.isCallExpression(node) && /\.gymEnrollment\.(findFirst|findUnique|findMany|create|update)$/.test(node.expression.getText(tree))) {
    const argument = node.arguments[0];
    if (argument && ts.isObjectLiteralExpression(argument) && !argument.properties.some((p) => p.name?.getText(tree) === 'omit')) positions.push(argument.getStart(tree) + 1);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
for (const position of positions.sort((a, b) => b - a)) source = source.slice(0, position) + '\n        omit: { creditCardToken: true },' + source.slice(position);
fs.writeFileSync(target, source);
console.log(`${count} serviços com seleção explícita; ${positions.length} consultas de matrícula sem token.`);
