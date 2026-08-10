import type { ModelPerformance, DriftReport } from '@/models/analyse';
import HealthGauge from './HealthGauge';
import { ChartSkeleton } from './States';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const NA = '—';

type HealthLevel = 'healthy' | 'attention' | 'critical';

function getHealthLevel(score: number): HealthLevel {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'attention';
  return 'critical';
}

function getHealthColor(score: number): string {
  if (score >= 70) return 'var(--rd-success)';
  if (score >= 40) return 'var(--rd-warning)';
  return 'var(--rd-error)';
}

const HEALTH_COLORS: Record<HealthLevel, string> = {
  healthy: 'var(--rd-success)',
  attention: 'var(--rd-warning)',
  critical: 'var(--rd-error)',
};

const HEALTH_LABELS: Record<HealthLevel, string> = {
  healthy: 'Bon état',
  attention: 'Attention',
  critical: 'Critique',
};

function computeModelHealth(
  perf: ModelPerformance | null,
  drift: DriftReport | null,
): {
  score: number;
  level: 'healthy' | 'attention' | 'critical';
  factors: Array<{ key: string; label: string; score: number }>;
} {
  const accuracy = perf?.gap_model_accuracy ?? 0;
  const accuracyScore = Math.round(accuracy * 100);
  const driftPenalty = drift?.drift_detected ? 25 : 0;
  const trainedPenalty = perf?.last_retrained ? 0 : 40;
  const score = Math.max(0, Math.min(100, accuracyScore - driftPenalty - trainedPenalty));
  const level = getHealthLevel(score);
  return {
    score,
    level,
    factors: [
      { key: 'accuracy', label: 'Précision du modèle', score: accuracyScore },
      { key: 'drift', label: 'Stabilité (pas de dérive)', score: driftPenalty > 0 ? 40 : 95 },
      { key: 'trained', label: 'Dernier entraînement', score: perf?.last_retrained ? 90 : 20 },
    ],
  };
}

export default function ModelHealthCard({
  modelPerf,
  drift,
  loading,
}: {
  readonly modelPerf: ModelPerformance | null;
  readonly drift: DriftReport | null;
  readonly loading: boolean;
}) {
  if (loading && !modelPerf) return <ChartSkeleton height={200} />;

  const health = computeModelHealth(modelPerf ?? null, drift);
  const healthColor = HEALTH_COLORS[health.level];
  const healthLabel = HEALTH_LABELS[health.level];
  const accuracy = modelPerf?.gap_model_accuracy;
  const accuracyPct = accuracy != null ? Math.round(accuracy * 100) : null;
  const lastTrained = modelPerf?.last_retrained;
  const trainedDate = lastTrained ? dayjs(lastTrained).format('DD/MM/YYYY à HH:mm') : NA;
  const daysSince = lastTrained ? dayjs().diff(dayjs(lastTrained), 'day') : null;

  return (
    <div className="rd-model-health">
      {drift?.drift_detected && (
        <div className="rd-model-health-warning">
          <span className="rd-model-health-warning-icon">⚠️</span>
          <div>
            <div className="rd-model-health-warning-title">Dérive détectée</div>
            <div className="rd-model-health-warning-text">
              {drift.message ?? 'Le modèle présente une dérive. Un réentraînement est recommandé.'}
            </div>
          </div>
        </div>
      )}

      {accuracy != null && accuracy < 0.5 && (
        <div
          className="rd-model-health-warning"
          style={{ borderColor: 'var(--rd-error)', background: 'var(--rd-error-bg)' }}
        >
          <span className="rd-model-health-warning-icon">🔴</span>
          <div>
            <div className="rd-model-health-warning-title">Précision faible</div>
            <div className="rd-model-health-warning-text">
              La précision du modèle est de {accuracyPct} %. Les prédictions peuvent être peu
              fiables. Envisagez un réentraînement avec des données plus récentes.
            </div>
          </div>
        </div>
      )}

      <div className="rd-model-health-gauges">
        <div className="rd-model-health-gauge">
          <HealthGauge score={health.score} color={healthColor} />
          <div className="rd-model-health-gauge-label">
            <span
              className="rd-model-health-badge"
              style={{ color: healthColor, background: `${healthColor}1f` }}
            >
              {healthLabel}
            </span>
            <span className="rd-muted" style={{ fontSize: 11.5 }}>
              Santé globale
            </span>
          </div>
        </div>

        <div className="rd-model-health-stats">
          <div className="rd-model-health-stat">
            <div
              className="rd-model-health-stat-val"
              style={{
                color:
                  accuracyPct != null && accuracyPct >= 70
                    ? 'var(--rd-success)'
                    : 'var(--rd-warning)',
              }}
            >
              {accuracyPct != null ? `${accuracyPct} %` : NA}
            </div>
            <div className="rd-model-health-stat-lbl">Précision</div>
          </div>
          <div className="rd-model-health-stat">
            <div
              className="rd-model-health-stat-val"
              style={{ color: drift?.drift_detected ? 'var(--rd-error)' : 'var(--rd-success)' }}
            >
              {drift?.drift_detected ? 'Oui' : 'Non'}
            </div>
            <div className="rd-model-health-stat-lbl">Dérive</div>
          </div>
          <div className="rd-model-health-stat">
            <div className="rd-model-health-stat-val">{trainedDate}</div>
            <div className="rd-model-health-stat-lbl">Dernier entraînement</div>
          </div>
          <div className="rd-model-health-stat">
            <div className="rd-model-health-stat-val">
              {daysSince != null ? `Il y a ${daysSince} j` : NA}
            </div>
            <div className="rd-model-health-stat-lbl">Ancienneté</div>
          </div>
        </div>
      </div>

      <div className="rd-model-health-factors">
        {health.factors.map((f) => (
          <div key={f.key} className="rd-model-health-factor">
            <div className="rd-model-health-factor-head">
              <span className="rd-model-health-factor-label">{f.label}</span>
              <span className="rd-model-health-factor-val">{f.score} %</span>
            </div>
            <div className="rd-bar">
              <span
                style={{
                  width: `${f.score}%`,
                  background: getHealthColor(f.score),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
