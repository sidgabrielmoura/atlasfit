"use client";
import { useCallback, useRef } from "react";

/** Retain the key until the server confirms this intent; a retry must not debit twice. */
export function useRequestAttempt(scope: string) {
  const attempt = useRef<{ scope: string; key: string } | null>(null);
  const keyFor = useCallback((payload: string) => {
    // Editing after an uncertain response must conflict on the server, not debit again.
    if (!payload) throw new Error("Informe os dados da operação.");
    if (!attempt.current || attempt.current.scope !== scope) {
      const storageKey = `atlasfit:pending-finance:${scope}`;
      const retained = sessionStorage.getItem(storageKey);
      if (retained && !/^[0-9a-f-]{36}$/.test(retained)) throw new Error("Tentativa financeira local inválida. Confira o histórico antes de reenviar.");
      const key = retained || crypto.randomUUID();
      // Store only the key, never amounts, names or descriptions. A reload keeps retries safe.
      sessionStorage.setItem(storageKey, key);
      attempt.current = { scope, key };
    }
    return attempt.current.key;
  }, [scope]);
  const confirmed = useCallback(() => {
    if (attempt.current?.scope === scope) {
      sessionStorage.removeItem(`atlasfit:pending-finance:${scope}`);
      attempt.current = null;
    }
  }, [scope]);
  return { keyFor, confirmed };
}
