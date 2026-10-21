const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname,'..');
function edit(file, transform) { const target=path.resolve(root,file); if(!target.startsWith(root+path.sep))throw new Error('Invalid target'); const text=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n'); const backup=path.join(root,'.tmp/gym-retired-sources',file); if(!fs.existsSync(backup)){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,text);} fs.writeFileSync(target,transform(text)); }
function transform(text, match, replacement = '') { const file=ts.createSourceFile('file.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX), edits=[]; function visit(n){if(match(n)){edits.push([n.getFullStart(),n.end,typeof replacement==='function'?replacement(n):replacement]);return;}ts.forEachChild(n,visit);}visit(file);for(const[a,b,r]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+r+text.slice(b);return text; }
edit('src/modules/workspaces/application/gym-offboarding-service.ts', text => {
  text=transform(text,n=>ts.isMethodDeclaration(n)&&n.name.getText()==='cancelStudentWithHardwarePurge','\n  static async cancelStudent(input: CancelGymStudentInput) { return cancelGymStudent(input); }');
  text=transform(text,n=>ts.isInterfaceDeclaration(n)&&n.name.getText()==='CancelStudentWithHardwarePurgeInput');
  text=transform(text,n=>ts.isImportDeclaration(n)&&['"crypto"','"@/lib/prisma"','"./staff-service"'].includes(n.moduleSpecifier.getText()));
  text=transform(text,n=>ts.isPropertyDeclaration(n)&&n.name.getText()==='staffService');
  text=text.replace(/  cancelFutureSessionsWithoutSubstitute\?: boolean;\n/,'').replace(/import \{[\s\S]*?\} from "@prisma\/client";/,'import type { WorkspaceRole } from "@prisma/client";');
  text=text.replace(/  \/\*\*[\s\S]*?\*\//g,'');
  return 'import { cancelGymStudent, type CancelGymStudentInput } from "./gym-student-offboarding";\n'+text;
});
edit('src/modules/workspaces/application/gym-communication-service.ts', text => {
  text=transform(text,n=>ts.isCaseClause(n)&&n.expression.getText()==='"CLASS_STUDENTS"');
  return text.replace(/  \| "CLASS_STUDENTS"\n/,'').replace(/    (?:modalityId|scheduleId)\?: string \| null;\n/g,'').replace(/^.*CLASS_STUDENTS.*\n/gm,'').replace(/\/student\/access/g,'/student/dashboard');
});
edit('src/app/api/gym/analytics/export/route.ts',text=>text.replace(', "ACCESS_LOGS", "CLASS_BOOKINGS"',''));
edit('src/app/(gym)/gym/analytics/page.tsx',text=>text.replace('frequência física, ocupação e ','').replace('em tempo real','da operação'));
edit('src/app/(gym)/gym/dashboard/page.tsx',text=>{
  text=transform(text,n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['todayStart','todayEnd','recentPassages'].includes(d.name.getText())));
  text=transform(text,n=>ts.isExpressionStatement(n)&&/today(?:Start|End)\.setHours/.test(n.getText()));
  text=transform(text,n=>ts.isCallExpression(n)&&n.expression.getText()==='prisma.gymAccessLog.findMany');
  text=text.replace('initialOverview, rawAccessLogs','initialOverview').replace(/\n\s*,\n\s*\]\);/,'\n    ]);');
  text=text.replace('where: { id: workspaceId },','where: { id: workspaceId }, select: { name: true },');
  text=text.replace(/      recentPassages=\{recentPassages\}\n/,'').replace(/      turnstilesEnabled=\{[^\n]*\n/,'');
  text=text.replace('        assignedStaffId:','        includeFinancial: hasFinancialAccess,\n        assignedStaffId:');
  return text;
});
console.log('Operational facades and dashboard queries updated.');
