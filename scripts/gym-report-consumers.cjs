const fs = require('node:fs');
for (const file of ['tests/gym/operation-authority.integration.ts', 'tests/gym/cash-expense.integration.ts']) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replaceAll('GymAnalyticsService.exportData({ workspaceId: f.workspace.id,', 'GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id,');
  text = text.replace('const period = { workspaceId: f.workspace.id, startDate:', 'const period = { workspaceId: f.workspace.id, actorUserId: f.owner.id, startDate:');
  fs.writeFileSync(file, text);
}
// Existing mock expectations remain unchanged; this is only the now-required caller identity.
const mockFile = 'src/modules/workspaces/__tests__/gym-071.test.ts';
let mock = fs.readFileSync(mockFile, 'utf8');
mock = mock.replaceAll('GymAnalyticsService.getOverview({ workspaceId }', 'GymAnalyticsService.getOverview({ workspaceId, actorUserId: "mock-report-author" }');
mock = mock.replace(/GymAnalyticsService\.(getOverview|exportData)\(\{\r?\n\s+workspaceId,/g, 'GymAnalyticsService.$1({\n        workspaceId, actorUserId: "mock-report-author",');
fs.writeFileSync(mockFile, mock);
const exportFile = 'src/app/api/gym/analytics/export/route.ts';
let text = fs.readFileSync(exportFile, 'utf8');
const begin = text.indexOf('    const financialExports:'); const end = text.indexOf('    const result =', begin);
if (begin < 0 || end < 0) throw new Error('Guard de exportação não localizado.');
text = text.slice(0, begin) + '    const context = await requireWorkspaceAccess({ workspaceId });\n\n' + text.slice(end);
text = text.replace('      workspaceId: context.workspaceId,', '      workspaceId: context.workspaceId,\n      actorUserId: context.userId,');
text = text.replace(/      assignedStaffId: exportType ===[^\r\n]+,\r?\n/, '');
text = text.replace('  GymExportType,\n', '');
fs.writeFileSync(exportFile, text);
const page = 'src/app/(gym)/gym/dashboard/page.tsx';
text = fs.readFileSync(page, 'utf8');
text = text.replace('  requireWorkspaceAccess,', '  requireGymWorkspaceAccess,');
const guardBegin = text.indexOf('  // Validação de acessos'); const guardEnd = text.indexOf('  // 1. Coleta', guardBegin);
if (guardBegin < 0 || guardEnd < 0) throw new Error('Guard da visão geral não localizado.');
text = text.slice(0, guardBegin) + '  const context = await requireGymWorkspaceAccess({ workspaceId });\n\n' + text.slice(guardEnd);
text = text.replace('        includeFinancial: hasFinancialAccess,\n        assignedStaffId: !hasFinancialAccess && context.memberId ? context.memberId : undefined,', '        actorUserId: context.userId,');
// Also handle the pre-existing CRLF source convention.
text = text.replace(/        includeFinancial: hasFinancialAccess,\r?\n        assignedStaffId: !hasFinancialAccess && context.memberId \? context.memberId : undefined,/, '        actorUserId: context.userId,');
const redactBegin = text.indexOf('  // Se não possuir acesso financeiro'); const redactEnd = text.indexOf('  return (', redactBegin);
if (redactBegin < 0 || redactEnd < 0) throw new Error('Redação antiga não localizada.');
text = text.slice(0, redactBegin) + '  const hasFinancialAccess = initialOverview.access.financial;\n\n' + text.slice(redactEnd);
fs.writeFileSync(page, text);
console.log('Consumidores passam ator real; decisões de escopo não dependem da UI/guard global.');
