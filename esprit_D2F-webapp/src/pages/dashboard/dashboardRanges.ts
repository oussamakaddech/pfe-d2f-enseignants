import dayjs from 'dayjs';
import type { DashboardRangeKey } from '@/models/dashboard';

export interface RangePreset {
  readonly key: DashboardRangeKey;
  readonly label: string;
}

/** Presets de période affichés dans l'en-tête (alignés sur ceux de KPIChart). */
export const RANGE_PRESETS: readonly RangePreset[] = [
  { key: '30j', label: '30 jours' },
  { key: '6m', label: '6 mois' },
  { key: '12m', label: '12 mois' },
  { key: 'annee', label: 'Cette année' },
];

const FMT = 'YYYY-MM-DD';

/** Convertit une période en bornes ISO yyyy-MM-dd. `custom` requiert des bornes explicites. */
export function rangeToDates(
  key: DashboardRangeKey,
  custom?: { start: string; end: string },
): { start: string; end: string } {
  const today = dayjs();
  switch (key) {
    case '30j':
      return { start: today.subtract(30, 'day').format(FMT), end: today.format(FMT) };
    case '6m':
      return {
        start: today.subtract(6, 'month').startOf('month').format(FMT),
        end: today.endOf('month').format(FMT),
      };
    case '12m':
      return {
        start: today.subtract(12, 'month').startOf('month').format(FMT),
        end: today.endOf('month').format(FMT),
      };
    case 'annee':
      return { start: today.startOf('year').format(FMT), end: today.endOf('year').format(FMT) };
    case 'custom':
      return custom ?? { start: today.startOf('year').format(FMT), end: today.format(FMT) };
    default:
      return { start: today.startOf('year').format(FMT), end: today.format(FMT) };
  }
}

/** Période précédente de même durée (pour les comparaisons / deltas). */
export function previousRange(start: string, end: string): { start: string; end: string } {
  const s = dayjs(start);
  const e = dayjs(end);
  const days = Math.max(1, e.diff(s, 'day'));
  return {
    start: s.subtract(days, 'day').format(FMT),
    end: s.format(FMT),
  };
}
