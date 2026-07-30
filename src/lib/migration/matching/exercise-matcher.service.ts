import prisma from "@/lib/prisma";
import { slugifyExerciseName } from "../normalization/normalization.service";

export interface ExerciseMatchResult {
  exerciseId: string;
  exerciseName: string;
  isCustom: boolean;
  matchType: "EXACT" | "SYNONYM" | "FUZZY";
  confidence: number;
}

const COMMON_SYNONYMS: Record<string, string[]> = {
  "supino reto com barra": ["supino reto", "supino reto barra", "bench press", "supino no banco reto"],
  "supino inclinado com barra": ["supino inclinado", "inclinado barra", "incline bench press"],
  "puxada frontal": ["puxada alta", "puxada na frente", "lat pulldown", "pulley frente"],
  "remada curvada": ["remada curvada barra", "bent over row"],
  "agachamento livre": ["agachamento", "squat", "agachamento barra"],
  "leg press 45": ["leg press", "leg 45", "legpress"],
  "desenvolvimento com halteres": ["desenvolvimento", "shoulder press", "desenvolvimento halteres"],
  "rosca direta com barra": ["rosca direta", "biceps barra", "barbell curl"],
  "tríceps no pulley": ["triceps pulley", "triceps corda", "triceps testa", "pushdown"],
  "elevação lateral": ["elevação lateral halteres", "lateral raise"],
};

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let intersection = 0;
  words1.forEach((word) => {
    if (words2.has(word)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  const jaccard = intersection / union;

  const lenDiff = Math.abs(s1.length - s2.length) / Math.max(s1.length, s2.length);
  const similarity = jaccard * 0.7 + (1 - lenDiff) * 0.3;

  return Math.round(similarity * 100) / 100;
}

export async function matchExerciseName(
  rawName: string,
  creatorId?: string
): Promise<ExerciseMatchResult | null> {
  if (!rawName || !rawName.trim()) return null;

  const cleanRaw = rawName.trim().toLowerCase();
  const targetSlug = slugifyExerciseName(rawName);

  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [{ isOfficial: true }, ...(creatorId ? [{ creatorId }] : [])],
    },
    select: {
      id: true,
      name: true,
      creatorId: true,
      isOfficial: true,
    },
  });

  // Stage 1: Exact Slug Match
  for (const ex of exercises) {
    const slug = slugifyExerciseName(ex.name);
    if (slug === targetSlug) {
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        isCustom: !ex.isOfficial,
        matchType: "EXACT",
        confidence: 1.0,
      };
    }
  }

  // Stage 2: Synonym / Alias Match
  for (const ex of exercises) {
    const exNameLower = ex.name.toLowerCase().trim();
    const synonyms = COMMON_SYNONYMS[exNameLower] || [];

    for (const syn of synonyms) {
      if (syn === cleanRaw || slugifyExerciseName(syn) === targetSlug) {
        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          isCustom: !ex.isOfficial,
          matchType: "SYNONYM",
          confidence: 0.95,
        };
      }
    }
  }

  // Stage 3: Fuzzy Similarity Match (> 0.75 score)
  let bestMatch: ExerciseMatchResult | null = null;
  let highestScore = 0;

  for (const ex of exercises) {
    const score = calculateSimilarity(cleanRaw, ex.name);
    if (score > 0.75 && score > highestScore) {
      highestScore = score;
      bestMatch = {
        exerciseId: ex.id,
        exerciseName: ex.name,
        isCustom: !ex.isOfficial,
        matchType: "FUZZY",
        confidence: score,
      };
    }
  }

  return bestMatch;
}
