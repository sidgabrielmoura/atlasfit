"use client";

import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

/**
 * Converte cor HEX para componentes RGB normalizados (0-1)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

/**
 * Converte RGB para oklch aproximado usando método simplificado.
 * Suficientemente preciso para aplicação de tema dinâmico.
 */
function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "oklch(0.532 0.258 269.4)";

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
  if (!rgb) return "oklch(0.60 0.24 269.4)";

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

const DEFAULT_COLOR_LIGHT = "oklch(0.532 0.258 269.4)";
const DEFAULT_COLOR_DARK = "oklch(0.60 0.24 269.4)";

export function DynamicBranding() {
  const [mounted, setMounted] = useState(false);
  const snap = useSnapshot(workspaceStore);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // SuperAdmin sempre usa a cor padrão azul ou se não estiver montado no client
  if (!mounted || pathname?.startsWith("/superadmin")) {
    return null; // globals.css define a cor padrão corretamente
  }

  const primaryHex = snap.activeWorkspace?.primaryColor;

  // Se não houver cor configurada ou for a mesma cor padrão, não injeta nada
  // deixando o globals.css assumir
  if (!primaryHex) {
    return null;
  }

  // Se a cor for um hex válido, converte para oklch para consistência com o tema
  const isHex = /^#[0-9a-fA-F]{6}$/.test(primaryHex);
  const lightColor = isHex ? hexToOklch(primaryHex) : primaryHex;
  const darkColor = isHex ? hexToOklchDark(primaryHex) : primaryHex;

  return (
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
  );
}
