"use client";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { gymWorkoutResponseError } from "@/modules/workspaces/domain/gym-workout-client";

export function useWorkoutOptions<T>(workspaceId: string, resource: "students" | "exercises", open: boolean, initial: T[], schema: z.ZodType<{ data: T[]; page: number; hasNext: boolean }>) {
  const [data, setData] = useState(initial);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams({ workspaceId, search, page: String(page) });
        const response = await fetch(`/api/gym/workouts/${resource}?${params}`, { signal: controller.signal });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(gymWorkoutResponseError(body, "Não foi possível carregar as opções."));
        const parsed = schema.safeParse(body);
        if (!parsed.success) throw new Error("Resposta de opções inválida. Recarregue a página.");
        if (controller.signal.aborted) return;
        setData(parsed.data.data); setHasNext(parsed.data.hasNext);
      } catch (cause) {
        if (!controller.signal.aborted) { setData([]); setError(cause instanceof Error ? cause.message : "Falha ao carregar opções."); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [workspaceId, resource, open, search, page, schema]);
  return { data, search, page, hasNext, loading, error, setSearch: (value: string) => { setSearch(value); setPage(1); setData([]); }, setPage };
}
