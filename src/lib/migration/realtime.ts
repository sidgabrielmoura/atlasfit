import type { ChannelStateChange, Message, RealtimeChannel } from "ably";

export interface ImportQuotaBalance {
  allowed: boolean;
  remaining: number;
  quotaUsed: number;
  quotaTotal: number;
  credits: number;
}

export interface MigrationUpdate {
  jobId: string;
  status?: string;
  processingStep?: string;
  progressPercentage?: number;
  estimatedSecondsRemaining?: number;
  progressMessage?: string;
  creditsConsumed?: number;
  [key: string]: unknown;
}

/** Share a channel without detaching other consumers (including the global alerts). */
export function listenToImportChannel(
  channel: RealtimeChannel,
  event: string,
  onMessage: (message: Message) => void,
  onSync: () => void,
  onUnavailable: () => void,
) {
  let disposed = false;
  const handleMessage = (message: Message) => { if (!disposed) onMessage(message); };
  const handleAttached = (change: ChannelStateChange) => {
    if (!disposed && !change.resumed) onSync();
  };
  const handleUnavailable = () => { if (!disposed) onUnavailable(); };
  channel.on("attached", handleAttached);
  channel.on("update", handleAttached);
  channel.on("suspended", handleUnavailable);
  channel.on("failed", handleUnavailable);
  // A shared provider may already have attached before this consumer mounted.
  if (channel.state === "attached") onSync();
  void channel.subscribe(event, handleMessage).catch(handleUnavailable);
  return () => {
    disposed = true;
    channel.unsubscribe(event, handleMessage);
    channel.off("attached", handleAttached);
    channel.off("update", handleAttached);
    channel.off("suspended", handleUnavailable);
    channel.off("failed", handleUnavailable);
  };
}

/** Preserve live progress when a slower HTTP snapshot finishes after an event. */
export function createMigrationUpdates() {
  let revision = 0;
  const updates = new Map<string, { revision: number; patch: MigrationUpdate }>();
  return {
    revision: () => revision,
    receive(patch: MigrationUpdate) {
      const previous = updates.get(patch.jobId)?.patch;
      // A resumed attempt starts a fresh progress scale.
      const sameStage = previous?.status === patch.status;
      updates.set(patch.jobId, { revision: ++revision, patch: { ...(sameStage ? previous : {}), ...patch } });
    },
    merge<T extends { id: string; status?: string }>(snapshot: T, since: number): T {
      const latest = updates.get(snapshot.id);
      if (!latest) return snapshot;
      if (latest.revision > since) return { ...snapshot, ...latest.patch };
      if (latest.patch.status !== snapshot.status) return snapshot;
      const { progressPercentage, estimatedSecondsRemaining, progressMessage } = latest.patch;
      return { ...snapshot, ...(progressPercentage !== undefined && { progressPercentage }),
        ...(estimatedSecondsRemaining !== undefined && { estimatedSecondsRemaining }),
        ...(progressMessage !== undefined && { progressMessage }) };
    },
  };
}
