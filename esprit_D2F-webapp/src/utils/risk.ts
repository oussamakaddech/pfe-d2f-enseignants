// Contrat de risque unique + décodage des signaux — D2F Webapp.
// Source de vérité unique pour le niveau de risque (badge, libellé, couleur).
// Les pages Analyse Prédictive et Tableau de bord DOIVENT utiliser ces helpers
// pour éviter d'afficher deux scores de risque contradictoires.

export type RiskLevelKey = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';

export interface RiskLevelStyle {
  readonly label: string;
  readonly color: string; // couleur principale (texte / bordure)
  readonly bg: string; // fond du badge
  readonly text: string; // texte sur le fond du badge
}

// Palette alignée sur GlassRiskDistribution (donut) pour une cohérence visuelle.
export const RISK_LEVELS: Record<RiskLevelKey, RiskLevelStyle> = {
  CRITIQUE: { label: 'Critique', color: '#ef4444', bg: '#ef4444', text: '#ffffff' },
  ELEVE: { label: 'Élevé', color: '#f97316', bg: '#f97316', text: '#ffffff' },
  MODERE: { label: 'Modéré', color: '#f59e0b', bg: '#f59e0b', text: '#ffffff' },
  FAIBLE: { label: 'Faible', color: '#10b981', bg: '#10b981', text: '#ffffff' },
};

/** Convertit un score de risque (0→1) en clé de niveau. */
export function riskLevelFromScore(score: number): RiskLevelKey {
  const pct = Math.round((score ?? 0) * 100);
  if (pct >= 75) return 'CRITIQUE';
  if (pct >= 50) return 'ELEVE';
  if (pct >= 25) return 'MODERE';
  return 'FAIBLE';
}

export function riskStyle(score: number): RiskLevelStyle {
  return RISK_LEVELS[riskLevelFromScore(score)];
}

/** Seuils de bascule (en %) utilisés pour le libellé — documentés pour le tooltip. */
export const RISK_THRESHOLDS = 'Faible < 25% · Modéré 25–49% · Élevé 50–74% · Critique ≥ 75%';

// ── Décodage des signaux de risque / facteurs de risque ───────────────
// Le backend renvoie parfois des clés techniques, parfois des libellés FR.
// On mappe les clés connues et on laisse passer les libellés déjà lisibles.
export const SIGNAL_LABELS: Record<string, string> = {
  no_training: 'Aucune formation récente',
  stagnation: 'Stagnation des compétences',
  unmet_needs: 'Besoins non couverts',
  gaps_critiques: 'Écarts critiques',
  disengagement: 'Désengagement détecté',
  low_evaluation: 'Évaluations insuffisantes',
  regression: 'Régression récente',
  inactivity: 'Inactivité prolongée',
  alert_open: 'Alertes ouvertes',
};

export function decodeSignals(list?: string[] | null): string[] {
  if (!list || list.length === 0) return [];
  return list.map((s) => SIGNAL_LABELS[s] ?? s);
}
