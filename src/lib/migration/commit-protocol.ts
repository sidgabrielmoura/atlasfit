export interface ImportCommitFailure { recordIds: string[]; recordId?: string; name: string; code: string; message: string }
export interface ImportCommitResult {
  success: boolean; status: "COMPLETED" | "PARTIAL"; alreadyCommitted?: boolean;
  total: number; processed: number; succeeded: number; failed: number;
  failures: ImportCommitFailure[]; interrupted: boolean;
}
export type ImportCommitEvent =
  | { type: "started"; total: number }
  | { type: "progress"; total: number; processed: number; succeeded: number; failed: number; recordIds: string[]; failure?: ImportCommitFailure }
  | { type: "finished"; result: ImportCommitResult }
  | { type: "error"; message: string };

export function importErrorMessage(value: unknown, fallback = "Não foi possível concluir a importação."): string {
  if (typeof value === "string" && value.trim() && value !== "[object Object]" && !value.trim().startsWith("<")) return value.slice(0, 600);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const field of ["message", "error"]) {
      if (typeof object[field] === "string") return importErrorMessage(object[field], fallback);
      const nested = object[field];
      if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).message === "string") return importErrorMessage((nested as Record<string, unknown>).message, fallback);
    }
  }
  return fallback;
}
export async function readImportResponseError(response: Response, fallback?: string) {
  const text = await response.text();
  try { return importErrorMessage(JSON.parse(text), fallback); }
  catch { return importErrorMessage(text, fallback); }
}

/** Handles JSON lines and UTF-8 characters split at arbitrary network boundaries. */
export async function readImportCommitStream(response: Response, onEvent: (event: ImportCommitEvent) => void) {
  if (!response.ok) throw new Error(await readImportResponseError(response));
  if (!response.body || !response.headers.get("content-type")?.includes("application/x-ndjson")) throw new Error("Não foi possível acompanhar a confirmação. Abra a revisão antes de tentar novamente.");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = "", finished = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ImportCommitEvent;
    if (event.type === "error") throw new Error(importErrorMessage(event.message));
    if (event.type === "finished") finished = true;
    onEvent(event);
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 1_000_000) throw new Error("Resposta de importação inválida.");
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 1); }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!finished) throw new Error("A conexão foi interrompida. Os cadastros concluídos foram preservados. Abra a revisão para conferir os restantes.");
  } finally { reader.releaseLock(); }
}
