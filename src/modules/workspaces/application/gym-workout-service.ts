import type { z } from "zod";
import { gymWorkoutFieldsSchema, gymWorkoutExerciseSchema } from "../domain/gym-workout-contract";
import { createGymWorkoutTemplate, updateGymWorkoutTemplate, deleteGymWorkoutTemplate, assignGymStudentWorkout, listGymWorkoutTemplates, readGymStudentWorkouts } from "./gym-workout-commands";

export interface ListGymTemplatesInput {
  workspaceId: string;
  actorUserId?: string;
  search?: string; goal?: string; difficulty?: string; page?: number; limit?: number;
}
export type CreateWorkoutExerciseInput = z.input<typeof gymWorkoutExerciseSchema>;
export type CreateGymTemplateInput = z.input<typeof gymWorkoutFieldsSchema> & { workspaceId: string; creatorUserId: string };
export type UpdateGymTemplateInput = Partial<z.input<typeof gymWorkoutFieldsSchema>> & {
  workspaceId: string; templateId: string; actorUserId: string;
  /** Compatibility only: live authority is always checked by the command. */
  isManagerOrOwner?: boolean;
};
export interface AssignWorkoutToStudentInput {
  workspaceId: string; studentMemberId: string; actorUserId: string;
  actorMemberId?: string; isManagerOrOwner?: boolean;
  /** Missing keys are rejected at runtime, including legacy callers. */
  idempotencyKey?: string;
  templateWorkoutId?: string;
  customWorkout?: z.input<typeof gymWorkoutFieldsSchema>;
  dayOfWeek?: number | null;
}

/** Compatibility facade. HTTP and direct callers use the same live checks and transactions. */
export class GymWorkoutService {
  listGymTemplates(input: ListGymTemplatesInput) { return listGymWorkoutTemplates(input); }
  createGymTemplate(input: CreateGymTemplateInput) {
    const { workspaceId, creatorUserId, ...fields } = input;
    return createGymWorkoutTemplate(workspaceId, creatorUserId, fields);
  }
  updateGymTemplate(input: UpdateGymTemplateInput) {
    const { workspaceId, templateId, actorUserId, isManagerOrOwner, ...fields } = input;
    return updateGymWorkoutTemplate({ workspaceId, templateId, actorUserId }, fields);
  }
  deleteGymTemplate(workspaceId: string, templateId: string, actorUserId: string, _legacyAuthority?: boolean) {
    return deleteGymWorkoutTemplate({ workspaceId, templateId, actorUserId });
  }
  assignWorkoutToStudent(input: AssignWorkoutToStudentInput) {
    const { actorMemberId, isManagerOrOwner, ...command } = input;
    return assignGymStudentWorkout(command);
  }
  getStudentWorkouts(workspaceId: string, studentMemberId: string, actorUserId?: string) {
    return readGymStudentWorkouts(workspaceId, studentMemberId, actorUserId);
  }
  getStudentWorkoutLogs(workspaceId: string, studentMemberId: string, limit = 20, actorUserId?: string) {
    return readGymStudentWorkouts(workspaceId, studentMemberId, actorUserId, true, limit);
  }
}
export const gymWorkoutService = new GymWorkoutService();
