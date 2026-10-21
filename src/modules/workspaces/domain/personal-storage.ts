import { z } from "zod";

export const personalStorageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(""),
  status: z.enum(["ALL", "NORMAL", "WARNING", "EXCEEDED", "TEST"]).default("ALL"),
  includeBucket: z.enum(["true", "false"]).default("true"),
}).strict();
export type PersonalStorageQuery = z.infer<typeof personalStorageQuerySchema>;
export type PersonalStorageSummary = { totalPersonals: number; warningCount: number; exceededCount: number; normalCount: number; testCount: number; totalPersonalStorageMb: number };
export type PersonalStoragePagination = { page: number; pageSize: number; total: number; totalPages: number };
