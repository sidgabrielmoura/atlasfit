const fs = require('node:fs');
for (const [route, schema, command, actor, message] of [
  ['close', 'closeCashRequestSchema', 'closeCashDrawer', 'closedByUserId', 'Revise a contagem e a justificativa do fechamento.'],
  ['reconcile', 'reconcileCashRequestSchema', 'reconcileCashDrawer', 'reconciledByUserId', 'Informe uma justificativa de conferência com pelo menos cinco caracteres.'],
]) {
  fs.writeFileSync(`src/app/api/gym/finance/cash-drawer/${route}/route.ts`, `import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { ${schema} } from "@/modules/workspaces/application/cash-mutations";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
export async function POST(request: Request) {
  try {
    const parsed = ${schema}.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "${message}" } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.${command}({ ...parsed.data, workspaceId: context.workspaceId, ${actor}: context.userId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
}
`);
}
const ui = 'src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx';
let text = fs.readFileSync(ui, 'utf8');
text = text.replace('catch (err: any) {\n      toast.error(err.message || "Falha ao fechar caixa");', 'catch (err) {\n      toast.error(err instanceof Error ? err.message : "Falha ao fechar caixa");');
// Handle either existing line-ending convention without changing unrelated strings.
text = text.replace(/catch \(err: any\) \{\r?\n\s+toast.error\(err.message \|\| "([^"]+)"\);/g, 'catch (err) {\n      toast.error(err instanceof Error ? err.message : "$1");');
fs.writeFileSync(ui, text);
