"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSnapshot } from "valtio";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { chatStore, chatActions } from "@/stores/chat.store";
import { workspaceStore } from "@/stores/workspace.store";
import { Button } from "@/components/ui/button";

export function ChatHeaderButton() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  
  const pathname = usePathname();
  const isPersonal = pathname?.startsWith("/personal");
  const chatHref = isPersonal ? "/personal/chat" : "/student/chat";

  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const chatSnap = useSnapshot(chatStore);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    // Fetch conversations list to initialize unreadCount in state
    fetch(`/api/chat/conversations?workspaceId=${activeWorkspaceId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        chatActions.setConversations(data);
      })
      .catch((err) => {
        console.error("Error loading conversations in header button:", err);
      });
  }, [activeWorkspaceId]);

  // Sum total unread messages for the current user
  const totalUnreadMessages = chatSnap.conversations.reduce((total, conv) => {
    const participant = conv.participants.find((p) => p.userId === currentUserId);
    return total + (participant ? participant.unreadCount : 0);
  }, 0);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative rounded-full hover:bg-neutral-400/10 transition-colors"
      asChild
    >
      <Link href={chatHref}>
        <MessageSquare className="size-5 text-muted-foreground hover:text-foreground transition-colors" />
        {totalUnreadMessages > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
            {totalUnreadMessages}
          </span>
        )}
      </Link>
    </Button>
  );
}
