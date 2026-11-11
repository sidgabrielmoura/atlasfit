import { describe, it, expect, beforeEach } from "vitest";
import { chatStore, chatActions, ChatToast } from "@/stores/chat.store";

describe("chatStore messageToasts actions", () => {
  beforeEach(() => {
    chatActions.clearMessageToasts();
  });

  it("adds a message toast correctly", () => {
    const toast: ChatToast = {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-2",
      senderName: "João Personal",
      senderImage: "https://example.com/avatar.png",
      messageType: "TEXT",
      content: "Olá! Como foi o treino?",
      createdAt: new Date(),
    };

    chatActions.addMessageToast(toast);

    expect(chatStore.messageToasts.length).toBe(1);
    expect(chatStore.messageToasts[0].senderName).toBe("João Personal");
    expect(chatStore.messageToasts[0].content).toBe("Olá! Como foi o treino?");
  });

  it("avoids adding duplicate toasts with the same id", () => {
    const toast: ChatToast = {
      id: "msg-dup",
      conversationId: "conv-1",
      senderId: "user-2",
      senderName: "João",
      content: "Mensagem duplicada",
      createdAt: new Date(),
    };

    chatActions.addMessageToast(toast);
    chatActions.addMessageToast(toast);

    expect(chatStore.messageToasts.length).toBe(1);
  });

  it("caps maximum message toasts to 4 and shifts oldest", () => {
    for (let i = 1; i <= 5; i++) {
      chatActions.addMessageToast({
        id: `msg-${i}`,
        conversationId: "conv-1",
        senderId: "user-2",
        senderName: `Usuário ${i}`,
        content: `Mensagem ${i}`,
        createdAt: new Date(),
      });
    }

    expect(chatStore.messageToasts.length).toBe(4);
    // Oldest (msg-1) should have been shifted out
    expect(chatStore.messageToasts.map((t) => t.id)).toEqual(["msg-2", "msg-3", "msg-4", "msg-5"]);
  });

  it("removes a message toast by id", () => {
    chatActions.addMessageToast({
      id: "to-remove",
      conversationId: "conv-1",
      senderId: "user-2",
      senderName: "Maria",
      content: "Teste remoção",
      createdAt: new Date(),
    });

    expect(chatStore.messageToasts.length).toBe(1);
    chatActions.removeMessageToast("to-remove");
    expect(chatStore.messageToasts.length).toBe(0);
  });

  it("clears all message toasts on resetWorkspace", () => {
    chatActions.addMessageToast({
      id: "toast-1",
      conversationId: "conv-1",
      senderId: "user-2",
      senderName: "Lucas",
      content: "Oi",
      createdAt: new Date(),
    });

    chatActions.resetWorkspace();
    expect(chatStore.messageToasts.length).toBe(0);
  });
});
