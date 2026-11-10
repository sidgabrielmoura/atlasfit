import { unstable_cache, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { publicExerciseCatalog } from "@/lib/exercises/catalog-visibility";

export const PUBLIC_CACHE_TAGS = {
  platform: "atlasfit:public-platform-settings",
  exercises: "atlasfit:public-exercise-catalog",
  muscleGroups: "atlasfit:muscle-groups",
} as const;

const publicSettingKeys = ["platform_name", "support_email", "support_whatsapp"] as const;
type PublicSettings = Partial<Record<(typeof publicSettingKeys)[number], string>>;

// Cache only public data. Cookies, identity, permissions, balances and financial
// state must be resolved outside these functions on every request.
export const getPublicPlatformSettings = unstable_cache(async (): Promise<PublicSettings> => {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...publicSettingKeys] } },
    select: { key: true, value: true },
  });
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
}, ["atlasfit:public-platform-settings:v1"], { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.platform] });

export const getPublicExerciseCatalog = unstable_cache(async () => {
  return prisma.exercise.findMany({ where: publicExerciseCatalog, select: { id: true, name: true } });
}, ["atlasfit:public-exercise-catalog:v1"], { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.exercises] });

const defaultMuscleGroups = [
  "Trapézio", "Ombro", "Costas", "Peito", "Tríceps", "Bíceps", "Abdomen",
  "Antebraço", "Glúteo", "Posterior de perna", "Quadríceps", "Panturrilha",
];

export const getMuscleGroups = unstable_cache(async () => {
  let groups = await prisma.muscleGroup.findMany({ orderBy: { name: "asc" } });
  const existing = new Set(groups.map(group => group.name));
  const missing = defaultMuscleGroups.filter(name => !existing.has(name));
  // Preserve the legacy default initialization without twelve writes per GET.
  // skipDuplicates also makes concurrent cold starts safe.
  if (missing.length) {
    await prisma.muscleGroup.createMany({ data: missing.map(name => ({ name })), skipDuplicates: true });
    groups = await prisma.muscleGroup.findMany({ orderBy: { name: "asc" } });
  }
  // The cache serializes JSON; keep cold and warm return types identical.
  return groups.map(group => ({ ...group, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() }));
}, ["atlasfit:muscle-groups:v1"], { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.muscleGroups] });

export function invalidatePublicPlatformSettings() {
  revalidateTag(PUBLIC_CACHE_TAGS.platform, { expire: 0 });
}

export function invalidatePublicExerciseCatalog() {
  revalidateTag(PUBLIC_CACHE_TAGS.exercises, { expire: 0 });
}

export function invalidateMuscleGroups() {
  revalidateTag(PUBLIC_CACHE_TAGS.muscleGroups, { expire: 0 });
}
