import { Tooltip } from 'antd';
import { ThunderboltOutlined, ExperimentOutlined, ApiOutlined } from '@ant-design/icons';
import type { ModelMode } from '@/models/analyse/analyticsFeature';

interface Props {
  readonly modelMode: ModelMode | undefined;
  readonly modelVersion?: string | null;
  /** Nom de l'artefact du modèle (ex : `gap_predictor_temporal`), fourni par l'API. */
  readonly modelName?: string | null;
  /** Algorithme du modèle (ex : `Gradient Boosting temporel`), fourni par l'API. */
  readonly modelAlgorithm?: string | null;
  /** Validité de la cible prédictive (EXTRAPOLATED_TARGET | REAL_VALIDATED_TARGET | OBSERVED_IN_SIMULATION). */
  readonly targetValidity?: string | null;
  readonly validationScope?: string | null;
  readonly dataOrigin?: string | null;
  readonly size?: 'small' | 'default';
}

/**
 * Formate la version d'un artefact : ajoute le préfixe `v` si absent.
 * - `v1.0.0` reste `v1.0.0` ;
 * - `1.0.0` devient `v1.0.0` ;
 * - valeur null/undefined donne `Version inconnue`.
 */
export function formatModelVersion(version?: string | null): string {
  if (!version) return 'Version inconnue';
  return version.startsWith('v') ? version : `v${version}`;
}

const MODE_META: Record<
  NonNullable<ModelMode>,
  { label: string; description: string; icon: React.ReactNode; cls: string }
> = {
  PRODUCTION_ML: {
    label: 'ML actif',
    description: 'ML actif — modèle approuvé en production',
    icon: <ThunderboltOutlined />,
    cls: 'at-badge at-badge-ml',
  },
  DEMO_ML: {
    label: 'ML de démonstration',
    description: 'ML de démonstration — données insuffisamment représentatives',
    icon: <ExperimentOutlined />,
    cls: 'at-badge at-badge-demo',
  },
  ML: {
    label: 'ML actif',
    description: 'Modèle ML actif (sans qualification production/démo).',
    icon: <ThunderboltOutlined />,
    cls: 'at-badge at-badge-ml',
  },
  HEURISTIC: {
    label: 'Heuristique (repli)',
    description:
      'Repli heuristique fail-closed — le modèle ML est indisponible ou non déployé ' +
      '(raison documentée dans fallback_reason). Score = indice pondéré explicable 0,50/0,12/0,40.',
    icon: <ApiOutlined />,
    cls: 'at-badge at-badge-heur',
  },
  HEURISTIC_FALLBACK: {
    label: 'Heuristique',
    description: 'Analyse heuristique de secours — modèle ML indisponible',
    icon: <ApiOutlined />,
    cls: 'at-badge at-badge-heur',
  },
};

const TARGET_VALIDITY_TEXTS: Record<string, { label: string; description: string }> = {
  EXTRAPOLATED_TARGET: {
    label: 'Cible extrapolée',
    description:
      'Cible extrapolée — validation démonstration : la cible gap_next_3m est dérivée de ' +
      "l'historique (tendance glissante). Les métriques (RMSE/MAE/R²) mesurent la qualité de " +
      "l'extrapolation, pas une performance prédictive observée. Une promotion " +
      'REAL_VALIDATED_TARGET exigera >= 30 re-mesures réelles sur >= 3 mois distincts.',
  },
  REAL_VALIDATED_TARGET: {
    label: 'Cible validée',
    description:
      'Cible validée par re-mesures réelles (target_observation_date) : ' +
      'la performance est mesurée sur des observations futures réelles.',
  },
  OBSERVED_IN_SIMULATION: {
    label: 'Validé sur données simulées',
    description:
      'Pipeline et gouvernance validés de bout en bout sur données simulées réalistes ' +
      '(générateur documenté, seed 42, backtest M+3, IC bootstrap, calibration) ; ' +
      'déploiement réel conditionné à l’accès aux données DSI.',
  },
  SIMULATION_VALIDATED: {
    label: 'Validé sur données simulées',
    description:
      'Validé sur données simulées — méthodologie complète (pipeline, gouvernance, calibration, backtest) validée ; performance réelle à confirmer sur données institutionnelles DSI.',
  },
};

/**
 * Badge visuel compact indiquant le mode d'exécution du service :
 * ML de production, ML de démonstration ou fallback heuristique.
 * Ne présente jamais le mode démo comme un modèle de production.
 * Le nom et la version de l'artefact proviennent uniquement de l'API
 * (jamais codés en dur ici). Le badge cible (target_validity) expose
 * honnêtement le statut de la cible prédictive tant qu'elle n'est pas
 * validée par des re-mesures réelles.
 */
export default function ModelBadge({
  modelMode,
  modelVersion,
  modelName,
  modelAlgorithm,
  targetValidity,
  validationScope,
  dataOrigin,
  size = 'default',
}: Props) {
  const meta = MODE_META[modelMode ?? 'HEURISTIC_FALLBACK'] ?? MODE_META.HEURISTIC_FALLBACK;
  const artifact = modelName ? `${modelName}` : '';
  const version = formatModelVersion(modelVersion);
  const targetMeta = TARGET_VALIDITY_TEXTS[targetValidity ?? ''] ?? null;
  const scopeMeta = TARGET_VALIDITY_TEXTS[validationScope ?? ''] ?? null;
  // Priorite : targetValidity > validationScope > dataOrigin SIMULATED
  const simulationBadge =
    targetMeta && (targetValidity === 'OBSERVED_IN_SIMULATION' || targetValidity === 'SIMULATION_VALIDATED')
      ? targetMeta
      : scopeMeta && (validationScope === 'SIMULATION_VALIDATED' || validationScope === 'OBSERVED_IN_SIMULATION')
        ? scopeMeta
        : dataOrigin === 'SIMULATED'
          ? TARGET_VALIDITY_TEXTS['OBSERVED_IN_SIMULATION']
          : null;
  const displayBadge = simulationBadge || targetMeta;
  const tooltipParts = [
    meta.description,
    modelMode ? `Mode : ${modelMode}.` : 'Mode : HEURISTIC_FALLBACK.',
  ];
  if (artifact && modelVersion) tooltipParts.push(`Artefact : ${artifact} · ${version}.`);
  else if (artifact) tooltipParts.push(`Artefact : ${artifact}.`);
  else if (modelVersion) tooltipParts.push(`Version : ${version}.`);
  if (modelAlgorithm) tooltipParts.push(`Algorithme : ${modelAlgorithm}.`);
  if (displayBadge) tooltipParts.push(displayBadge.description);
  const tooltip = tooltipParts.join(' ');

  const fontSize = size === 'small' ? 11 : 12;
  const padding = size === 'small' ? '2px 8px' : '4px 12px';

  return (
    <Tooltip title={tooltip}>
      <span className={meta.cls} style={{ fontSize, padding }}>
        {meta.icon}
        {meta.label}
        {(modelMode === 'PRODUCTION_ML' || modelMode === 'ML') && (modelName || modelVersion) && (
          <span style={{ marginLeft: 8, opacity: 0.85 }}>
            · {artifact}
            {modelVersion ? ` · ${version}` : ''}
          </span>
        )}
        {simulationBadge ? (
          <span
            className="at-badge at-badge-heur"
            style={{ marginLeft: 6, fontSize: size === 'small' ? 10 : 11, padding: '1px 6px', background: '#fff3cd', color: '#856404', borderColor: '#ffe69c' }}
            title={simulationBadge.description}
          >
            Validé sur données simulées
          </span>
        ) : (
          targetMeta && (
            <span
              className="at-badge at-badge-heur"
              style={{ marginLeft: 6, fontSize: size === 'small' ? 10 : 11, padding: '1px 6px' }}
              title={targetMeta.description}
            >
              {targetMeta.label}
            </span>
          )
        )}
      </span>
    </Tooltip>
  );
}
