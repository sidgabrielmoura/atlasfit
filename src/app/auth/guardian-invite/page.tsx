import type { Metadata } from "next";
import { Suspense } from "react";
import { GuardianInviteClient } from "./guardian-invite-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Convite do responsável | AtlasFit", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function GuardianInvitePage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Suspense fallback={<Skeleton className="h-96 w-full max-w-xl" />}><GuardianInviteClient /></Suspense></main>;
}
