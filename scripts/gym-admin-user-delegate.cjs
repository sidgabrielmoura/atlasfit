const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/app/api/superadmin/users/[id]/route.ts';
let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'PATCH');
if (!node?.body) throw new Error('Missing PATCH');
const body = `{
 const session = await auth();
 if (session?.user?.role !== "SUPERADMIN") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
 const { id } = await params;
 try { return NextResponse.json(await updateAdminUser(id, session.user.id, await req.json())); }
 catch (error) {
  if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "E-mail já está em uso." }, { status: 409 });
  await logSystemError({ action: "PATCH_USER_BY_ID", error, entity: "USER", entityId: id });
  return NextResponse.json({ error: "Erro interno ao atualizar usuário." }, { status: 500 });
 }
}`;
source = source.slice(0, node.body.getStart(ast)) + body + source.slice(node.body.end);
source = source.replace('import bcryptjs from "bcryptjs";', 'import { Prisma } from "@prisma/client";\nimport { WorkspaceAccessError } from "@/modules/workspaces/domain/types";\nimport { adminUserSelect, updateAdminUser } from "@/lib/auth/admin-user-service";');
fs.writeFileSync(file, source);
