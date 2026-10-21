const fs = require('node:fs');
const store = 'src/stores/superadmin.store.ts';
let text = fs.readFileSync(store, 'utf8').replaceAll('\r\n', '\n');
if (text.includes('workspacesError: string')) throw new Error('Feedback já aplicado.');
text = 'import { isAxiosError } from "axios";\nimport { workspaceAdministrationErrorMessage, workspaceAdministrationResultSchema } from "@/modules/workspaces/domain/workspace-administration-contract";\n' + text;
text = text.replace('interface SuperAdminState {', 'interface SuperAdminState {\n  workspacesError: string | null;\n  workspacesLoading: boolean;');
text = text.replace('const initialState: SuperAdminState = {', 'const initialState: SuperAdminState = {\n  workspacesError: null,\n  workspacesLoading: false,');
let start = text.indexOf('  async fetchWorkspaces()'); let end = text.indexOf('  async fetchLogs()', start);
if (start < 0 || end < 0) throw new Error('Busca de workspaces ausente.');
text = text.slice(0, start) + `  async fetchWorkspaces() {
    superAdminStore.workspacesLoading = true;
    superAdminStore.workspacesError = null;
    try {
      const { data } = await api.get("/superadmin/workspaces");
      superAdminStore.workspaces = data;
      return true;
    } catch (error: unknown) {
      superAdminStore.workspacesError = isAxiosError<unknown>(error)
        ? workspaceAdministrationErrorMessage(error.response?.data, "Não foi possível atualizar a lista de workspaces.")
        : "Não foi possível atualizar a lista de workspaces.";
      return false;
    } finally { superAdminStore.workspacesLoading = false; }
  },

` + text.slice(end);
start = text.indexOf('  async updateWorkspace('); end = text.indexOf('  async fetchFinance()', start);
if (start < 0 || end < 0) throw new Error('Atualização no store ausente.');
text = text.slice(0, start) + `  async updateWorkspace(id: string, data: unknown) {
    try {
      const response = await api.patch<unknown>(\x60/superadmin/workspaces/\x24{id}\x60, data);
      workspaceAdministrationResultSchema.parse(response.data);
      return await superAdminActions.fetchWorkspaces();
    } catch (error: unknown) {
      throw new Error(isAxiosError<unknown>(error)
        ? workspaceAdministrationErrorMessage(error.response?.data, "Não foi possível atualizar o workspace.")
        : error instanceof Error ? error.message : "Não foi possível atualizar o workspace.");
    }
  },
` + text.slice(end);
fs.writeFileSync(store, text);
const page = 'src/app/(superadmin)/superadmin/workspaces/page.tsx';
text = fs.readFileSync(page, 'utf8').replaceAll('\r\n', '\n');
text = text.replace('      await superAdminActions.updateWorkspace(editingWorkspace.id, formData);\n      toast.success("Workspace atualizado com sucesso!");', '      const refreshed = await superAdminActions.updateWorkspace(editingWorkspace.id, formData);\n      if (refreshed) toast.success("Workspace atualizado.");\n      else toast.warning("Alteração salva. Atualize a listagem para conferir o estado aplicado.");');
text = text.replace('success: `Workspace ${ws.isActive !== false ? \'suspenso\' : \'reativado\'} com sucesso!`,', 'success: (refreshed: boolean) => refreshed ? `Workspace ${newStatus ? "reativado" : "suspenso"}.` : "Alteração salva. A listagem precisa ser atualizada.",');
text = text.replace('(snap.workspaces || []).length === 0 && snap.isLoading', '(snap.workspaces || []).length === 0 && snap.workspacesLoading');
// Only insert into the main return, after the loading branch.
const main = text.indexOf('  return (', text.indexOf('  if ((snap.workspaces'));
const nextReturn = text.indexOf('  return (', main + 10);
const insertion = text.indexOf('\n', text.indexOf('<div', nextReturn));
if (nextReturn < 0 || insertion < 0) throw new Error('Retorno principal da lista não localizado.');
text = text.slice(0, insertion) + '\n      {snap.workspacesError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{snap.workspacesError} Os dados exibidos podem estar desatualizados.</span><Button variant="outline" size="sm" disabled={snap.workspacesLoading} onClick={() => superAdminActions.fetchWorkspaces()}>Atualizar listagem</Button></div>}' + text.slice(insertion);
fs.writeFileSync(page, text);
const detail = 'src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx';
text = fs.readFileSync(detail, 'utf8');
text = text.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\nimport { workspaceAdministrationResultSchema, workspaceAdministrationErrorMessage } from "@/modules/workspaces/domain/workspace-administration-contract";');
text = text.replace('      if (!res.ok) throw new Error("Erro na atualização");\n      setWorkspace({ ...workspace, isActive: newStatus });\n      toast.success(newStatus ? "Workspace reativado!" : "Workspace suspenso com segurança!");', '      const result: unknown = await res.json();\n      if (!res.ok) throw new Error(workspaceAdministrationErrorMessage(result, "Não foi possível alterar o estado."));\n      const applied = workspaceAdministrationResultSchema.parse(result);\n      setWorkspace({ ...workspace, isActive: applied.isActive });\n      toast.success(applied.isActive ? "Workspace reativado." : "Workspace suspenso.");');
text = text.replace('      toast.error("Erro ao alterar o status do workspace.");', '      toast.error(error instanceof Error ? error.message : "Erro ao alterar o status do workspace.");');
fs.writeFileSync(detail, text);
console.log('Lista e detalhe distinguem estado aplicado, conflito e falha de atualização.');
