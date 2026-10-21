const fs = require('node:fs');
const ts = require('typescript');
const root = 'src/app/api/personal/clients/[id]';
const entries = [
 ['files/route.ts', 'workspaceId', { GET: 'health.read.assigned', POST: 'health.manage.assigned' }],
 ['files/[fileId]/route.ts', 'fileRecord.workspaceId', { DELETE: 'health.manage.assigned' }],
 ['evaluations/route.ts', 'workspaceId', { GET: 'health.read.assigned', POST: 'health.manage.assigned' }],
 ['evaluations/[evalId]/route.ts', 'evaluation.workspaceId', { DELETE: 'health.manage.assigned' }],
 ['progress/photos/route.ts', 'workspaceId', { GET: 'health.read.assigned', POST: 'health.manage.assigned' }],
 ['progress/photos/[photoId]/route.ts', 'photo.workspaceId', { PATCH: 'health.manage.assigned', DELETE: 'health.manage.assigned' }],
 ['workouts/route.ts', 'workspaceId', { GET: 'workouts.read', POST: 'workouts.manage.assigned' }],
 ['workouts/[workoutId]/route.ts', 'existingWorkout.workspaceId', { PATCH: 'workouts.manage.assigned', DELETE: 'workouts.manage.assigned' }],
];
for (const [relative, workspace, capabilities] of entries) {
 const file = `${root}/${relative}`; let source = fs.readFileSync(file, 'utf8');
 if (source.includes('import { authorizePersonalStudent }')) continue;
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
 const edits = [];
 for (const handler of ast.statements.filter(s => ts.isFunctionDeclaration(s) && capabilities[s.name?.text])) {
  const expected = capabilities[handler.name.text];
  let boundary;
  function visit(node) {
   if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ['trainerCheck', 'trainerMember', 'memberCheck'].includes(d.name.getText(ast)))) boundary ??= node.getStart(ast);
   ts.forEachChild(node, visit);
  }
  visit(handler);
  if (boundary === undefined && workspace === 'existingWorkout.workspaceId') {
   const attempt = handler.body.statements.find(s => ts.isTryStatement(s));
   const check = attempt.tryBlock.statements.find(s => ts.isIfStatement(s) && s.expression.getText(ast) === '!existingWorkout');
   boundary = check?.end;
  }
  if (boundary === undefined) throw new Error(`Ponto de autorização não localizado: ${file} ${handler.name.text}`);
  edits.push({ at: boundary, text: `\n    await authorizePersonalStudent(${workspace}, studentId, session.user.id, "${expected}");\n    ` });
  const attempt = handler.body.statements.find(s => ts.isTryStatement(s));
  if (!attempt?.catchClause?.block) throw new Error(`Catch não localizado: ${file}`);
  edits.push({ at: attempt.catchClause.block.getStart(ast) + 1, text: '\n    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;\n' });
 }
 for (const edit of edits.sort((a,b) => b.at - a.at)) source = source.slice(0,edit.at) + edit.text + source.slice(edit.at);
 source = 'import { authorizePersonalStudent } from "@/modules/workspaces/application/personal-student-authority";\nimport { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\n' + source;
 fs.writeFileSync(file, source);
}
