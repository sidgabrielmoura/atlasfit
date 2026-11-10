"use client";

import { useCallback, useMemo } from "react";
import { readImportResponseError } from "@/lib/migration/commit-protocol";
import { normalizeExerciseName, type AutomaticExerciseMatch } from "@/lib/migration/matching/exercise-similarity";

/** One request per uncached group of names, including in-flight deduplication. */
export function useImportExerciseMatches(endpoint: string, workspaceId: string | null | undefined, role: "gym" | "personal") {
  const cache = useMemo(() => new Map<string, Promise<AutomaticExerciseMatch | null>>(), [endpoint, workspaceId, role]);
  return useCallback(async (names: string[]) => {
    const missing = [...new Map(names.filter(name => !cache.has(normalizeExerciseName(name))).map(name => [normalizeExerciseName(name), name])).values()];
    for (let offset = 0; offset < missing.length; offset += 100) {
      const batch = missing.slice(offset, offset + 100);
      const request = (async () => {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ names: batch, ...(role === "gym" ? { workspaceId } : {}) }) });
        if (!response.ok) throw new Error(await readImportResponseError(response, "Não foi possível buscar exercícios semelhantes."));
        const result = await response.json();
        if (!Array.isArray(result.matches) || result.matches.length !== batch.length) throw new Error("Resposta inválida ao buscar exercícios semelhantes.");
        return result.matches as (AutomaticExerciseMatch | null)[];
      })();
      batch.forEach((name, index) => {
        const key = normalizeExerciseName(name);
        const match = request.then(matches => matches[index]).catch(error => { cache.delete(key); throw error; });
        // All promises are also awaited below; handle siblings on a failed batch.
        void match.catch(() => {});
        cache.set(key, match);
      });
    }
    return Promise.all(names.map(name => cache.get(normalizeExerciseName(name))!));
  }, [cache, endpoint, workspaceId, role]);
}
