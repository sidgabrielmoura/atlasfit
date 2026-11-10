"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { importErrorMessage, readImportCommitStream, type ImportCommitResult } from "@/lib/migration/commit-protocol";
import { ImportCommitProgressCard } from "@/components/migration/import-commit-progress-card";

type StartInput = { workspaceId: string; jobId: string; commitVersion: number; unitId: string; apiBasePath: string; reviewRoute: string };
export interface ImportCommitState extends StartInput {
  phase: "running" | "finished" | "error";
  total: number; processed: number; succeeded: number; failed: number;
  outcomes: Record<string, { status: "COMMITTED" | "FAILED"; message?: string; code?: string; reviewStatus?: string }>;
  result?: ImportCommitResult; message?: string;
}
const Context = createContext<{ state: ImportCommitState | null; start: (input: StartInput) => Promise<ImportCommitResult | null> } | null>(null);
export const useImportCommit = () => useContext(Context);

/** Mounted above routes, so navigation inside the app does not close the one POST stream. */
export function ImportCommitProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const workspaceId = useSnapshot(workspaceStore).activeWorkspaceId;
  const scope = `${session?.user?.id || ""}:${workspaceId || ""}`;
  const [entry, setEntry] = useState<{ scope: string; state: ImportCommitState } | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => { return () => { active.current?.abort(); active.current = null; }; }, [scope]);

  const start = useCallback(async (input: StartInput) => {
    if (active.current || workspaceStore.activeWorkspaceId !== input.workspaceId) return null;
    const controller = new AbortController();
    active.current = controller;
    let result: ImportCommitResult | null = null;
    const initial: ImportCommitState = { ...input, phase: "running", total: 0, processed: 0, succeeded: 0, failed: 0, outcomes: {} };
    setEntry({ scope, state: initial });
    const update = (change: (previous: ImportCommitState) => ImportCommitState) => {
      if (active.current !== controller || controller.signal.aborted) return;
      setEntry(previous => previous?.scope === scope ? { scope, state: change(previous.state) } : previous);
    };
    try {
      const response = await fetch(`${input.apiBasePath}/${input.jobId}/commit`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ commitVersion: input.commitVersion, unitId: input.unitId }), signal: controller.signal,
      });
      await readImportCommitStream(response, event => {
        if (event.type === "started") update(previous => ({ ...previous, total: event.total }));
        if (event.type === "progress") update(previous => ({ ...previous, total: event.total, processed: event.processed, succeeded: event.succeeded, failed: event.failed,
          outcomes: { ...previous.outcomes, ...Object.fromEntries(event.recordIds.map(id => [id, event.failure ? { status: "FAILED", message: event.failure.message, code: event.failure.code, reviewStatus: !event.failure.recordId || event.failure.recordId === id ? "PENDING" : undefined } : { status: "COMMITTED" }])) } }));
        if (event.type === "finished") { result = event.result; update(previous => ({ ...previous, ...event.result, phase: "finished", result: event.result })); }
      });
      return result;
    } catch (error) {
      update(previous => ({ ...previous, phase: "error", message: importErrorMessage(error, "A conexão foi interrompida. Abra a revisão para conferir os cadastros preservados antes de continuar.") }));
      return null;
    } finally { if (active.current === controller) active.current = null; }
  }, [scope]);
  const state = entry?.scope === scope ? entry.state : null;
  return <Context.Provider value={{ state, start }}>{children}{state && <ImportCommitProgressCard state={state} onDismiss={() => setEntry(null)} />}</Context.Provider>;
}
