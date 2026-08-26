import { app } from "@/lib/firebase";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

function detectPlatformAndBrowser(): { platform: string; browser: string } {
  if (typeof window === "undefined" || !navigator) {
    return { platform: "WEB", browser: "Unknown" };
  }

  const userAgent = navigator.userAgent || "";
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;

  let platform = "DESKTOP";
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    platform = isStandalone ? "IOS_PWA" : "IOS_SAFARI";
  } else if (/Android/i.test(userAgent)) {
    platform = isStandalone ? "ANDROID_PWA" : "ANDROID_WEB";
  } else if (isStandalone) {
    platform = "DESKTOP_PWA";
  }

  let browser = "Browser";
  if (userAgent.indexOf("Edg") > -1) {
    browser = "Edge";
  } else if (userAgent.indexOf("Chrome") > -1) {
    browser = "Chrome";
  } else if (userAgent.indexOf("Safari") > -1) {
    browser = "Safari";
  } else if (userAgent.indexOf("Firefox") > -1) {
    browser = "Firefox";
  }

  return { platform, browser };
}

export function useFcm() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const { data: session } = useSession();

  const registerTokenWithBackend = useCallback(async (fcmToken: string) => {
    try {
      const { platform, browser } = detectPlatformAndBrowser();
      const res = await fetch("/api/notifications/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: fcmToken,
          platform,
          browser,
        }),
      });

      if (!res.ok) {
        console.warn("[FCM] Failed to sync token with backend:", await res.text());
      }
    } catch (err) {
      console.warn("[FCM] Error saving token to backend:", err);
    }
  }, []);

  const requestPermissionAndRegister = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      setPermission("unsupported");
      return null;
    }

    try {
      const currentPerm = await Notification.requestPermission();
      setPermission(currentPerm);

      if (currentPerm !== "granted") {
        return null;
      }

      const { getMessaging, getToken } = await import("firebase/messaging");
      const messaging = getMessaging(app);

      // Register or get existing service worker registration
      let registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (!registration) {
        registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        });
      }

      // Wait for service worker to be active
      await navigator.serviceWorker.ready;

      const vapidKey =
        process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
        "BCbKCRqh8N1dkdD9sHuWWO8RyfeE4LoEmW2ZSpQNxOzRqHaLlt9c2HJmd43kWxuxvEhBs8UI2TNP10icpF3brJQ";

      const fcmToken = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey,
      });

      if (fcmToken) {
        setToken(fcmToken);
        if (session?.user?.id) {
          await registerTokenWithBackend(fcmToken);
        }
        return fcmToken;
      }
    } catch (err) {
      console.error("[FCM] Initialization or registration error:", err);
    }
    return null;
  }, [session?.user?.id, registerTokenWithBackend]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    // If permission is already granted, silently get/refresh the token
    if (Notification.permission === "granted") {
      requestPermissionAndRegister();
    } else if (Notification.permission === "default") {
      // On default (not asked yet), request permission with slight delay so page loads smoothly
      const timer = setTimeout(() => {
        requestPermissionAndRegister();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [session?.user?.id, requestPermissionAndRegister]);

  // Foreground message listener
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupForegroundListener = async () => {
      try {
        const { getMessaging, onMessage } = await import("firebase/messaging");
        const messaging = getMessaging(app);

        unsubscribe = onMessage(messaging, (payload) => {
          window.dispatchEvent(new CustomEvent("fcm-message-received", { detail: payload }));

          const title = payload.notification?.title || payload.data?.title || "AtlasFit";
          const body = payload.notification?.body || payload.data?.description || payload.data?.body;
          const targetUrl = payload.data?.url || payload.data?.deepLink || payload.fcmOptions?.link;

          const toastId = payload.data?.notificationId || payload.data?.engagePushLogId || `push-${title}`;

          if (title || body) {
            toast(title, {
              id: toastId,
              description: body,
              action: targetUrl
                ? {
                    label: "Abrir",
                    onClick: () => {
                      window.location.href = targetUrl;
                    },
                  }
                : undefined,
            });
          }
        });
      } catch (err) {
        console.warn("[FCM] Could not attach foreground listener:", err);
      }
    };

    if (Notification.permission === "granted") {
      setupForegroundListener();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [permission]);

  return {
    token,
    permission,
    requestPermissionAndRegister,
  };
}
