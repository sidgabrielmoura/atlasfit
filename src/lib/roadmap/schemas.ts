import { z } from "zod";

export const createSuggestionSchema = z.object({
  title: z
    .string()
    .min(5, "O título deve ter pelo menos 5 caracteres")
    .max(100, "O título deve ter no máximo 100 caracteres")
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(15, "A descrição deve ter pelo menos 15 caracteres")
    .max(2000, "A descrição deve ter no máximo 2000 caracteres")
    .transform((val) => val.trim()),
  categoryId: z.string().optional().nullable(),
});

export const createFeatureSchema = z.object({
  title: z
    .string()
    .min(1, "O título deve ter pelo menos 1 caractere")
    .max(200, "O título deve ter no máximo 200 caracteres")
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(1, "A descrição é obrigatória")
    .max(10000, "A descrição deve ter no máximo 10000 caracteres")
    .transform((val) => val.trim()),
  statusId: z.string().min(1, "O status é obrigatório"),
  categoryId: z.string().optional().nullable(),
  source: z.string().optional().nullable().default("ATLASFIT"),
  priority: z.string().optional().nullable().default("MEDIUM"),
  featured: z.boolean().optional().default(false),
  isCommunityChoice: z.boolean().optional().default(false),
  estimatedRelease: z.string().optional().nullable(),
});

export const updateFeatureSchema = createFeatureSchema.partial().extend({
  officialResponse: z.string().optional().nullable(),
});

export const commentSchema = z.object({
  featureId: z.string().min(1),
  parentId: z.string().optional().nullable(),
  content: z
    .string()
    .min(2, "O comentário deve ter pelo menos 2 caracteres")
    .max(1000, "O comentário deve ter no máximo 1000 caracteres")
    .transform((val) => val.trim()),
});

export const editSuggestionSchema = z.object({
  title: z.string().min(5).max(100).transform((val) => val.trim()),
  description: z.string().min(15).max(2000).transform((val) => val.trim()),
  categoryId: z.string().optional().nullable(),
});

export const editCommentSchema = z.object({
  content: z.string().min(2).max(1000).transform((val) => val.trim()),
});

export const reorderFeatureSchema = z.object({
  featureId: z.string().min(1),
  targetStatusId: z.string().min(1),
  newRank: z.number(),
});

export const mergeFeaturesSchema = z.object({
  primaryId: z.string().min(1),
  secondaryId: z.string().min(1),
});

export const createPollSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  allowVoteChange: z.boolean().default(true),
  options: z.array(z.string().min(2).max(100)).min(2, "Pelo menos 2 opções são necessárias"),
});

export const votePollSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
});
