"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";

export default function PersonalChatPage() {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 min-h-0">
      <div className="flex flex-col gap-1 shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Chat Integrado
        </h1>
        <p className="text-xs text-muted-foreground">
          Converse com seus alunos e membros da equipe em tempo real.
        </p>
      </div>

      <ChatContainer userRole="TRAINER" />
    </div>
  );
}
