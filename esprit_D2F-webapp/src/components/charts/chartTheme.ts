/**
 * Thème partagé des charts D2F (chart.js).
 * Le canvas ne lit pas les CSS custom properties → on consomme le miroir
 * TypeScript des tokens (src/styles/theme.ts).
 */
import type { TooltipOptions, LegendOptions } from "chart.js";
import { colors } from "@/styles/theme";

export { colors, chartPalette } from "@/styles/theme";

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Tooltip « carte » : fond blanc, ombre, texte sombre — au lieu du noir natif. */
export const cardTooltip: Partial<TooltipOptions<never>> = {
  backgroundColor: "#ffffff",
  titleColor: colors.textPrimary,
  bodyColor: colors.textSecondary,
  borderColor: colors.border,
  borderWidth: 1,
  padding: 12,
  cornerRadius: 10,
  titleFont: { family: "Inter", size: 13, weight: 600 },
  bodyFont: { family: "Inter", size: 12 },
  displayColors: true,
  boxPadding: 4,
} as Partial<TooltipOptions<never>>;

export const bottomLegend: Partial<LegendOptions<never>> = {
  position: "bottom",
  labels: {
    font: { family: "Inter", size: 12 },
    color: colors.textSecondary,
    usePointStyle: true,
    pointStyle: "rectRounded",
    padding: 16,
  },
} as Partial<LegendOptions<never>>;

/** Grille discrète en pointillés. */
export const subtleGrid = {
  color: hexToRgba(colors.border, 0.8),
  borderDash: [3, 3] as number[],
};

export const axisTicks = {
  font: { family: "Inter", size: 11 },
  color: colors.textMuted,
};

/** Échelle de couleur continue (heatmap / barres par valeur). */
export function valueToHeatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return colors.surface;
  const t = Math.min(value / max, 1);
  // blanc → bleu clair → bleu profond
  if (t < 0.5) {
    return hexToRgba(colors.accent, 0.15 + t * 0.9);
  }
  return hexToRgba(colors.primary, 0.35 + (t - 0.5) * 1.3);
}

/** Rouge (faible) → orange (moyen) → vert (élevé) pour les barres de taux. */
export function rateToColor(value: number, max: number): string {
  if (max <= 0) return colors.info;
  const t = value / max;
  if (t < 0.34) return colors.danger;
  if (t < 0.67) return colors.warning;
  return colors.success;
}
