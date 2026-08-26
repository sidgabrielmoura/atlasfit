import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let messagingInstance: any = null;

function sanitizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  let clean = key.trim();
  // Remove wrapping quotes if present
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1);
  }
  // Convert literal \n to real newlines
  clean = clean.replace(/\\n/g, "\n").trim();
  return clean || undefined;
}

export function getAdminMessaging() {
  if (typeof window !== "undefined") return null;

  if (messagingInstance) {
    return messagingInstance;
  }

  try {
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = sanitizePrivateKey(rawPrivateKey);
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "atlasfit-5a39c";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!privateKey || !clientEmail) {
      console.warn(
        `[Firebase Admin] Missing credentials. privateKey=${!!privateKey}, clientEmail=${!!clientEmail}, projectId=${projectId}`
      );
      return null;
    }

    const app = getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      : getApp();

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.error("[Firebase Admin] Failed to initialize Firebase Admin Messaging:", error);
    return null;
  }
}
