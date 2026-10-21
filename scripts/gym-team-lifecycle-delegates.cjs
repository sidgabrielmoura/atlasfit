const fs = require('node:fs');
const ts = require('typescript');
const changes = [
 ['src/modules/workspaces/application/ownership-service.ts', 'transferWorkspaceOwnership', 'transferWorkspaceOwner', '{ return transferWorkspaceOwner(params); }', false],
 ['src/modules/workspaces/application/staff-service.ts', 'offboardStaffMember', 'offboardGymStaff', '{ return offboardGymStaff(input); }', false],
 ['src/modules/workspaces/application/staff-service.ts', 'reassignStudents', 'reassignGymStudents', '{ return reassignGymStudents(input); }', false],
 ['src/modules/workspaces/application/gym-offboarding-service.ts', 'offboardStaffWithHandover', 'offboardGymStaff', '{ return offboardGymStaff(input); }', true],
 ['src/modules/workspaces/application/gym-service.ts', 'grantMemberRole', 'mutateGymRole', '{ return mutateGymRole({ ...params, actorUserId: params.grantedByUserId, revoke: false }); }', false],
 ['src/modules/workspaces/application/gym-service.ts', 'revokeMemberRole', 'mutateGymRole', '{ return mutateGymRole({ ...params, actorUserId: params.revokedByUserId, revoke: true }); }', false],
];
for (const [file, method, imported, body, isStatic] of changes) {
 let source = fs.readFileSync(file, 'utf8');
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
 let found;
 function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(ast) === method && Boolean(node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) === isStatic) found = node;
  ts.forEachChild(node, visit);
 }
 visit(ast);
 if (!found?.body) throw new Error(`Missing ${file}:${method}`);
 source = source.slice(0, found.body.getStart(ast)) + body + source.slice(found.body.end);
 const declaration = `import { ${imported} } from "./team-lifecycle";`;
 if (!source.includes(declaration)) source = declaration + '\n' + source;
 fs.writeFileSync(file, source);
}
