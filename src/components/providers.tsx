"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { DynamicBranding } from "@/components/application/dynamic-branding";
import { AblyProvider } from "@/providers/ably-provider";
import { ImportCommitProvider } from "@/providers/import-commit-provider";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isSessionlessRoute } from "@/lib/session-routes";
import { ImpersonationBanner } from "@/components/application/impersonation-banner";

import { EngagePushTracker } from "@/components/engage/engage-push-tracker";

const EngageRenderer = dynamic(
  () => import("@/components/engage/engage-renderer").then((mod) => mod.EngageRenderer),
  { ssr: false }
);

const LegalReacceptanceModal = dynamic(
  () => import("@/components/privacy/legal-reacceptance-modal").then(mod => mod.LegalReacceptanceModal),
  { ssr: false }
);
const PwaFcmInit = dynamic(
  () => import("@/components/pwa-fcm-init").then(mod => mod.PwaFcmInit),
  { ssr: false }
);
const ChatNotificationToaster = dynamic(
  () => import("@/components/chat/chat-notification-toaster").then(mod => mod.ChatNotificationToaster),
  { ssr: false }
);

function AuthenticatedFeatures() {
  const { data: session, status } = useSession();
  const publicPage = isSessionlessRoute(usePathname());
  if (publicPage || status !== "authenticated" || !session.user?.id) return null;
  return (
    <>
      <ImpersonationBanner />
      <LegalReacceptanceModal key={`legal-${session.user.id}`} />
      <PwaFcmInit key={`pwa-${session.user.id}`} />
      <EngageRenderer key={`engage-${session.user.id}`} />
      <ChatNotificationToaster />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        enableColorScheme={false}
      >
        <TooltipProvider delayDuration={0}>
          <AblyProvider>
            <DynamicBranding />
            <EngagePushTracker />
            <ImportCommitProvider>{children}</ImportCommitProvider>
            <AuthenticatedFeatures />
            <Toaster position="top-right" richColors />
          </AblyProvider>
        </TooltipProvider>
      </NextThemesProvider>
    </AuthProvider>
  );
}
