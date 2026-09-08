"use client";

import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { usePathname } from "next/navigation";
import { useState, useEffect, useLayoutEffect } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const DEFAULT_APP_COLOR = "#2B4FCC";
const DEFAULT_COLOR_LIGHT = "oklch(0.484 0.198 266.4)"; // #2B4FCC
const DEFAULT_COLOR_DARK = "oklch(0.580 0.198 266.4)";  // #2B4FCC dark

/**
 * Converte cor HEX para componentes RGB normalizados (0-1)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Converte RGB para oklch aproximado usando método simplificado.
 * Suficientemente preciso para aplicação de tema dinâmico.
 */
function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_COLOR_LIGHT;

  // Linearizar sRGB
  const linearize = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  // sRGB para XYZ (D65)
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

  // XYZ para oklab (usando D65 whitepoint)
  const cbrt = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 1 / 3);
  const l_ = cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z);
  const m_ = cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z);
  const s_ = cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

/**
 * Gera uma versão mais clara da cor para o dark mode.
 * Aumenta a luminosidade em oklch para garantir contraste em fundos escuros.
 */
function hexToOklchDark(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_COLOR_DARK;

  const linearize = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

  const cbrt = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 1 / 3);
  const l_ = cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z);
  const m_ = cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z);
  const s_ = cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  // Aumenta luminosidade para dark mode (mín 0.58, máx 0.72)
  const darkL = Math.min(0.72, Math.max(0.58, L + 0.07));

  return `oklch(${darkL.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

/**
 * Atualiza todas as tags de meta necessárias para a barra de status do celular
 * (seção com bateria, horário, ícones de rede no Android e iOS Safari/PWA).
 */
export function updateMobileStatusBar(color: string) {
  if (typeof document === "undefined") return;

  // 1. Atualiza ou cria as tags meta[name="theme-color"]
  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  if (themeMetas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", color);
    document.head.appendChild(meta);
  } else {
    themeMetas.forEach((meta) => {
      meta.setAttribute("content", color);
      // Remove media query restrictiva para garantir que a cor seja aplicada
      if (meta.hasAttribute("media")) {
        meta.removeAttribute("media");
      }
    });
  }

  // 2. msapplication-navbutton-color (Windows Phone / navegadores móveis legados)
  let msMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
  if (!msMeta) {
    msMeta = document.createElement("meta");
    msMeta.setAttribute("name", "msapplication-navbutton-color");
    document.head.appendChild(msMeta);
  }
  msMeta.setAttribute("content", color);

  // 3. apple-mobile-web-app-status-bar-style
  // "default" permite que o iOS Safari e PWA no iOS 15+ adotem a cor do theme-color
  let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBar) {
    appleStatusBar = document.createElement("meta");
    appleStatusBar.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    document.head.appendChild(appleStatusBar);
  }
  appleStatusBar.setAttribute("content", "default");
}

export function DynamicBranding() {
  const [mounted, setMounted] = useState(false);
  const snap = useSnapshot(workspaceStore);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSuperAdmin = pathname?.startsWith("/superadmin");
  const rawColor = (!isSuperAdmin && snap.activeWorkspace?.primaryColor?.trim())
    ? snap.activeWorkspace.primaryColor.trim()
    : DEFAULT_APP_COLOR;

  // Sincroniza a barra de status móvel (bateria, relógio, ícones) antes do paint
  useIsomorphicLayoutEffect(() => {
    updateMobileStatusBar(rawColor);
  }, [rawColor]);

  if (!mounted) {
    return null;
  }

  const isHex = /^#[0-9a-fA-F]{3,8}$/.test(rawColor);
  const lightColor = isHex ? hexToOklch(rawColor) : rawColor;
  const darkColor = isHex ? hexToOklchDark(rawColor) : rawColor;

  return (
    <>
      <meta name="theme-color" content={rawColor} />
      <meta name="msapplication-navbutton-color" content={rawColor} />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --primary: ${lightColor} !important;
            --sidebar-primary: ${lightColor} !important;
            --ring: ${lightColor} !important;
            --sidebar-ring: ${lightColor} !important;
            --chart-1: ${lightColor} !important;
          }
          .dark {
            --primary: ${darkColor} !important;
            --sidebar-primary: ${darkColor} !important;
            --ring: ${darkColor} !important;
            --sidebar-ring: ${darkColor} !important;
            --chart-1: ${darkColor} !important;
          }
        `
      }} />
    </>
  );
}
