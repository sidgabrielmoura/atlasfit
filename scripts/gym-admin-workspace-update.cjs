const fs = require('node:fs');
const file = 'src/app/api/superadmin/workspaces/[id]/route.ts';
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
if (text.includes('updateWorkspaceAdministration')) throw new Error('PATCH já atualizado.');
text = 'import { updateWorkspaceAdministration } from "@/modules/workspaces/application/workspace-administration";\nimport { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\nimport { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";\n' + text;
const start = text.indexOf('export async function PATCH');
if (start < 0) throw new Error('PATCH administrativo ausente.');
text = text.slice(0, start) + `export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Acesso administrativo necessário." } }, { status: 401 });
  const { id } = await params;
  try {
    if (!id || id.length > 100) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Workspace obrigatório." } }, { status: 400 });
    const actorUserId = session.user.isImpersonated ? session.user.originalAdminUserId : session.user.id;
    if (!actorUserId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Ator administrativo indisponível." } }, { status: 403 });
    const updated = await updateWorkspaceAdministration(id, await readJsonRequest(req, 16_384), actorUserId, session.user.id);
    return NextResponse.json(serializeGymData(updated));
  } catch (error) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    if (error instanceof JsonRequestError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: error.message } }, { status: error.statusCode });
    await logSystemError({ action: "PATCH_WORKSPACE_BY_ID", error, entity: "WORKSPACE", entityId: id });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível atualizar o workspace." } }, { status: 500 });
  }
}
`;
fs.writeFileSync(file, text);
const page = 'src/app/(superadmin)/superadmin/workspaces/page.tsx';
text = fs.readFileSync(page, 'utf8').replace('{ isActive: newStatus }', '{ isActive: newStatus, expectedIsActive: ws.isActive }');
fs.writeFileSync(page, text);
const detail = 'src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx';
text = fs.readFileSync(detail, 'utf8').replace('JSON.stringify({ isActive: newStatus })', 'JSON.stringify({ isActive: newStatus, expectedIsActive: workspace.isActive })');
fs.writeFileSync(detail, text);
console.log('Atualização administrativa atômica, validação estrita e baseline nas duas telas.');
