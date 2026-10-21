const fs = require('node:fs'); const ts = require('typescript');
const file = 'src/modules/workspaces/application/gym-student-service.ts'; let code = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS); const edits = [];
function visit(node) {
 if (ts.isMethodDeclaration(node) && node.body) {
  const name = node.name.getText(source);
  if (name === 'registerStudent') edits.push({ start: node.body.pos, end: node.body.end, text: ' { return registerGymStudent(input); }' });
  if (name === 'updateStudent') edits.push({ start: node.body.pos, end: node.body.end, text: ' { return updateGymStudent(input); }' });
  if (name === 'generateRegistrationNumber') edits.push({ start: node.getFullStart(), end: node.end, text: '' });
  if (name === 'listStudents') edits.push({ start: node.body.pos, end: node.body.end, text: ' { return listGymStudents(options); }' });
  if (name === 'getStudentById') edits.push({ start: node.body.pos, end: node.body.end, text: ' { return getGymStudent(workspaceId, memberId, actorContext); }' });
  if (name === 'checkDuplicate') edits.push({ start: node.getStart(source), end: node.end, text: 'async checkDuplicate(workspaceId: string, params: { cpf?: string | null; email?: string | null; phone?: string | null }, actorUserId?: string, unitId?: string) { return checkGymStudentDuplicate(workspaceId, params, actorUserId, unitId); }' });
 }
 ts.forEachChild(node, visit);
}
visit(source); if (edits.length < 2) throw Error('Comandos não encontrados.');
for (const edit of edits.sort((a,b) => b.start-a.start)) code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
code = code.replace('import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";\r\n', '').replace('import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";\n', '')
 .replace(/import crypto from "crypto";\r?\n/, '').replace(/import \{ gymPublicUserSelect \} from "\.\.\/domain\/public-user";\r?\n/, '')
 .replace(/import \{ validateGymMinorEligibility \} from "@\/lib\/privacy\/age-validator";\r?\n/, '').replace(/import \{ MinorService \} from "\.\/minor-service";\r?\n/, '');
if (!code.includes('import { registerGymStudent, updateGymStudent }')) code = 'import { registerGymStudent, updateGymStudent } from "./gym-student-commands";\n' + code;
if (!code.includes('import { listGymStudents, getGymStudent, checkGymStudentDuplicate }')) code = 'import { listGymStudents, getGymStudent, checkGymStudentDuplicate } from "./gym-student-queries";\n' + code;
code = code.replace(/import prisma from "@\/lib\/prisma";\r?\n/, '').replace('import { WorkspaceAccessError, WorkspaceContext }', 'import { WorkspaceContext }');
fs.writeFileSync(file, code); console.log('Cadastro e edição delegados a comandos transacionais.');
