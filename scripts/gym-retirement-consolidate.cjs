// One-time source transition. No database or external service is touched.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function edit(relative, transform) {
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error('Outside workspace');
  const before = fs.readFileSync(file, 'utf8');
  const backup = path.join(root, '.tmp/gym-retired-sources', relative);
  if (!fs.existsSync(backup)) { fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.writeFileSync(backup, before); }
  const after = transform(before.replace(/\r\n/g, '\n'));
  if (after !== before) fs.writeFileSync(file, after);
}
function replace(text, from, to) { if (!text.includes(from)) throw new Error('Missing transition anchor: ' + from); return text.replace(from, to); }
function removeNodes(text, predicate) {
  const source = ts.createSourceFile('source.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  function visit(node) {
    if (predicate(node, source)) {
      let start = node.getFullStart(), end = node.end;
      if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
        while (text[end] === ' ' || text[end] === '\n') end++;
        if (text[end] === ',') end++;
        else { let p = start - 1; while (/\s/.test(text[p] || '') && p >= 0) p--; if (text[p] === ',') start = p; }
      }
      edits.push([start, end]); return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [start, end] of edits.sort((a, b) => b[0] - a[0])) text = text.slice(0, start) + text.slice(end);
  return text;
}
const retiredProperties = new Set(['turnstilesEnabled','biometricsEnabled','classesEnabled','crmEnabled','defaultAllowMinorSelfCheckin','allowMinorSelfCheckin','defaultBiometricMode','biometricValidationMode','defaultMaxDevices','maxDevices','devicesCount','primaryHardwareDriver','heartbeatIntervalSec','allowEmergencyContingency','require2FAForManagers','autoPurgeHardwareOnCancel']);
function dropProperties(text, names = retiredProperties) {
  return removeNodes(text, n => (ts.isPropertyAssignment(n) || ts.isPropertySignature(n) || ts.isShorthandPropertyAssignment(n)) && names.has(n.name?.getText().replace(/^["']|["']$/g, '')));
}
edit('src/modules/workspaces/domain/roles.ts', text => text.replace(/^.*["'](?:classes\.(?:read|manage)|bookings\.manage|access\.(?:read|override)|devices\.manage|crm\.(?:read|manage))["'].*\n/gm, ''));
for (const file of ['src/modules/workspaces/domain/gym-config.ts','src/modules/workspaces/application/gym-provisioning.ts','src/modules/workspaces/application/superadmin-service.ts','src/stores/workspace.store.ts']) edit(file, dropProperties);
edit('src/modules/workspaces/application/entitlements-service.ts', text => {
  text = dropProperties(text);
  text = removeNodes(text, n => ts.isMethodDeclaration(n) && n.name.getText() === 'ensureWorkspaceSubscription');
  text = removeNodes(text, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => ['devicesCount','maxDevices','flags'].includes(d.name.getText())));
  text = removeNodes(text, n => ts.isCaseClause(n) && n.expression.getText() === '"ADD_DEVICE"');
  text = text.replace(/import \{ GymFeatureFlagsService \}[^\n]*\n/, '').replace(/ \| "ADD_DEVICE"/g, '').replace('action === "ADD_UNIT" || action === "ADD_DEVICE"', 'action === "ADD_UNIT"').replace('Unidades adicionais e catracas são recursos exclusivos', 'Unidades adicionais são recursos exclusivos');
  return text;
});
edit('src/modules/workspaces/application/team-lifecycle.ts', text => {
  text = removeNodes(text, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => ['sessions','schedules','resources'].includes(d.name.getText())));
  text = replace(text, 'resources.length ? resources.map(item => item.unitId)', 'students.length ? students.map(item => item.unitId)');
  text = removeNodes(text, n => ts.isIfStatement(n) && (n.expression.getText().includes('sessions.length') || (n.expression.getText() === 'replacement' && n.thenStatement.getText().includes('gymClassSession'))));
  text = dropProperties(text, new Set(['reassignedSessionsCount','cancelledSessionsCount']));
  return text.replace(/alunos e aulas/g, 'alunos');
});
edit('src/modules/workspaces/application/gym-analytics-service.ts', text => {
  text = dropProperties(text, new Set(['physicalAttendance','classOccupancy','turnstileOperations','commercialCrm']));
  text = removeNodes(text, n => ts.isCaseClause(n) && ['"ACCESS_LOGS"','"CLASS_BOOKINGS"'].includes(n.expression.getText()));
  text = replace(text, text.slice(text.indexOf('    // 4. Frequência'), text.indexOf('    return {', text.indexOf('    // 4. Frequência'))), '');
  return text.replace(/  Gym(?:AccessDirection|ClassBookingStatus|AccessDecision),\n/g, '').replace(/\n  \| "(?:ACCESS_LOGS|CLASS_BOOKINGS)"/g, '').replace('  | "PAYMENTS";', '  | "PAYMENTS";').replace('  | "PAYMENTS"\n;', '  | "PAYMENTS";').replace('Acesso Físico Liberado', 'Matrícula liberada');
});
edit('src/modules/workspaces/application/gym-import-commands.ts', text => {
  text = dropProperties(text, new Set(['externalCardCode','createdAccessGrantsCount']));
  text = text.replace('const SCHEMA = "gym-import-v2";', 'const SCHEMA = "gym-import-v3";').replace(/;?\s*let createdAccessGrantsCount = 0;/, ';');
  text = text.replace(/, seenCards = new Set<string>\(\)/, '').replace(/\[externalCardCode, seenCards, "Cartão"\],?/, '');
  text = text.replace(/, \]/g, ']');
  text = text.replace(/const externalCardCode = field\("cartao_acesso", "tag", "rfid"\);?/, '');
  text = removeNodes(text, n => ts.isIfStatement(n) && (n.expression.getText().includes('externalCardCode') || n.expression.getText().includes('/biometr|template|facial|digital/')));
  text = replace(text, '    const age = birth ?', '    if (Object.entries(raw).some(([key, value]) => /^(cartao_acesso|tag|rfid|biometr.*|template.*|facial.*|digital.*)$/.test(key) && String(value ?? "").trim())) invalid("Colunas de equipamentos não são aceitas. Remova esses dados antes de importar.");\n    const age = birth ?');
  text = text.replace('incluindo saldos e cartão.', 'incluindo saldos.').replace('; cartões permanecem suspensos.', '.');
  // Versioned key prevents an old preview from being reused with the new row contract.
  text = text.replace(/`GYM_IMPORT:\$\{sha/g, '`GYM_IMPORT_V3:${sha');
  return text;
});
for (const file of ['src/modules/workspaces/application/gym-import-service.ts','src/app/(gym)/gym/import/import-client.tsx']) edit(file, text => dropProperties(text, new Set(['externalCardCode','createdAccessGrantsCount'])).replace('Cartao_Acesso;', '').replace(';;RFID-123;', ';;'));
edit('src/app/(gym)/layout.tsx', text => text.replace(/\s*EntitlementsService,?/, ''));
console.log('Operational source transition applied; source backups preserved.');
