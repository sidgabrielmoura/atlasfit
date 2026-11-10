"use client";

import { SessionContext, SessionProvider, useSession, __NEXTAUTH } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isSessionlessRoute } from "@/lib/session-routes";
import { useEffect, useRef, useState } from "react";

const publicSession = { data: null, status: "unauthenticated" as const, update: async () => null };

function SessionRouteBoundary({ publicPage, children }: { publicPage: boolean; children: React.ReactNode }) {
  const session = useSession();
  const previousPublicPage = useRef(publicPage);
  const [refreshing, setRefreshing] = useState(false);
  const enteringPrivate = previousPublicPage.current && !publicPage;

  useEffect(() => {
    const enteredPrivate = previousPublicPage.current && !publicPage;
    previousPublicPage.current = publicPage;
    if (!enteredPrivate) return;
    let current = true;
    setRefreshing(true);
    // Use the mounted Auth.js provider's refresh, including its internal session
    // state. A storage event performs a fresh GET without broadcasting another
    // fetch back to this tab. Never memoize authentication responses.
    void Promise.resolve(__NEXTAUTH._getSession({ event: "storage" })).finally(() => {
      if (current) setRefreshing(false);
    });
    return () => { current = false; };
  }, [publicPage]);

  const value = publicPage ? publicSession : enteringPrivate || refreshing
    ? { data: null, status: "loading" as const, update: session.update }
    : session;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publicPage = isSessionlessRoute(usePathname());
  // SessionProvider only uses this prop on its first mount. Keep the provider
  // mounted across navigation so its cleanup cannot reset a newly mounted one.
  const [initialSession] = useState(() => publicPage ? null : undefined);
  return (
    <SessionProvider
      session={initialSession}
      refetchInterval={0}
      refetchWhenOffline={false}
      refetchOnWindowFocus={!publicPage}
    >
      <SessionRouteBoundary publicPage={publicPage}>{children}</SessionRouteBoundary>
    </SessionProvider>
  );
}
