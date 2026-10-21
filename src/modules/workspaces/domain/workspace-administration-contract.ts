import { z } from "zod";

export const workspaceAdministrationResultSchema = z.object({ id: z.string(), name: z.string(), slug: z.string(), ownerId: z.string(), type: z.enum(["PERSONAL", "GYM"]), isActive: z.boolean() });

export function workspaceAdministrationErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim() && body.length <= 300) return body;
  if (typeof body !== "object" || body === null || !("error" in body)) return fallback;
  const error = body.error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}
