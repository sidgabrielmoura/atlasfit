const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/components/auth/actions.ts';
let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'resetPassword');
if (!node?.body) throw new Error('Missing resetPassword');
const body = `{
  const ipHeaders = await headers();
  const ip = ipHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "unknown";
  if (!(await rateLimit(\`reset-execute-ip:\${ip}\`, 5, 600000)).success) return { error: "Muitas tentativas de redefinição. Tente novamente mais tarde." };
  try { return await completePasswordReset({ token, password: passwordStr, ip }); }
  catch { return { error: "Erro interno ao redefinir a senha. Tente novamente." }; }
}`;
source = source.slice(0, node.body.getStart(ast)) + body + source.slice(node.body.end);
const declaration = 'import { completePasswordReset } from "@/lib/auth/password-reset-service";';
if (!source.includes(declaration)) source = source.replace('"use server";', '"use server";\n\n' + declaration);
fs.writeFileSync(file, source);
