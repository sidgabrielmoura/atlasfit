const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

let messaging: any = null;

export function getAdminMessaging() {
  if (typeof window !== "undefined") return null;

  if (!messaging) {
    try {
      const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
      const { getMessaging } = require("firebase-admin/messaging");

      const app = getApps().length === 0
        ? initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
          })
        : getApp();

      messaging = getMessaging(app);
    } catch (error) {
      console.error("Failed to initialize Firebase Admin Messaging:", error);
      return null;
    }
  }

  return messaging;
}
