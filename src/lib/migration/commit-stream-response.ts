import type { ImportCommitEvent, ImportCommitResult } from "./commit-protocol";
import { importErrorMessage } from "./commit-protocol";

export function importCommitStreamResponse(run: (options: { onProgress: (event: ImportCommitEvent) => void; isCancelled: () => boolean }) => Promise<ImportCommitResult>, signal: AbortSignal) {
  let cancelled = false;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ImportCommitEvent) => {
        if (cancelled || signal.aborted) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); }
        catch { cancelled = true; }
      };
      try { await run({ onProgress: send, isCancelled: () => cancelled || signal.aborted }); }
      catch { send({ type: "error", message: importErrorMessage(null, "A confirmação foi interrompida. Os cadastros concluídos foram preservados. Abra a revisão para continuar.") }); }
      finally { if (!cancelled) { try { controller.close(); } catch { /* Client disconnected. */ } } }
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}
