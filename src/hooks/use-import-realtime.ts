"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useAbly, useAblyCapability } from "@/providers/ably-provider";
import { listenToImportChannel, type ImportQuotaBalance, type MigrationUpdate } from "@/lib/migration/realtime";

function useImportChannel(channelName: string | null, event: string, onMessage: (data: any) => void, onSync: () => void) {
  const ably = useAbly();
  const capability = useAblyCapability();
  const handlers = useRef({ onMessage, onSync });
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { handlers.current = { onMessage, onSync }; }, [onMessage, onSync]);
  useEffect(() => {
    if (!ably || !channelName) return;
    try {
      const capabilities = JSON.parse(capability || "{}");
      if (!capabilities[channelName]?.includes("subscribe")) return;
    } catch { return; }
    const channel = ably.channels.get(channelName);
    return listenToImportChannel(channel, event, message => {
      setUnavailable(false);
      handlers.current.onMessage(message.data);
    }, () => {
      setUnavailable(false);
      handlers.current.onSync();
    }, () => setUnavailable(true));
  }, [ably, channelName, event, capability]);
  return !ably || unavailable;
}

export function useMigrationRealtime(workspaceId: string | null | undefined, onUpdate: (update: MigrationUpdate) => void, onSync: () => void) {
  return useImportChannel(workspaceId ? `migration:${workspaceId}` : null, "job_updated", data => {
    if (typeof data?.jobId === "string") onUpdate(data);
  }, onSync);
}

export function useImportCreditRealtime(workspaceId: string | null | undefined, role: "gym" | "personal", onBalance: (balance: ImportQuotaBalance) => void, onSync: () => void) {
  const { data: session } = useSession();
  const channelName = workspaceId ? role === "gym" ? `migration:${workspaceId}` : session?.user?.id ? `user:${session.user.id}` : null : null;
  useImportChannel(channelName, "import:credits_updated", data => {
    if (data?.workspaceId === workspaceId && typeof data.quotaBalance?.credits === "number") onBalance(data.quotaBalance);
  }, onSync);
}
