"use client";

import { runRealtimeOperation } from "@/lib/realtime-operation";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { useSession } from "next-auth/react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { chatActions, chatStore } from "@/stores/chat.store";
import { playRestChimeSound } from "@/lib/audio/sound-alert";
import { toast } from "sonner";

const AblyContext = createContext<Ably.Realtime | null>(null);

function canSubscribe(capability: string | undefined, channelName: string) {
  try {
    const capabilities = JSON.parse(capability || "{}");
    return Array.isArray(capabilities[channelName]) && capabilities[channelName].includes("subscribe");
  } catch { return false; }
}

const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Tone 1: B5 Chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
    gain1.gain.setValueAtTime(0.06, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Tone 2: E6 Chime (slightly delayed for premium double bell effect)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.065);
    gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.065);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc2.start(ctx.currentTime + 0.065);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("Failed to play Web Audio chime:", err);
  }
};

export function useAbly() {
  return useContext(AblyContext);
}

interface AblyProviderProps {
  children: React.ReactNode;
}

export function AblyProvider({ children }: AblyProviderProps) {
  const { data: session } = useSession();
  const workspaceSnap = useSnapshot(workspaceStore);
  const chatSnap = useSnapshot(chatStore);

  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;
  const isGymWorkspace = workspaceSnap.activeWorkspace?.type === "GYM";
  const activeConversationId = chatSnap.activeConversationId;
  const userId = session?.user?.id;
  const userName = session?.user?.name || "Usuário";

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const scope = JSON.stringify([userId, activeWorkspaceId, isGymWorkspace]);
  const [authorized, setAuthorized] = useState<{ client: Ably.Realtime; scope: string; capability: string } | null>(null);
  // Mask the previous client during render, before passive-effect cleanup runs.
  const ablyClient = authorized?.scope === scope && authorized.client === ablyRef.current ? authorized.client : null;
  const capability = authorized?.scope === scope ? authorized.capability : undefined;

  // 1. Initialize Ably Connection
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;

    // Create client using token request authentication
    const client = new Ably.Realtime({
      authUrl: activeWorkspaceId ? `/api/ably/token?workspaceId=${encodeURIComponent(activeWorkspaceId)}` : "/api/ably/token",
      autoConnect: false,
    });

    ablyRef.current = client;

    let disposed = false;
    // A new scope gets a new connection and fresh server-issued capabilities.
    // Subscriptions are exposed only after authorization succeeds.
    void client.auth.authorize().then(token => {
      if (!disposed && ablyRef.current === client) setAuthorized({ client, scope, capability: token.capability });
    }).catch(() => {
      if (!disposed) console.warn("[Ably] Autorização de tempo real indisponível.");
      client.close();
    });

    return () => {
      disposed = true;
      client.close();
      if (ablyRef.current === client) ablyRef.current = null;
    };
  }, [userId, activeWorkspaceId, isGymWorkspace, scope]);

  // 2. Subscribe to Workspace Chat Channel & Presence
  useEffect(() => {
    const client = ablyClient;
    if (!client || !activeWorkspaceId || !userId) return;

    let disposed = false;
    const current = () => !disposed && ablyRef.current === client && workspaceStore.activeWorkspaceId === activeWorkspaceId;
    const channelName = `user:${userId}:workspace:${activeWorkspaceId}:chat`;
    if (!canSubscribe(capability, channelName)) return;
    const channel = client.channels.get(channelName);

    // Listen to new conversations in the workspace
    runRealtimeOperation(() => channel.subscribe("conversation:new", (message) => {
      const conv = message.data;
      if (!current() || conv?.workspaceId !== activeWorkspaceId) return;
      chatActions.addConversation(conv);
    }));
    // Listen to conversation list updates (last message, etc.)
    runRealtimeOperation(() => channel.subscribe("conversation:update", (message) => {
      const { conversationId, messageId, lastMessage, lastMessageAt, senderId } = message.data;
      if (!current() || !chatStore.conversations.some(conversation => conversation.id === conversationId && conversation.workspaceId === activeWorkspaceId)) return;
      chatActions.updateConversation(conversationId, lastMessage, lastMessageAt, senderId);

      // Increment unread count and trigger delivery receipt if we are not currently viewing this conversation
      if (chatStore.activeConversationId !== conversationId && senderId !== userId) {
        chatActions.incrementUnread(conversationId, userId);
        playNotificationSound();

        if (messageId) {
          fetch(`/api/chat/messages/${messageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DELIVERED" }),
          }).catch((err) => console.error("Error sending delivery receipt:", err));
        }
      }
    }));

    // Handle presence: Mark users as online/offline
    const presenceName = isGymWorkspace ? `workspace:${activeWorkspaceId}:user:${userId}:presence` : `workspace:${activeWorkspaceId}:presence`;
    if (!canSubscribe(capability, presenceName)) {
      return () => { disposed = true; channel.unsubscribe(); void runRealtimeOperation(() => channel.detach()); };
    }
    const presenceChannel = client.channels.get(presenceName);
    runRealtimeOperation(() => presenceChannel.presence.subscribe((presenceMsg) => {
      if (!current()) return;
      const { action, clientId } = presenceMsg;
      if (action === "enter" || action === "present" || action === "update") {
        chatActions.setPresence(clientId, true);
      } else if (action === "leave") {
        chatActions.setPresence(clientId, false);
      }
    }));

    // Enter presence on the workspace channel
    runRealtimeOperation(() => presenceChannel.presence.enter({ name: userName }));

    // Fetch initial presence members
    presenceChannel.presence.get()
      .then((members) => {
        if (members && current()) {
          members.forEach((m) => {
            if (m.clientId) {
              chatActions.setPresence(m.clientId, true);
            }
          });
        }
      })
      .catch((err) => {
        console.error("[Ably Presence] Error getting presence members:", err);
      });

    return () => {
      disposed = true;
      runRealtimeOperation(() => presenceChannel.presence.leave());
      presenceChannel.presence.unsubscribe();
      void runRealtimeOperation(() => presenceChannel.detach());
      channel.unsubscribe();
    };
  }, [ablyClient, capability, activeWorkspaceId, isGymWorkspace, userId, userName]);

  // GYM presence is visible only for contacts from the server's unit/portfolio scope.
  useEffect(() => {
    const client = ablyClient;
    if (!client || !isGymWorkspace || !activeWorkspaceId || !userId) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && ablyRef.current === client && workspaceStore.activeWorkspaceId === activeWorkspaceId;
    const channels: Ably.RealtimeChannel[] = [];
    void (async () => {
      const response = await fetch(`/api/chat/contacts?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, { signal: controller.signal });
      if (!response.ok) return;
      const contacts: unknown = await response.json();
      if (!Array.isArray(contacts) || !current()) return;
      for (const contact of contacts) {
        if (typeof contact !== "object" || !contact || typeof contact.id !== "string") continue;
        const presence = client.channels.get(`workspace:${activeWorkspaceId}:user:${contact.id}:presence`);
        channels.push(presence);
        if (!canSubscribe(capability, presence.name)) continue;
        runRealtimeOperation(() => presence.presence.subscribe(message => { if (current()) chatActions.setPresence(message.clientId, message.action !== "leave"); }));
        const members = await presence.presence.get();
        if (!current()) return;
        for (const member of members) if (member.clientId) chatActions.setPresence(member.clientId, true);
      }
    })().catch(error => { if (!controller.signal.aborted) console.error("[GYM Contact Presence]", error); });
    return () => {
      controller.abort();
      for (const presence of channels) { presence.presence.unsubscribe(); void runRealtimeOperation(() => presence.detach()); }
    };
  }, [ablyClient, capability, activeWorkspaceId, isGymWorkspace, userId]);

  // 3. Subscribe to Active Conversation Channel
  useEffect(() => {
    const client = ablyClient;
    if (!client || !activeConversationId || !userId) return;

    let disposed = false;
    const current = () => !disposed && ablyRef.current === client && workspaceStore.activeWorkspaceId === activeWorkspaceId && chatStore.activeConversationId === activeConversationId;
    const channelName = `conversation:${activeConversationId}`;
    if (!canSubscribe(capability, channelName)) return;
    const channel = client.channels.get(channelName);

    // Listen to new messages
    runRealtimeOperation(() => channel.subscribe("message:new", (event) => {
      if (!current()) return;
      const msg = event.data;
      chatActions.addMessage(activeConversationId, msg);

      // Automatically mark messages as read if we are currently viewing this conversation
      if (msg.senderId !== userId) {
        playNotificationSound();
        fetch("/api/chat/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: activeConversationId }),
        }).then((res) => {
          if (res.ok && current()) {
            chatActions.resetUnread(activeConversationId, userId);
          }
        });
      }
    }));

    // Listen to status updates (read, delivered)
    runRealtimeOperation(() => channel.subscribe("message:status", (event) => {
      if (!current()) return;
      const { messageId, status } = event.data;
      chatActions.updateMessageStatus(activeConversationId, messageId, status);
    }));

    // Listen to edited messages
    runRealtimeOperation(() => channel.subscribe("message:update", (event) => {
      if (!current()) return;
      const updatedMsg = event.data;
      chatActions.updateMessageContent(activeConversationId, updatedMsg.id, updatedMsg.content);
    }));

    // Listen to deleted messages
    runRealtimeOperation(() => channel.subscribe("message:delete", (event) => {
      if (!current()) return;
      const { messageId, deletedMessage } = event.data;
      chatActions.deleteMessage(activeConversationId, messageId, deletedMessage);
    }));

    // Listen to bulk read notifications from the other user
    runRealtimeOperation(() => channel.subscribe("message:read_all", (event) => {
      if (!current()) return;
      const { readerId } = event.data;
      if (readerId !== userId) {
        const msgs = chatStore.messages[activeConversationId] || [];
        msgs.forEach((m) => {
          if (m.senderId === userId && m.status !== "READ") {
            chatActions.updateMessageStatus(activeConversationId, m.id, "READ");
          }
        });
      }
    }));

    // Listen to typing status indicator
    const typingChannel = client.channels.get(`conversation:${activeConversationId}:typing`);
    runRealtimeOperation(() => typingChannel.subscribe("typing", (event) => {
      if (!current()) return;
      const { userId: typerId, name: typerName, isTyping } = event.data;
      if (typerId !== userId && event.clientId === typerId) {
        chatActions.setTyping(activeConversationId, typerId, typerName, isTyping);
      }
    }));

    // Automatically mark existing unread messages as read on entry
    fetch("/api/chat/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConversationId }),
    }).then((res) => {
      if (res.ok && current()) {
        chatActions.resetUnread(activeConversationId, userId);
      }
    });

    return () => {
      disposed = true;
      channel.unsubscribe();
      typingChannel.unsubscribe();
      void runRealtimeOperation(() => typingChannel.detach());
      void runRealtimeOperation(() => channel.detach());
    };
  }, [ablyClient, capability, activeWorkspaceId, activeConversationId, userId]);

  // 4. Global Migration Realtime Listener for Sound Alerts & Toast Notifications
  useEffect(() => {
    const client = ablyClient;
    if (!client || !activeWorkspaceId) return;

    const channelName = `migration:${activeWorkspaceId}`;
    if (!canSubscribe(capability, channelName)) return;
    const migrationChannel = client.channels.get(channelName);
    let disposed = false;

    const handleMigrationUpdate = (message: any) => {
      const payload = message.data;
      if (!payload || disposed || ablyRef.current !== client || workspaceStore.activeWorkspaceId !== activeWorkspaceId) return;

      if (payload.status === "REVIEW" || payload.status === "COMPLETED") {
        playRestChimeSound();
        toast.success("Importação Concluída!", {
          description: "A importação dos seus alunos e treinos foi finalizada.",
        });
      } else if (payload.status === "FAILED") {
        playRestChimeSound();
        toast.error("Importação não concluída", {
          description: "Houve um problema durante o processamento da importação.",
        });
      }
    };

    runRealtimeOperation(() => migrationChannel.subscribe("job_updated", handleMigrationUpdate));

    return () => {
      disposed = true;
      migrationChannel.unsubscribe("job_updated", handleMigrationUpdate);
      void runRealtimeOperation(() => migrationChannel.detach());
    };
  }, [ablyClient, capability, activeWorkspaceId]);

  return (
    <AblyContext.Provider value={ablyClient}>
      {children}
    </AblyContext.Provider>
  );
}
