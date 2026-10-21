/** React effects cannot await Ably setup/cleanup; handle their rejected promises. */
export async function runRealtimeOperation(operation: () => Promise<unknown> | void): Promise<void> {
  try { await operation(); }
  catch { console.warn("[Ably] Operação de tempo real indisponível."); }
}
