/**
 * Helpers de formatage et mappers pour le feature-module Analytics.
 */
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/utils/analytics/constants';
import type { NiveauRisque } from '@/models/analyse/analyticsFeature';

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatScore(value: number, digits = 2): string {
  return value.toFixed(digits);
}

/** Formate un nombre entier à la française (espace des milliers : 1 176). */
export function formatCount(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

export function riskColor(level: NiveauRisque): string {
  return RISK_LEVEL_COLORS[level] ?? '#8c8c8c';
}

export function riskLabel(level: NiveauRisque): string {
  return RISK_LEVEL_LABELS[level] ?? level;
}

/* ── Statut décisionnel unifié (Stable / Stagnation / Régression / Critique) ──
 * Reconciliation de la tendance et du niveau de risque en un seul état lisible,
 * réutilisé partout (table, heatmap, alertes, actions). */
export type StatutKey = 'Stable' | 'Stagnation' | 'Regression' | 'Critique';

export const STATUT_META: Record<StatutKey, { label: string; color: string; dot: string }> = {
  Critique: { label: 'Critique', color: '#C8102E', dot: '●' },
  Regression: { label: 'Régression', color: '#ea580c', dot: '◑' },
  Stagnation: { label: 'Stagnation', color: '#d97706', dot: '◐' },
  Stable: { label: 'Stable', color: '#16a34a', dot: '●' },
};

export function teacherStatus(
  tendance?: string | null,
  niveauRisque?: NiveauRisque | (string & {}) | null,
): StatutKey {
  const t = (tendance ?? '').toUpperCase();
  const n = (niveauRisque ?? '').toUpperCase();
  if (n === 'CRITIQUE') return 'Critique';
  if (t === 'DEGRADATION' || t === 'REGRESSION') return 'Regression';
  if (
    t === 'STAGNATION' ||
    (t === 'STABLE' && (n === 'MODERE' || n === 'ELEVE'))
  )
    return 'Stagnation';
  return 'Stable';
}

export function gapSeverityColor(gapScore: number): string {
  if (gapScore >= 0.75) return '#f5222d';
  if (gapScore >= 0.5) return '#fa8c16';
  if (gapScore >= 0.25) return '#faad14';
  return '#52c41a';
}

/**
 * Libellés réels des départements ESPRIT (les codes DEPT_* en base sont des
 * placeholders peu lisibles). Retourne le libellé, ou le code nettoyé en
 * repli. Renvoie « — » si la valeur est nulle/non renseignée (pas de
 * libellé « Non affecté »).
 */
const DEPARTEMENT_LIBELLES: Record<string, string> = {
  // Codes réellement présents en base (formation.departements).
  DEPT_INFO: 'Informatique',
  DEPT_INF2: 'Informatique & Infrastructures',
  DEPT_RT: 'Réseaux & Télécommunications',
  DEPT_GC: 'Génie Civil',
  DEPT_GL: 'Génie Logiciel',
  DEPT_IA: 'Intelligence Artificielle & Data',
  DEPT_WEB: 'Développement Web',
  // Codes historiques conservés pour compatibilité d'affichage.
  DEPT_GI: 'Génie Industriel',
  DEPT_BI: 'Business Intelligence & Data',
  DEPT_SE: 'Systèmes Embarqués',
  DEPT_GSI: "Génie des Systèmes d'Information",
  DEPT_TC: 'Télécommunications & Réseaux',
  DEPT_GLK: 'Génie Logiciel',
};

export function formatDepartment(code: string | null | undefined): string {
  if (!code) return '—';
  return DEPARTEMENT_LIBELLES[code] ?? code.replace(/^DEPT_/i, '');
}

/** Même principe pour les UP (Unités de Production). */
export function formatUP(code: string | null | undefined): string {
  if (!code) return '—';
  return code.replace(/^UP_/i, 'UP ');
}

/** Exporte un tableau de lignes (objets plats) en CSV. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const header = columns.map(escape).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
