"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import * as Ably from "ably";
import { useSession } from "next-auth/react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { chatActions, chatStore } from "@/stores/chat.store";

const AblyContext = createContext<Ably.Realtime | null>(null);

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
  const activeConversationId = chatSnap.activeConversationId;
  const userId = session?.user?.id;
  const userName = session?.user?.name || "Usuário";

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const workspaceChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const conversationChannelRef = useRef<Ably.RealtimeChannel | null>(null);

  // 1. Initialize Ably Connection
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;

    // Create client using token request authentication
    const client = new Ably.Realtime({
      authUrl: "/api/ably/token",
      autoConnect: true,
    });

    ablyRef.current = client;

    client.connection.on("connected", () => {
      console.log("[Ably Realtime] Connected successfully.");
    });

    client.connection.on("failed", (err) => {
      console.error("[Ably Realtime] Connection failed:", err);
    });

    return () => {
      client.close();
      ablyRef.current = null;
    };
  }, [userId]);

  // 2. Subscribe to Workspace Chat Channel & Presence
  useEffect(() => {
    const client = ablyRef.current;
    if (!client || !activeWorkspaceId || !userId) return;

    const channelName = `workspace:${activeWorkspaceId}:chat`;
    const channel = client.channels.get(channelName);
    workspaceChannelRef.current = channel;

    // Listen to new conversations in the workspace
    channel.subscribe("conversation:new", (message) => {
      const conv = message.data;
      chatActions.addConversation(conv);
    });
    // Listen to conversation list updates (last message, etc.)
    channel.subscribe("conversation:update", (message) => {
      const { conversationId, messageId, lastMessage, lastMessageAt, senderId } = message.data;
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
    });

    // Handle presence: Mark users as online/offline
    channel.presence.subscribe((presenceMsg) => {
      const { action, clientId } = presenceMsg;
      if (action === "enter" || action === "present" || action === "update") {
        chatActions.setPresence(clientId, true);
      } else if (action === "leave") {
        chatActions.setPresence(clientId, false);
      }
    });

    // Enter presence on the workspace channel
    channel.presence.enter({ name: userName });

    // Fetch initial presence members
    channel.presence.get()
      .then((members) => {
        if (members) {
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
      channel.presence.leave();
      channel.unsubscribe();
      workspaceChannelRef.current = null;
    };
  }, [activeWorkspaceId, userId, userName]);

  // 3. Subscribe to Active Conversation Channel
  useEffect(() => {
    const client = ablyRef.current;
    if (!client || !activeConversationId || !userId) return;

    const channelName = `conversation:${activeConversationId}`;
    const channel = client.channels.get(channelName);
    conversationChannelRef.current = channel;

    // Listen to new messages
    channel.subscribe("message:new", (event) => {
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
          if (res.ok) {
            chatActions.resetUnread(activeConversationId, userId);
          }
        });
      }
    });

    // Listen to status updates (read, delivered)
    channel.subscribe("message:status", (event) => {
      const { messageId, status } = event.data;
      chatActions.updateMessageStatus(activeConversationId, messageId, status);
    });

    // Listen to edited messages
    channel.subscribe("message:update", (event) => {
      const updatedMsg = event.data;
      chatActions.updateMessageContent(activeConversationId, updatedMsg.id, updatedMsg.content);
    });

    // Listen to deleted messages
    channel.subscribe("message:delete", (event) => {
      const { messageId, deletedMessage } = event.data;
      chatActions.deleteMessage(activeConversationId, messageId, deletedMessage);
    });

    // Listen to bulk read notifications from the other user
    channel.subscribe("message:read_all", (event) => {
      const { readerId } = event.data;
      if (readerId !== userId) {
        const msgs = chatStore.messages[activeConversationId] || [];
        msgs.forEach((m) => {
          if (m.senderId === userId && m.status !== "READ") {
            chatActions.updateMessageStatus(activeConversationId, m.id, "READ");
          }
        });
      }
    });

    // Listen to typing status indicator
    channel.subscribe("typing", (event) => {
      const { userId: typerId, name: typerName, isTyping } = event.data;
      if (typerId !== userId) {
        chatActions.setTyping(activeConversationId, typerId, typerName, isTyping);
      }
    });

    // Automatically mark existing unread messages as read on entry
    fetch("/api/chat/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConversationId }),
    }).then((res) => {
      if (res.ok) {
        chatActions.resetUnread(activeConversationId, userId);
      }
    });

    return () => {
      channel.unsubscribe();
      conversationChannelRef.current = null;
    };
  }, [activeConversationId, userId]);

  return (
    <AblyContext.Provider value={ablyRef.current}>
      {children}
    </AblyContext.Provider>
  );
}
