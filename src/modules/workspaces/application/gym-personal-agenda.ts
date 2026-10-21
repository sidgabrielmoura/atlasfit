import { z } from "zod";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertGymPersonalAffiliation } from "./personal-affiliation";
import { authorizeGymStudent } from "./student-authority";
import { WorkspaceAccessError } from "../domain/types";
import { parseBirthDate } from "@/lib/privacy/civil-age";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Boolean(parseBirthDate(value)), "Data inválida.");
const fields = {
  title: z.string().trim().min(1).max(200), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  type: z.enum(["avaliação", "check-in", "lembrete"]), studentId: z.string().min(1).nullable().optional(),
};
const create = z.object({ ...fields, date }).strict();
const patch = z.object({ title: fields.title.optional(), time: fields.time.optional(), type: fields.type.optional(), studentId: fields.studentId, completed: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0);

async function authorizeStudent(db: GymTransactionClient, workspaceId: string, authorId: string, studentId?: string | null) {
  if (!studentId) return;
  const member = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: studentId, workspaceId } }, select: { id: true } });
  if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado.");
  await authorizeGymStudent(workspaceId, member.id, authorId, "students.read", {}, db);
}

export async function gymPersonalAgenda(workspaceId: string, authorId: string, operation: "GET" | "POST" | "PATCH" | "DELETE", input: unknown, taskId?: string) {
  return serializableTransaction(async db => {
    await assertGymPersonalAffiliation(workspaceId, authorId, db);
    if (operation === "GET") {
      const selectedDate = date.parse(input);
      const tasks = await db.trainerTask.findMany({ where: { workspaceId, authorId, scheduledDate: selectedDate }, orderBy: [{ time: "asc" }, { id: "asc" }], take: 201, include: { student: { select: { id: true, name: true } } } });
      if (tasks.length > 200) throw new WorkspaceAccessError(409, "REVIEW_SOURCE_LIMIT", "Refine sua agenda antes de carregar mais de 200 tarefas por dia.");
      const dailyAgenda = [];
      for (const task of tasks) {
        try { await authorizeStudent(db, workspaceId, authorId, task.studentId); dailyAgenda.push(task); }
        catch (error) { if (!(error instanceof WorkspaceAccessError) || ![403, 404].includes(error.statusCode)) throw error; }
      }
      return { dailyAgenda, intelligentStudentsList: [] };
    }
    if (operation === "POST") {
      const data = create.parse(input);
      await authorizeStudent(db, workspaceId, authorId, data.studentId);
      if (await db.trainerTask.count({ where: { workspaceId, authorId, scheduledDate: data.date } }) >= 200) throw new WorkspaceAccessError(409, "REVIEW_SOURCE_LIMIT", "Limite de 200 tarefas por dia atingido.");
      const task = await db.trainerTask.create({ data: { title: data.title, time: data.time, type: data.type, studentId: data.studentId, scheduledDate: data.date, workspaceId, authorId } });
      await db.auditLog.create({ data: { userId: authorId, action: "GYM_TASK_CREATED", entity: "TRAINER_TASK", entityId: task.id, severity: "success" } });
      return task;
    }
    const task = taskId ? await db.trainerTask.findFirst({ where: { id: taskId, workspaceId, authorId } }) : null;
    if (!task) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Tarefa não encontrada na sua agenda.");
    await authorizeStudent(db, workspaceId, authorId, task.studentId);
    if (operation === "DELETE") {
      await db.trainerTask.delete({ where: { id: task.id } });
      await db.auditLog.create({ data: { userId: authorId, action: "GYM_TASK_DELETED", entity: "TRAINER_TASK", entityId: task.id, severity: "success" } });
      return { success: true };
    }
    const data = patch.parse(input);
    await authorizeStudent(db, workspaceId, authorId, data.studentId);
    const updated = await db.trainerTask.update({ where: { id: task.id }, data });
    await db.auditLog.create({ data: { userId: authorId, action: "GYM_TASK_UPDATED", entity: "TRAINER_TASK", entityId: task.id, severity: "success" } });
    return updated;
  });
}
