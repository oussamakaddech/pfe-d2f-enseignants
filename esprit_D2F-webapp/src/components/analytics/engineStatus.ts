import type { ModelMode } from '@/models/analyse/analyticsFeature';

/**
 * Explication lisible du moteur qui a servi une analyse, dérivée de
 * `fallback_reason` (texte libre du service prédictif).
 *
 * Le badge seul (« Heuristique ») laissait croire que le modèle ML était en
 * panne, alors qu'il est le plus souvent en service mais NON APPLICABLE à
 * l'enseignant (aucun niveau saisi). La raison brute reste disponible dans
 * `detail` (infobulle) : rien n'est masqué, seul le résumé est reformulé.
 */
export interface EngineNote {
  /** Résumé court affiché à côté du badge. */
  readonly label: string;
  /** Raison brute renvoyée par l'API, pour l'infobulle. */
  readonly detail: string | null;
  /** `info` : situation normale expliquée ; `warning` : garde-fou déclenché. */
  readonly tone: 'info' | 'warning';
}

const ML_MODES: ReadonlySet<string> = new Set(['PRODUCTION_ML', 'DEMO_ML', 'ML']);

export function isMlMode(mode: ModelMode | string | null | undefined): boolean {
  return ML_MODES.has(mode ?? '');
}

/** Motifs reconnus dans `fallback_reason` (ordre = priorité). */
const GAP_REASONS: ReadonlyArray<{ pattern: RegExp; note: Omit<EngineNote, 'detail'> }> = [
  {
    pattern: /aucun savoir [ée]valuable|aucune feature|pr[ée]diction ML vide/i,
    note: { label: 'Modèle ML non applicable : aucun niveau saisi', tone: 'info' },
  },
  {
    pattern: /d[ée]rive KS/i,
    note: { label: 'Modèle ML suspendu : dérive des données détectée', tone: 'warning' },
  },
  {
    pattern: /hors plage|features invalides/i,
    note: { label: "Profil hors du domaine d'entraînement du modèle ML", tone: 'warning' },
  },
  {
    // Raison générique du service quand aucune cause n'a été journalisée.
    pattern: /dernier calcul hors mod[èe]le ML/i,
    note: { label: "Dernier calcul effectué sans le modèle ML (relancer l'analyse)", tone: 'info' },
  },
  {
    pattern: /hors p[ée]rim[èe]tre/i,
    note: { label: 'Modèle ML sans couverture du périmètre', tone: 'info' },
  },
];

/** Note du moteur des écarts ; `null` quand le ML a servi (le badge suffit). */
export function describeGapEngine(
  mode: ModelMode | string | null | undefined,
  fallbackReason: string | null | undefined,
): EngineNote | null {
  if (isMlMode(mode)) return null;
  const detail = fallbackReason?.trim() || null;
  const match = detail ? GAP_REASONS.find((r) => r.pattern.test(detail)) : undefined;
  if (match) return { ...match.note, detail };
  return { label: 'Modèle ML indisponible', detail, tone: 'warning' };
}

/**
 * Note du moteur du risque. Hors ML, le score vient de la formule pondérée
 * 0,50/0,12/0,40 appliquée aux écarts : on précise lesquels (prédits par le
 * modèle ML quand il a servi les écarts, heuristiques sinon).
 */
export function describeRiskEngine(
  riskMode: 'ML' | 'HEURISTIC' | string | null | undefined,
  fallbackReason: string | null | undefined,
  gapsMode: ModelMode | string | null | undefined,
): EngineNote | null {
  if (riskMode === 'ML') return null;
  const detail = fallbackReason?.trim() || null;
  const source = isMlMode(gapsMode) ? 'écarts prédits par le ML' : 'écarts heuristiques';
  // La formule a été mesurée meilleure que le modèle ML (simulation) : moteur
  // retenu, pas un mode dégradé.
  if (detail !== null && /formule pond[ée]r[ée]e retenue/i.test(detail)) {
    return {
      label: `Formule pondérée sur les ${source} (validée, meilleure que le modèle ML testé)`,
      detail,
      tone: 'info',
    };
  }
  const notValidated = detail !== null && /decision=reject|non d[ée]ploy[ée]/i.test(detail);
  const why = notValidated ? 'modèle de risque non validé' : 'modèle de risque indisponible';
  return {
    label: `Formule pondérée sur les ${source} (${why})`,
    detail,
    tone: notValidated ? 'info' : 'warning',
  };
}
