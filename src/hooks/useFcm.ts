import { app } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function useFcm() {
  const [token, setToken] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }

    const initFcm = async () => {
      try {
        const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
        const messaging = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: registration,
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (fcmToken) {
          console.log("FCM Token obtained:", fcmToken);
          setToken(fcmToken);

          const userAgent = navigator.userAgent;
          let deviceName = "Navegador";
          if (userAgent.indexOf("Edge") > -1) {
            deviceName = "Edge";
          } else if (userAgent.indexOf("Chrome") > -1) {
            deviceName = "Chrome";
          } else if (userAgent.indexOf("Safari") > -1) {
            deviceName = "Safari";
          } else if (userAgent.indexOf("Firefox") > -1) {
            deviceName = "Firefox";
          }

          const res = await fetch("/api/personal/notifications/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: fcmToken, device: deviceName }),
          });
          if (res.ok) {
            console.log("FCM Token registered in database successfully.");
          }
        }

        onMessage(messaging, (payload) => {
          window.dispatchEvent(new CustomEvent("fcm-message-received", { detail: payload }));
          if (payload.notification) {
            toast(payload.notification.title || "Notificação", {
              description: payload.notification.body,
              action: payload.data?.url
                ? {
                    label: "Ver",
                    onClick: () => {
                      window.location.href = payload.data?.url || "/";
                    },
                  }
                : undefined,
            });
          }
        });
      } catch (error) {
        console.error("FCM Initialization failed:", error);
      }
    };

    initFcm();
  }, [session?.user?.id]);

  return { token };
}
