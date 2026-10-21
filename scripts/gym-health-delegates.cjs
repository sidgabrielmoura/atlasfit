const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/modules/workspaces/application/gym-assessment-service.ts';
let source = fs.readFileSync(file, 'utf8');
const changes = [
 ['listStudentPhysicalEvaluations',`{
 const member = await authorizeGymStudent(options.workspaceId, options.studentMemberId, options.requestorUserId, "health.read.assigned", { allowSelf: true, allowGuardian: true, guardianId: options.guardianId });
 return prisma.physicalEvaluation.findMany({ where: { workspaceId: options.workspaceId, studentId: member.userId }, orderBy: { date: "desc" }, take: 500 });
 }`],
 ['listStudentFiles',`{
 const authorityOptions = { allowSelf: true, allowGuardian: true, guardianId: options.guardianId };
 const member = await authorizeGymStudent(options.workspaceId, options.studentMemberId, options.requestorUserId, "students.read", authorityOptions);
 let healthAllowed = false;
 try { await authorizeGymStudent(options.workspaceId, options.studentMemberId, options.requestorUserId, "health.read.assigned", authorityOptions); healthAllowed = true; }
 catch (error) { if (!(error instanceof WorkspaceAccessError) || error.statusCode !== 403) throw error; }
 return prisma.studentFile.findMany({ where: { workspaceId: options.workspaceId, studentId: member.userId, ...(healthAllowed ? {} : { category: { not: "exames" } }) }, orderBy: { createdAt: "desc" }, take: 500 });
 }`],
 ['deleteStudentFile',`{
 return serializableTransaction(async tx => {
 const file = await tx.studentFile.findFirst({ where: { id: fileId, workspaceId } });
 if (!file) throw new WorkspaceAccessError(404, "FILE_NOT_FOUND", "Arquivo não encontrado.");
 const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: file.studentId, workspaceId } }, select: { id: true } });
 if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Vínculo do arquivo não encontrado.");
 await authorizeGymStudent(workspaceId, member.id, actorUserId, file.category === "exames" ? "health.manage.assigned" : "workouts.manage.assigned", {}, tx);
 await tx.studentFile.delete({ where: { id: file.id } });
 await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_STUDENT_FILE_RECORD_REMOVED", entity: "STUDENT_FILE", entityId: file.id } });
 return { success: true };
 });
 }`],
];
for (const [method, body] of changes) {
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true); let found;
 function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === method) found = node; ts.forEachChild(node, visit); } visit(ast);
 if (!found?.body) throw new Error(`Missing ${method}`);
 source = source.slice(0, found.body.getStart(ast)) + body + source.slice(found.body.end);
}
source = 'import { serializableTransaction } from "./transaction";\n' + source;
source = source.replace('evaluationId: string\n', 'evaluationId: string,\n    actorUserId: string\n');
const before = '    return evaluation;\n  }\n\n  /**\n   * Faz upload';
const after = `    const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: evaluation.studentId, workspaceId } }, select: { id: true } });
    if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Vínculo não encontrado.");
    await authorizeGymStudent(workspaceId, member.id, actorUserId, "health.read.assigned", { allowSelf: true, allowGuardian: true });
    return evaluation;
  }

  /**
   * Faz upload`;
if (!source.includes(before)) throw new Error('Evaluation replacement missing');
source = source.replace(before, after);
fs.writeFileSync(file, source);
