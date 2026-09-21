"use client";

import { useEffect } from "react";

export function EngagePushTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const url = new URL(window.location.href);
      const logId = url.searchParams.get("engage_push_log") || url.searchParams.get("logId");

      if (logId) {
        const sessionKey = `atlasfit_push_clicked_${logId}`;
        const alreadyTracked = sessionStorage.getItem(sessionKey);

        if (!alreadyTracked) {
          sessionStorage.setItem(sessionKey, "true");

          // Envia o registro de clique para o backend
          fetch(`/api/engage/push/click?logId=${encodeURIComponent(logId)}`, {
            method: "GET",
            keepalive: true,
          }).catch((err) => {
            console.warn("[EngagePushTracker] Falha ao registrar clique:", err);
          });
        }

        // Limpa o parâmetro da URL de forma suave sem causar reload
        url.searchParams.delete("engage_push_log");
        url.searchParams.delete("is_test");
        const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash;
        window.history.replaceState(window.history.state, "", cleanPath);
      }
    } catch (err) {
      console.warn("[EngagePushTracker] Erro:", err);
    }
  }, []);

  return null;
}
