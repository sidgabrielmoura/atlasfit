import { proxy } from "valtio";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO";
  content?: string | null;
  attachment?: any;
  replyToId?: string | null;
  status: "SENDING" | "SENT" | "DELIVERED" | "READ";
  createdAt: string | Date;
  updatedAt: string | Date;
  sender?: {
    id: string;
    name: string;
    image?: string | null;
  };
  replyTo?: {
    id: string;
    type: string;
    content?: string | null;
    attachment?: any;
    sender?: {
      id: string;
      name: string;
    };
  } | null;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  unreadCount: number;
  joinedAt: string | Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export interface Conversation {
  id: string;
  workspaceId: string;
  type: "DIRECT" | "GROUP" | "WHATSAPP" | "INSTAGRAM";
  lastMessage?: string | null;
  lastMessageAt?: string | Date | null;
  lastSenderId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  participants: ConversationParticipant[];
}

export interface UploadProgress {
  fileId: string;
  name: string;
  size: number;
  progress: number;
  cancelUpload?: () => void;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  nextCursors: Record<string, string | null>; // conversationId -> nextCursor
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isTyping: Record<string, Record<string, { name: string; timestamp: number }>>; // conversationId -> userId -> typingInfo
  presence: Record<string, boolean>; // userId -> isOnline
  replyToMessage: Message | null;
  activeUploads: UploadProgress[];
}

export const chatStore = proxy<ChatState>({
  conversations: [],
  activeConversationId: null,
  messages: {},
  nextCursors: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isTyping: {},
  presence: {},
  replyToMessage: null,
  activeUploads: [],
});

export const chatActions = {
  setConversations(conversations: Conversation[]) {
    chatStore.conversations = conversations;
  },

  addConversation(conversation: Conversation) {
    const exists = chatStore.conversations.some((c) => c.id === conversation.id);
    if (!exists) {
      chatStore.conversations.unshift(conversation);
    }
  },

  updateConversation(convId: string, lastMessage: string, lastMessageAt: string | Date, lastSenderId?: string | null) {
    const conv = chatStore.conversations.find((c) => c.id === convId);
    if (conv) {
      conv.lastMessage = lastMessage;
      conv.lastMessageAt = lastMessageAt;
      if (lastSenderId !== undefined) {
        conv.lastSenderId = lastSenderId;
      }
      // Re-sort conversations by lastMessageAt desc
      chatStore.conversations = [...chatStore.conversations].sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return dateB - dateA;
      });
    }
  },

  incrementUnread(convId: string, currentUserId: string) {
    const conv = chatStore.conversations.find((c) => c.id === convId);
    if (conv) {
      conv.participants.forEach((p) => {
        if (p.userId === currentUserId) {
          p.unreadCount += 1;
        }
      });
    }
  },

  resetUnread(convId: string, currentUserId: string) {
    const conv = chatStore.conversations.find((c) => c.id === convId);
    if (conv) {
      conv.participants.forEach((p) => {
        if (p.userId === currentUserId) {
          p.unreadCount = 0;
        }
      });
    }
  },

  setActiveConversationId(id: string | null) {
    chatStore.activeConversationId = id;
    chatStore.replyToMessage = null; // Clear replies context when swapping conversation
  },

  setMessages(convId: string, messages: Message[], nextCursor: string | null) {
    chatStore.messages[convId] = messages;
    chatStore.nextCursors[convId] = nextCursor;
  },

  appendOlderMessages(convId: string, messages: Message[], nextCursor: string | null) {
    const existing = chatStore.messages[convId] || [];
    // Filter duplicates
    const existingIds = new Set(existing.map((m) => m.id));
    const uniqueOlder = messages.filter((m) => !existingIds.has(m.id));
    chatStore.messages[convId] = [...existing, ...uniqueOlder];
    chatStore.nextCursors[convId] = nextCursor;
  },

  addMessage(convId: string, message: Message) {
    if (!chatStore.messages[convId]) {
      chatStore.messages[convId] = [];
    }

    // 1. Check if we are replacing a temporary optimistic message
    if (!message.id.startsWith("temp-")) {
      const tempIndex = chatStore.messages[convId].findIndex(
        (m) =>
          m.id.startsWith("temp-") &&
          m.senderId === message.senderId &&
          m.type === message.type &&
          m.content === message.content
      );

      if (tempIndex !== -1) {
        chatStore.messages[convId][tempIndex] = message;
        return;
      }
    }

    // 2. Prevent duplicates of real messages
    const exists = chatStore.messages[convId].some((m) => m.id === message.id);
    if (!exists) {
      chatStore.messages[convId].unshift(message); // Appends to start (latest first)
    } else {
      const index = chatStore.messages[convId].findIndex((m) => m.id === message.id);
      if (index !== -1) {
        chatStore.messages[convId][index] = message;
      }
    }
  },

  updateMessageStatus(convId: string, messageId: string, status: Message["status"]) {
    const list = chatStore.messages[convId];
    if (list) {
      const msg = list.find((m) => m.id === messageId);
      if (msg) {
        msg.status = status;
      }
    }
  },

  updateMessageContent(convId: string, messageId: string, content: string) {
    const list = chatStore.messages[convId];
    if (list) {
      const msg = list.find((m) => m.id === messageId);
      if (msg) {
        msg.content = content;
      }
    }
  },

  deleteMessage(convId: string, messageId: string, deletedMessage: Message) {
    const list = chatStore.messages[convId];
    if (list) {
      const index = list.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        list[index] = deletedMessage;
      }
    }
  },

  setLoadingConversations(loading: boolean) {
    chatStore.isLoadingConversations = loading;
  },

  setLoadingMessages(loading: boolean) {
    chatStore.isLoadingMessages = loading;
  },

  setTyping(convId: string, userId: string, name: string, isTyping: boolean) {
    if (!chatStore.isTyping[convId]) {
      chatStore.isTyping[convId] = {};
    }

    if (isTyping) {
      chatStore.isTyping[convId][userId] = {
        name,
        timestamp: Date.now(),
      };
    } else {
      delete chatStore.isTyping[convId][userId];
    }
  },

  setPresence(userId: string, isOnline: boolean) {
    chatStore.presence[userId] = isOnline;
  },

  setReplyToMessage(message: Message | null) {
    chatStore.replyToMessage = message;
  },

  addUpload(upload: UploadProgress) {
    chatStore.activeUploads.push(upload);
  },

  updateUploadProgress(fileId: string, progress: number) {
    const upload = chatStore.activeUploads.find((u) => u.fileId === fileId);
    if (upload) {
      upload.progress = progress;
    }
  },

  removeUpload(fileId: string) {
    chatStore.activeUploads = chatStore.activeUploads.filter((u) => u.fileId !== fileId);
  },
};
