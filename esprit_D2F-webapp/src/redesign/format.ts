// ═══════════════════════════════════════════════════════════════════════════
// Formatage métrique centralisé — D2F Redesign.
//
// Garantit qu'aucune valeur null/undefined ne se transforme en "0" trompeur.
// Les métriques non calculables passent par `NA_CALC` (states.ts).
// ═══════════════════════════════════════════════════════════════════════════

import { NA_CALC } from "@/utils/states";

/** Formate un nombre entier (séparateur FR). null/undefined -> NA_CALC. */
export function fmtInt(value: number | null | undefined, opts?: { fallback?: string }): string {
  if (value == null || Number.isNaN(value)) return opts?.fallback ?? NA_CALC;
  return Math.round(value).toLocaleString("fr-FR");
}

/** Formate un pourcentage à partir d'une valeur 0–100. */
export function fmtPct(value: number | null | undefined, opts?: { digits?: number; withSign?: boolean }): string {
  if (value == null || Number.isNaN(value)) return NA_CALC;
  const d = opts?.digits ?? 0;
  const n = value.toFixed(d);
  const sign = opts?.withSign && value > 0 ? "+" : "";
  return `${sign}${n} %`;
}

/** Formate un ratio [0,1] en pourcentage. */
export function fmtRatio(ratio: number | null | undefined, opts?: { digits?: number }): string {
  if (ratio == null || Number.isNaN(ratio)) return NA_CALC;
  return fmtPct(ratio * 100, opts);
}

/** Valeur décimale générique (ex: gain de niveau 1.8). */
export function fmtDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return NA_CALC;
  return value.toFixed(digits);
}

/** Texte "Non calculable" (RÈGLE #3) avec explication optionnelle. */
export function nonCalculable(reason?: string): { label: string; reason?: string } {
  return { label: NA_CALC, reason };
}

/** Construit un badge de tendance cohérent (jamais de "0 %" fantôme). */
export interface Trend {
  readonly value: number | null; // delta en points ou %
  readonly direction: "up" | "down" | "stable";
  readonly good: boolean; // true si la direction est favorable
  readonly label?: string;
}

export function buildTrend(opts: {
  current?: number | null;
  previous?: number | null;
  /** Si true, une hausse est "bonne" (ex: couverture). */
  higherIsBetter: boolean;
  /** Unité d'affichage du delta ("pts" | "%"). */
  unit?: "pts" | "%";
  label?: string;
}): Trend | null {
  const { current, previous, higherIsBetter, unit = "pts", label } = opts;
  if (current == null || previous == null || Number.isNaN(current) || Number.isNaN(previous)) {
    return null; // pas de delta calculable -> on n'affiche rien
  }
  const raw = current - previous;
  const eps = unit === "%" ? 0.05 : 0.5;
  if (Math.abs(raw) < eps) {
    return { value: 0, direction: "stable", good: true, label };
  }
  const up = raw > 0;
  return {
    value: Math.abs(raw),
    direction: up ? "up" : "down",
    good: up === higherIsBetter,
    label,
  };
}

/** Initiales à partir d'un nom complet (RÈGLE #5 : jamais depuis l'id). */
export function initialsFromName(fullName?: string | null, fallback = "?"): string {
  const clean = (fullName ?? "").trim();
  if (!clean) return fallback.slice(0, 2).toUpperCase();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Découpe "Prénom Nom" pour l'avatar UserAvatar. */
export function splitName(fullName?: string | null): { firstName?: string; lastName?: string } {
  const clean = (fullName ?? "").trim();
  if (!clean) return {};
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
