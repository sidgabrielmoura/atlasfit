"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 768;
const DEFAULT_GAP = 12; // Gap de 12px entre o alerta e a navbar
const ALERT_BASE_BOTTOM = 16; // 1rem = 16px da base da tela no mobile
const NAVBAR_BASE_BOTTOM = 24; // 1.5rem = 24px (bottom-6 padrão da navbar)

// Registro de alertas ativos: Map<id, offsetEmPixels>
const activeBottomAlerts = new Map<string, number>();

function getWindowWidth(): number {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth;
}

function recalculateBottomAlertOffset(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;

  const isMobile = getWindowWidth() < MOBILE_BREAKPOINT;

  // No desktop (>= 768px), o alerta fica no canto inferior direito e a navbar mobile está oculta (md:hidden)
  if (!isMobile || activeBottomAlerts.size === 0) {
    document.documentElement.style.setProperty("--mobile-bottom-offset", "0px");
    window.dispatchEvent(
      new CustomEvent("bottom-alert-offset-change", { detail: { offset: 0 } })
    );
    return 0;
  }

  // No mobile (< 768px), seleciona o maior offset dos alertas visíveis
  let maxOffset = 0;
  for (const offset of activeBottomAlerts.values()) {
    if (offset > maxOffset) {
      maxOffset = offset;
    }
  }

  document.documentElement.style.setProperty("--mobile-bottom-offset", `${maxOffset}px`);
  window.dispatchEvent(
    new CustomEvent("bottom-alert-offset-change", { detail: { offset: maxOffset } })
  );

  return maxOffset;
}

/**
 * Hook para registrar um alerta flutuante inferior.
 * Mede dinamicamente a altura do elemento (inclusive em redimensionamentos e expansão/minimização)
 * e eleva a barra de navegação flutuante para que fique sempre empilhada ACIMA do alerta, sem sobreposição.
 */
export function useRegisterBottomAlert(
  id: string,
  elementRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  options?: {
    gap?: number;
    alertBaseBottom?: number;
    navbarBaseBottom?: number;
  }
) {
  const gap = options?.gap ?? DEFAULT_GAP;
  const alertBaseBottom = options?.alertBaseBottom ?? ALERT_BASE_BOTTOM;
  const navbarBaseBottom = options?.navbarBaseBottom ?? NAVBAR_BASE_BOTTOM;

  useEffect(() => {
    if (!isActive || typeof window === "undefined") {
      activeBottomAlerts.delete(id);
      recalculateBottomAlertOffset();
      return;
    }

    const updateHeight = () => {
      const el = elementRef.current;
      if (!el || getWindowWidth() >= MOBILE_BREAKPOINT) {
        activeBottomAlerts.set(id, 0);
        recalculateBottomAlertOffset();
        return;
      }

      const height = el.offsetHeight;
      if (height <= 0) {
        activeBottomAlerts.set(id, 0);
      } else {
        // Cálculo do offset:
        // A navbar deve ficar em: alertBaseBottom + height + gap
        // Como a navbar já tem navbarBaseBottom (24px) por padrão, o offset adicional é:
        // (alertBaseBottom + height + gap) - navbarBaseBottom
        const targetBottom = alertBaseBottom + height + gap;
        const offset = Math.max(0, targetBottom - navbarBaseBottom);
        activeBottomAlerts.set(id, offset);
      }

      recalculateBottomAlertOffset();
    };

    // Atualização imediata
    updateHeight();

    // ResizeObserver no elemento do alerta para reagir a expansão/colapso instantaneamente
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && elementRef.current) {
      observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(elementRef.current);
    }

    // Listener de resize da janela (troca de orientação ou redimensionamento)
    const handleWindowResize = () => {
      updateHeight();
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener("resize", handleWindowResize);
      activeBottomAlerts.delete(id);
      recalculateBottomAlertOffset();
    };
  }, [id, elementRef, isActive, gap, alertBaseBottom, navbarBaseBottom]);
}

/**
 * Hook para a barra de navegação flutuante escutar o offset de alertas ativos.
 * Retorna o valor em pixels que a barra deve se deslocar para cima.
 */
export function useBottomAlertOffset(): number {
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Obtém valor inicial do CSS ou dos alertas ativos
    let initialOffset = 0;
    if (typeof document !== "undefined") {
      const cssVal = document.documentElement.style.getPropertyValue("--mobile-bottom-offset");
      if (cssVal && cssVal.endsWith("px")) {
        initialOffset = parseFloat(cssVal) || 0;
      }
    }
    setOffset(initialOffset);

    const handleChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ offset: number }>;
      setOffset(customEvent.detail?.offset ?? 0);
    };

    window.addEventListener("bottom-alert-offset-change", handleChange);

    return () => {
      window.removeEventListener("bottom-alert-offset-change", handleChange);
    };
  }, []);

  return offset;
}

/**
 * Hook para detectar se qualquer modal, dialog, sheet, alert-dialog ou drawer
 * está aberto no DOM. Permite ocultar elementos flutuantes para evitar qualquer sobreposição.
 */
export function useIsModalOpen(): boolean {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkModal = () => {
      const openModal = document.querySelector(
        '[data-slot="dialog-content"], [data-slot="sheet-content"], [data-slot="alert-dialog-content"], [data-slot="drawer-content"], [data-slot="dialog-overlay"], [data-slot="sheet-overlay"], [data-slot="alert-dialog-overlay"], [data-slot="drawer-overlay"], [data-state="open"][data-slot*="content"], [data-scroll-locked]'
      );
      setIsModalOpen(!!openModal);
    };

    checkModal();

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        checkModal();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-scroll-locked", "data-state", "aria-hidden"],
      });
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return isModalOpen;
}
