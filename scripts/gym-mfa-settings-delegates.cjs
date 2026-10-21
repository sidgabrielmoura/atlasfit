const fs = require('node:fs');
const ts = require('typescript');
const root = 'src/app/api/superadmin/security/totp/';
const changes = [
 ['verify/route.ts', 'POST', '{ operation: "PAIR", secret: body.secret, token: body.token }'],
 ['devices/route.ts', 'POST', '{ operation: "PAIR", secret: body.secret, token: body.token, deviceName: body.deviceName }'],
 ['disable/route.ts', 'POST', '{ operation: "DISABLE" }'],
 ['toggle-3fa/route.ts', 'POST', '{ operation: "THREE_FACTOR", enabled: body.enabled }'],
 ['devices/[id]/route.ts', 'DELETE', '{ operation: "REMOVE", deviceId: (await params).id }'],
];
for (const [relative, method, input] of changes) {
 const file = root + relative;
 let source = fs.readFileSync(file, 'utf8');
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
 const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === method);
 if (!fn?.body) throw new Error(`Missing ${file}:${method}`);
 const body = `{
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id || session.user.sessionVersion === undefined) return NextResponse.json({ error: "Acesso negado. Entre novamente." }, { status: 403 });
  try {
    ${relative === 'devices/[id]/route.ts' || relative === 'disable/route.ts' ? '' : 'const body = await req.json();'}
    return NextResponse.json(await mutateMfaSettings(session.user.id, session.user.sessionVersion, ${input}));
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível salvar a configuração MFA." }, { status: 500 });
  }
 }`;
 source = source.slice(0, fn.body.getStart(ast)) + body + source.slice(fn.body.end);
 const declaration = 'import { mutateMfaSettings } from "@/lib/auth/mfa-settings-service";\nimport { WorkspaceAccessError } from "@/modules/workspaces/domain/types";';
 if (!source.includes('import { mutateMfaSettings }')) source = declaration + '\n' + source;
 fs.writeFileSync(file, source);
}
