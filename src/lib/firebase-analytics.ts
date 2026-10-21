import type { FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

/** Analytics is optional; configuration or browser support must not break the app. */
export async function initializeOptionalAnalytics(app: FirebaseApp): Promise<Analytics | null> {
  if (typeof window === "undefined" || ![app.options.apiKey, app.options.projectId, app.options.appId].every(value => typeof value === "string" && value.trim().length > 0)) return null;
  try {
    return await isSupported() ? getAnalytics(app) : null;
  } catch {
    return null;
  }
}
