const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/app/(personal)/personal/settings/actions.ts';
let source = fs.readFileSync(file,'utf8');
const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
const method = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'updateBrandSettings');
if (!method?.body) throw new Error('Missing branding action.');
const body = `{
  const session = await auth();
  if (!session?.user?.id) throw new Error('Não autorizado.');
  const workspace = await updateWorkspaceBranding(workspaceId, session.user.id, 'PERSONAL', {
    ...data,
    slug: data.slug?.trim() ? slugify(data.slug.trim()) : undefined,
    primaryColor: data.primaryColor?.trim() || '#2B4FCC',
  });
  return { success: true, workspace };
}`;
source=source.slice(0,method.body.getStart(ast))+body+source.slice(method.body.end);
source=source.replace('import { slugify } from "@/lib/utils";', 'import { slugify } from "@/lib/utils";\nimport { updateWorkspaceBranding } from "@/modules/workspaces/application/branding-service";');
fs.writeFileSync(file,source);
