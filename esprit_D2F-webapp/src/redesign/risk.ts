// ═══════════════════════════════════════════════════════════════════════════
// Source de vérité unique du risque (frontend) — D2F Redesign.
//
// RÈGLE CRITIQUE #1 & #2 :
//   - Un SEUL champ de score de risque est utilisé partout : `score_risque`,
//     normalisé dans [0,1] (ex: 0.72 = 72 %).
//   - Une SEULE classification :
//       Faible   < 40 %
//       Modéré   40–59 %
//       Élevé    60–79 %
//       Critique ≥ 80 %
//
// Toute la plateforme (Analyse Prédictive + Tableau de bord) DOIT passer par
// ce module. Aucun autre endroit ne recalcule un seuil.
// ═══════════════════════════════════════════════════════════════════════════

import { riskStyle, riskLevelFromScore } from '@/utils/risk';

export { decodeSignals } from '@/utils/risk';

/** Clé de niveau de risque canonique. */
export type RiskLevelKey = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';

/**
 * Accesseur unique du score de risque.
 * Accepte n'importe quelle forme de DTO (TeacherRiskIndicator.attrition_risk_score,
 * TeacherRiskProfile.score_risque, PriorityAction.score_risque, drilling.score_risque…)
 * et renvoie TOUJOURS un nombre dans [0,1] ou null si non calculable.
 *
 * Un score null/undefined n'est JAMAIS interprété comme 0 : il devient "Non calculable".
 */
export function getRiskScore(input: {
  attrition_risk_score?: number | null;
  score_risque?: number | null;
  riskScore?: number | null;
}): number | null {
  const v = input.attrition_risk_score ?? input.score_risque ?? input.riskScore;
  if (v == null || Number.isNaN(v)) return null;
  // Normalisation défensive : si le backend renvoie du 0-100, on ramène en 0-1.
  const safe = v <= 1 ? v : v / 100;
  return Math.min(1, Math.max(0, safe));
}

export function riskPct(score: number): number {
  return Math.round((score ?? 0) * 100);
}

/** Niveau de risque + style associé, dérivés du score unique. */
export function riskLevel(score: number): RiskLevelKey {
  return riskLevelFromScore(score);
}

export function riskStyleFor(score: number) {
  return riskStyle(score);
}

/** Libellé FR du niveau (cohérent sur les deux pages). */
export const RISK_LABELS: Record<RiskLevelKey, string> = {
  FAIBLE: 'Faible',
  MODERE: 'Modéré',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

/** Couleur sémantique (utilisée par charts, anneaux, barres). */
export const RISK_COLORS: Record<RiskLevelKey, string> = {
  FAIBLE: '#10b981',
  MODERE: '#f59e0b',
  ELEVE: '#f97316',
  CRITIQUE: '#ef4444',
};

export const RISK_ORDER: RiskLevelKey[] = ['CRITIQUE', 'ELEVE', 'MODERE', 'FAIBLE'];

/** Ordre de sévérité décroissant (pour trier les priorités). */
export function riskSeverityScore(score: number | null): number {
  if (score == null) return -1; // non calculable en dernier
  return riskPct(score);
}

/**
 * RÈGLE CRITIQUE #3 : une couverture non calculable ne doit jamais s'afficher
 * comme 0 %. Cette fonction renvoie soit un pourcentage (0–100), soit `null`
 * (que l'appelant affiche comme "Non calculable" via le module states).
 */
export function toCoveragePercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const pct = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(pct)));
}
