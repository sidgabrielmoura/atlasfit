export interface ExerciseCandidate { id: string; name: string }
export interface AutomaticExerciseMatch { exerciseId: string; exerciseName: string; confidence: number; matchType: "EXACT" | "SYNONYM" | "FUZZY" }

export function normalizeExerciseName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").replace(/\b(com|de|do|da|dos|das|no|na|nos|nas|o|a)\b/g, " ")
    .replace(/\breta\b/g, "reto").replace(/\bhalter\b/g, "halteres").replace(/\s+/g, " ").trim();
}
const aliases = [
  ["supino reto barra", "supino reto", "bench press", "supino banco reto"],
  ["supino inclinado barra", "supino inclinado", "incline bench press"],
  ["puxada frontal", "puxada alta", "puxada frente", "lat pulldown", "pulley frente"],
  ["remada curvada", "remada curvada barra", "bent over row"],
  ["agachamento livre", "agachamento", "agachamento barra", "squat"],
  ["leg press 45", "leg press", "leg 45", "legpress"],
  ["rosca direta barra", "rosca direta", "barbell curl"],
  ["triceps pulley", "triceps pushdown", "pushdown"],
].map(group => group.map(normalizeExerciseName));
const sorted = (name: string) => name.split(" ").sort().join(" ");
const alternatives = [["reto", "inclinado", "declinado"], ["barra", "halteres", "maquina"], ["testa", "pulley", "frances"]];
function dice(left: string, right: string) {
  if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;
  const pairs = new Map<string, number>();
  for (let i = 0; i < left.length - 1; i++) { const pair = left.slice(i, i + 2); pairs.set(pair, (pairs.get(pair) || 0) + 1); }
  let hits = 0;
  for (let i = 0; i < right.length - 1; i++) { const pair = right.slice(i, i + 2), count = pairs.get(pair) || 0; if (count) { hits++; pairs.set(pair, count - 1); } }
  return 2 * hits / (left.length + right.length - 2);
}

/** Rank normalized candidates once per batch; never invent an unrelated match. */
export function matchExerciseBatch(names: readonly string[], catalog: readonly ExerciseCandidate[]): (AutomaticExerciseMatch | null)[] {
  const candidates = catalog.map(row => { const normalized = normalizeExerciseName(row.name); return { ...row, normalized, sorted: sorted(normalized), tokens: new Set(normalized.split(" ")) }; }).sort((a, b) => a.id.localeCompare(b.id));
  const matches = new Map<string, AutomaticExerciseMatch | null>();
  return names.map(name => {
    const normalized = normalizeExerciseName(name);
    if (!normalized) return null;
    if (matches.has(normalized)) {
      const existing = matches.get(normalized);
      return existing ? { ...existing } : null;
    }
    const left = new Set(normalized.split(" ")), sortedName = sorted(normalized);
    const synonyms = new Set(aliases.filter(group => group.includes(normalized)).flat());
    let best: AutomaticExerciseMatch | null = null;
    for (const candidate of candidates) {
      const exact = sortedName === candidate.sorted;
      const synonym = !exact && synonyms.has(candidate.normalized);
      const right = candidate.tokens;
      let hits = 0;
      for (const word of left) if (right.has(word)) hits++;
      const overlap = 0.7 * hits / (left.size + right.size - hits);
      // Dice cannot exceed one. Skip allocations/string work when even that
      // upper bound cannot reach the threshold or beat the current candidate.
      if (!exact && !synonym && (overlap + 0.3 < 0.58 || (best && overlap + 0.3 <= best.confidence))) continue;
      let score = exact ? 1 : synonym ? 0.96 : overlap + 0.3 * dice(sortedName, candidate.sorted);
      // Distinct angles/equipment/movements must not collapse to a generic shared word.
      for (const group of alternatives) {
        const a = group.find(token => left.has(token)), b = group.find(token => right.has(token));
        if (a && b && a !== b) score *= 0.45;
      }
      if (score < 0.58 || (best && score <= best.confidence)) continue;
      best = { exerciseId: candidate.id, exerciseName: candidate.name, confidence: score, matchType: exact ? "EXACT" : synonym ? "SYNONYM" : "FUZZY" };
      if (score === 1) break;
    }
    const result = best ? { ...best, confidence: Math.round(best.confidence * 100) / 100 } : null;
    matches.set(normalized, result);
    return result;
  });
}
