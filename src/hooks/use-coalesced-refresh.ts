"use client";
import { useCallback, useEffect, useRef } from "react";

/** Merge event bursts, defer hidden-tab work, and keep at most one request in flight. */
export function useCoalescedRefresh(refresh: () => Promise<unknown>, scope: string | null | undefined, delay = 250) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  const trigger = useRef<() => void>(() => {});
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false, dirty = false, disposed = false;
    const flush = async () => {
      timer = undefined;
      if (disposed || running || !dirty || document.visibilityState === "hidden") return;
      dirty = false; running = true;
      try { await latest.current(); }
      finally { running = false; if (dirty && !disposed) schedule(); }
    };
    const schedule = () => { dirty = true; if (!running && !timer && !disposed) timer = setTimeout(() => { void flush(); }, delay); };
    const visible = () => { if (dirty && document.visibilityState === "visible") schedule(); };
    trigger.current = schedule;
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; if (timer) clearTimeout(timer); trigger.current = () => {}; document.removeEventListener("visibilitychange", visible); };
  }, [scope, delay]);
  return useCallback(() => trigger.current(), []);
}
