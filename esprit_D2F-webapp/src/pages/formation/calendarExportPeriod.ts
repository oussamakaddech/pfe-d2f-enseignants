/**
 * Paramètres de l'export Excel du calendrier (Calendrier Global / Gestion Calendrier).
 *
 * La période est facultative : vide = toutes les dates (bornes larges par
 * défaut, cf. `ExportExcelService`). Les dates sont transmises au format
 * `yyyy-MM-dd`, attendu par le back (`@DateTimeFormat`).
 *
 * Les filtres UP / département sont eux aussi facultatifs : ils sont appliqués
 * côté serveur (le classeur n'est produit que par le back), sur le code OU le
 * libellé de l'UP / du département.
 */
import type { Dayjs } from 'dayjs';

/** Borne basse par défaut (toutes les dates). */
export const CALENDAR_EXPORT_DEFAULT_START = '2000-01-01';
/** Borne haute par défaut (toutes les dates). */
export const CALENDAR_EXPORT_DEFAULT_END = '2100-12-31';

export interface ExportPeriod {
  start: string;
  end: string;
}

export interface ExportScope {
  up?: string | null;
  departement?: string | null;
}

export interface ExportPayload extends ExportPeriod {
  up?: string;
  departement?: string;
}

/**
 * Convertit la période choisie en paramètres d'export.
 * Une période incomplète (une seule borne) est ignorée : on retombe sur
 * l'intervalle complet, jamais sur une période tronquée.
 */
export function exportPeriod(range: readonly [Dayjs, Dayjs] | null | undefined): ExportPeriod {
  const start = range?.[0]?.format('YYYY-MM-DD');
  const end = range?.[1]?.format('YYYY-MM-DD');
  if (!start || !end) {
    return { start: CALENDAR_EXPORT_DEFAULT_START, end: CALENDAR_EXPORT_DEFAULT_END };
  }
  return { start, end };
}

/** Payload complet de l'export : période + périmètre UP / département. */
export function exportPayload(
  range: readonly [Dayjs, Dayjs] | null | undefined,
  scope: ExportScope = {},
): ExportPayload {
  const period = exportPeriod(range);
  const payload: ExportPayload = { ...period };
  const up = scope.up?.trim();
  const departement = scope.departement?.trim();
  if (up) payload.up = up;
  if (departement) payload.departement = departement;
  return payload;
}

/** Nom de fichier du classeur : période et périmètre y figurent quand ils existent. */
export function exportFileName(
  range: readonly [Dayjs, Dayjs] | null | undefined,
  generatedIsoDate: string,
  scope: ExportScope = {},
): string {
  const parts: string[] = ['calendrier_formations'];
  const start = range?.[0]?.format('YYYY-MM-DD');
  const end = range?.[1]?.format('YYYY-MM-DD');
  if (start && end) parts.push(`${start}_${end}`);
  if (scope.up?.trim()) parts.push(sanitize(scope.up));
  if (scope.departement?.trim()) parts.push(sanitize(scope.departement));
  parts.push(generatedIsoDate);
  return `${parts.join('_')}.xlsx`;
}

/** Libellé lisible des filtres (message de succès). */
export function exportPeriodLabel(
  range: readonly [Dayjs, Dayjs] | null | undefined,
  scope: ExportScope = {},
): string {
  const parts: string[] = [];
  const start = range?.[0]?.format('DD/MM/YYYY');
  const end = range?.[1]?.format('DD/MM/YYYY');
  if (start && end) parts.push(`du ${start} au ${end}`);
  if (scope.up?.trim()) parts.push(`UP : ${scope.up.trim()}`);
  if (scope.departement?.trim()) parts.push(`Département : ${scope.departement.trim()}`);
  return parts.length === 0 ? '' : ` (${parts.join(' · ')})`;
}

/** Neutralise les caractères interdits dans un nom de fichier. */
function sanitize(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]+/g, '_');
}
