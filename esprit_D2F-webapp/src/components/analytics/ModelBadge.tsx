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
  HEURISTIC_FALLBACK: {
    label: 'Heuristique',
    description: 'Analyse heuristique de secours — modèle ML indisponible',
    icon: <ApiOutlined />,
    cls: 'at-badge at-badge-heur',
  },
};

/**
 * Badge visuel compact indiquant le mode d'exécution du service :
 * ML de production, ML de démonstration ou fallback heuristique.
 * Ne présente jamais le mode démo comme un modèle de production.
 * Le nom et la version de l'artefact proviennent uniquement de l'API
 * (jamais codés en dur ici).
 */
export default function ModelBadge({
  modelMode,
  modelVersion,
  modelName,
  size = 'default',
}: Props) {
  const meta = MODE_META[modelMode ?? 'HEURISTIC_FALLBACK'];
  const artifact = modelName ? `${modelName}` : '';
  const version = formatModelVersion(modelVersion);
  const tooltipParts = [
    meta.description,
    modelMode ? `Mode : ${modelMode}.` : 'Mode : HEURISTIC_FALLBACK.',
  ];
  if (artifact && modelVersion) tooltipParts.push(`Artefact : ${artifact} · ${version}.`);
  else if (artifact) tooltipParts.push(`Artefact : ${artifact}.`);
  else if (modelVersion) tooltipParts.push(`Version : ${version}.`);
  const tooltip = tooltipParts.join(' ');

  const fontSize = size === 'small' ? 11 : 12;
  const padding = size === 'small' ? '2px 8px' : '4px 12px';

  return (
    <Tooltip title={tooltip}>
      <span className={meta.cls} style={{ fontSize, padding }}>
        {meta.icon}
        {meta.label}
        {modelMode === 'PRODUCTION_ML' && (modelName || modelVersion) && (
          <span style={{ marginLeft: 8, opacity: 0.85 }}>
            · {artifact}
            {modelVersion ? ` · ${version}` : ''}
          </span>
        )}
      </span>
    </Tooltip>
  );
}
