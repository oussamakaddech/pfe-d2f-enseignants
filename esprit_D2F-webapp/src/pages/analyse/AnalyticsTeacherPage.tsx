import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Input, Spin, Empty, Alert, Tabs as AntTabs } from 'antd';
import {
  ReloadOutlined,
  ExperimentOutlined,
  RiseOutlined,
  FallOutlined,
  AimOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  useAnalyzeTeacher,
  useTeacherGaps,
  useTeacherRecommendations,
  useTeacherRisk,
  useTeacherScopeAnalysis,
  useRiskHistory,
} from '@/hooks/analytics/useAnalyticsQueries';
import { GapsTable, RecommendationsList, RiskHistoryChart } from '@/components/analytics';
import ModelBadge, { formatModelVersion } from '@/components/analytics/ModelBadge';
import RiskFactorRow from '@/components/analytics/RiskFactorRow';
import TeacherScopePanel from '@/components/analytics/TeacherScopePanel';
import { riskColor } from '@/utils/analytics/format';
import type { ModelMode, RiskFactor } from '@/models/analyse/analyticsFeature';
import './analyticsTeacher.redesign.css';

const TREND_LABELS: Record<string, string> = {
  AMELIORATION: 'Amélioration',
  STABLE: 'Stable',
  DEGRADATION: 'Dégradation',
  IMPROVING: 'Amélioration',
  DECLINING: 'Dégradation',
};

function trendClass(trend: string): string {
  if (trend === 'AMELIORATION') return 'at-trend-up';
  if (trend === 'DEGRADATION') return 'at-trend-down';
  return 'at-trend-flat';
}

function trendIcon(trend: string): React.ReactNode {
  if (trend === 'AMELIORATION') return <RiseOutlined />;
  if (trend === 'DEGRADATION') return <FallOutlined />;
  return null;
}

function tabLabel(base: string, count?: number): string {
  return count ? `${base} (${count})` : base;
}

export default function AnalyticsTeacherPage() {
  const { enseignantId = '' } = useParams<{ enseignantId: string }>();
  const [urgence, setUrgence] = useState<string | undefined>();
  const [competenceId, setCompetenceId] = useState<number | null>(null);

  const analyze = useAnalyzeTeacher(enseignantId);
  const risk = useTeacherRisk(enseignantId);
  const gaps = useTeacherGaps(enseignantId, urgence);
  const recos = useTeacherRecommendations(enseignantId, competenceId ?? undefined);
  const history = useRiskHistory(enseignantId);
  const scope = useTeacherScopeAnalysis(enseignantId);

  const gapStats = useMemo(
    () => gaps.data?.gaps_summary ?? { total: 0, critical: 0, high: 0, stagnant: 0, declining: 0 },
    [gaps.data?.gaps_summary],
  );

  const pct = risk.data?.score_percent ?? Math.round((risk.data?.score ?? 0) * 100);
  const score = risk.data?.score ?? 0;
  const level = risk.data?.niveau ?? 'FAIBLE';
  const levelLabel = risk.data?.level_label ?? 'Faible';
  const color = riskColor(level);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - score);

  const trend = risk.data?.tendance ?? 'STABLE';
  const trendCls = trendClass(trend);
  const trendIco = trendIcon(trend);

  return (
    <div className="at-root">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="at-hero at-animate">
        <div className="at-hero-glow" />
        <div className="at-hero-row">
          <div className="at-hero-avatar">
            {risk.data?.enseignant_nom
              ? risk.data.enseignant_nom
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : enseignantId.slice(-2)}
          </div>
          <div className="at-hero-info">
            <div className="at-hero-kicker">
              <AimOutlined /> Analyse prédictive — Enseignant
            </div>
            <h1 className="at-hero-title">
              {risk.data?.enseignant_nom || scope.data?.context?.nom_complet || enseignantId}
            </h1>
            <p className="at-hero-sub">
              Score de risque : <b>{pct}%</b> · {levelLabel}
            </p>
            <span style={{ display: 'block', marginTop: 8 }}>
              <ModelBadge
                modelMode={risk.data?.model_mode}
                modelVersion={risk.data?.model_version}
                modelName={risk.data?.model_name}
                modelAlgorithm={risk.data?.model_algorithm}
                size="small"
              />
            </span>
          </div>
          <div className="at-hero-actions">
            <Input
              value={
                risk.data?.enseignant_nom
                  ? `${risk.data.enseignant_nom} (${enseignantId})`
                  : enseignantId
              }
              disabled
              placeholder="Enseignant"
              style={{
                width: 220,
                background: 'var(--at-panel2)',
                borderColor: 'var(--at-line)',
                color: 'var(--at-ink)',
                borderRadius: 12,
              }}
            />
            <button
              type="button"
              className="at-btn at-btn-primary"
              disabled={analyze.isPending}
              onClick={() => analyze.mutate()}
            >
              <ExperimentOutlined />
              {analyze.isPending ? 'Analyse...' : "Lancer l'analyse"}
            </button>
            <button type="button" className="at-btn" onClick={() => risk.refetch()}>
              <ReloadOutlined /> Rafraîchir
            </button>
          </div>
        </div>
      </div>

      {/* ── Score + Factors ───────────────────────────────── */}
      {risk.isError && (
        <Alert
          type="error"
          showIcon
          message="Impossible de charger l'analyse du risque"
          style={{ marginBottom: 16 }}
        />
      )}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <div
            className="at-score-card at-animate at-animate-d1"
            style={{ '--score-color': color } as React.CSSProperties}
          >
            {risk.isLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Spin />
              </div>
            ) : (
              <>
                <div className="at-score-gauge">
                  <svg className="at-score-ring" viewBox="0 0 160 160">
                    <circle className="at-score-ring-bg" cx="80" cy="80" r="70" />
                    <circle
                      className="at-score-ring-fill"
                      cx="80"
                      cy="80"
                      r="70"
                      style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: offset,
                        stroke: color,
                      }}
                    />
                  </svg>
                  <div className="at-score-label">
                    <div className="at-score-pct">
                      {pct}
                      <span className="at-score-pct-sign">%</span>
                    </div>
                  </div>
                </div>
                <div className="at-score-tag" style={{ color, borderColor: color }}>
                  {levelLabel}
                </div>
                <div className="at-score-meta">
                  {risk.data?.precedent_score != null && (
                    <div className="at-score-meta-row">
                      Précédent : <b>{Math.round(risk.data.precedent_score * 100)}%</b>
                    </div>
                  )}
                  <div className="at-score-meta-row">
                    Tendance :{' '}
                    <span className={`at-trend-badge ${trendCls}`}>
                      {trendIco} {TREND_LABELS[trend] ?? trend}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Col>
        <Col xs={24} md={16}>
          <FactorsPanel
            facteurs={risk.data?.facteurs}
            loading={risk.isLoading}
            levelLabel={levelLabel}
          />
        </Col>
      </Row>

      {/* ── Stats pills ────────────────────────────────────── */}
      {!gaps.isLoading && gapStats.total > 0 && (
        <div className="at-stats at-animate at-animate-d2">
          <div className="at-stat" style={{ '--accent': 'var(--at-brand)' } as React.CSSProperties}>
            <div className="at-stat-value" style={{ color: 'var(--at-brand)' }}>
              {gapStats.total}
            </div>
            <div className="at-stat-label">Gaps détectés</div>
          </div>
          <div
            className="at-stat"
            style={
              {
                '--accent': gapStats.critical > 0 ? 'var(--at-danger)' : 'var(--at-success)',
              } as React.CSSProperties
            }
          >
            <div
              className="at-stat-value"
              style={{ color: gapStats.critical > 0 ? 'var(--at-danger)' : 'var(--at-success)' }}
            >
              {gapStats.critical}
            </div>
            <div className="at-stat-label">Critiques</div>
          </div>
          <div
            className="at-stat"
            style={{ '--accent': 'var(--at-warning)' } as React.CSSProperties}
          >
            <div className="at-stat-value" style={{ color: 'var(--at-warning)' }}>
              {gapStats.stagnant}
            </div>
            <div className="at-stat-label">Stagnants</div>
          </div>
          <div
            className="at-stat"
            style={
              {
                '--accent': gapStats.declining > 0 ? 'var(--at-danger)' : 'var(--at-success)',
              } as React.CSSProperties
            }
          >
            <div
              className="at-stat-value"
              style={{ color: gapStats.declining > 0 ? 'var(--at-danger)' : 'var(--at-success)' }}
            >
              {gapStats.declining}
            </div>
            <div className="at-stat-label">En régression</div>
          </div>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="at-tabs-card at-animate at-animate-d3">
        <AntTabs
          className="at-tabs"
          items={[
            {
              key: 'scope',
              label: tabLabel('Analyse contextuelle', scope.data?.gaps.length),
              children: <TeacherScopePanel data={scope.data} loading={scope.isLoading} />,
            },
            {
              key: 'gaps',
              label: tabLabel('Gaps de compétences', gapStats.total),
              children: (
                <div>
                  <div className="at-urgence-pills">
                    {(['FAIBLE', 'MODEREE', 'HAUTE', 'CRITIQUE'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        className={`at-pill ${urgence === u ? 'is-active' : ''}`}
                        onClick={() => setUrgence(urgence === u ? undefined : u)}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <GapsTab
                    gaps={gaps}
                    onSelectCompetence={(g) => setCompetenceId(g.competence_id)}
                  />
                </div>
              ),
            },
            {
              key: 'recos',
              label: tabLabel('Recommandations', recos.data?.total),
              children: (
                <RecommendationsList
                  recommendations={recos.data?.recommendations ?? []}
                  loading={recos.isLoading}
                />
              ),
            },
            {
              key: 'models',
              label: 'Modèles',
              forceRender: true,
              children: <ModelsInfoPanel risk={risk} gaps={gaps} />,
            },
            {
              key: 'history',
              label: 'Historique du risque',
              children: (
                <RiskHistoryChart points={history.data?.points ?? []} loading={history.isLoading} />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

/* ── Factors panel ──────────────────────────────────────────── */
function FactorsPanel({
  facteurs,
  loading,
  levelLabel,
}: Readonly<{ facteurs: RiskFactor[] | undefined; loading: boolean; levelLabel: string }>) {
  if (loading) {
    return (
      <div className="at-factors" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
        <Spin />
      </div>
    );
  }
  if (!facteurs?.length) {
    return (
      <div className="at-factors" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
        <Empty description="Aucun facteur disponible" />
      </div>
    );
  }
  const probas = facteurs.filter((f) => f.categorie === 'PROBABILITE_ML');
  const facteursScore = facteurs.filter((f) => f.categorie !== 'PROBABILITE_ML');
  const topProba = probas.length
    ? probas.reduce((a, b) => (b.valeur_brute > a.valeur_brute ? b : a), probas[0])
    : null;
  return (
    <div className="at-factors">
      {probas.length > 0 && (
        <>
          <div className="at-factors-head">
            <div className="at-icon">
              <ExperimentOutlined />
            </div>
            Classifier ML
          </div>
          {probas.map((f) => (
            <div key={f.nom} className="at-factor-row">
              <div>
                <div className="at-factor-name">
                  {f.nom}
                  <span
                    style={{ fontSize: 10, color: 'var(--at-ink3)', marginLeft: 6 }}
                    title="Probabilité calculée par le classifier ML"
                  >
                    {' '}
                    ML
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="at-factor-contrib is-proba">
                  {(f.valeur_brute * 100).toFixed(0)}% (prob.)
                </div>
              </div>
            </div>
          ))}
          {topProba && (
            <div className="at-factor-name" style={{ marginTop: 8 }}>
              Classe ML la plus probable : {topProba.nom.replace(/^Probabilité classe\s*/i, '')}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--at-ink3)', marginTop: 8 }}>
            Le niveau {levelLabel} provient du score métier pondéré. Le classifier ML estime
            uniquement des probabilités de classes.
          </div>
        </>
      )}
      {facteursScore.length > 0 && (
        <>
          <div className="at-factors-head">
            <div className="at-icon">
              <InfoCircleOutlined />
            </div>
            Explication du score (facteurs pondérés)
          </div>
          {facteursScore.map((f) => (
            <RiskFactorRow key={f.code ?? f.nom} facteur={f} />
          ))}
        </>
      )}
    </div>
  );
}

/* ── Panneau Modeles ─────────────────────────────────────────────── */
const MODEL_MODE_TEXTS: Record<string, { titre: string; detail: string; warn: boolean }> = {
  PRODUCTION_ML: {
    titre: 'ML actif — modèle approuvé en production',
    detail: "L'analyse repose sur le modèle ML entraîné et approuvé (aucun fallback heuristique).",
    warn: false,
  },
  DEMO_ML: {
    titre: 'ML de démonstration — données insuffisamment représentatives',
    detail:
      'Modèle de démonstration — données insuffisamment représentatives, résultat non productif.',
    warn: true,
  },
  ML: {
    titre: 'Modèle ML actif',
    detail: "L'analyse repose sur le modèle ML entraîné.",
    warn: false,
  },
  HEURISTIC_FALLBACK: {
    titre: 'Analyse heuristique de secours — modèle ML indisponible',
    detail: 'Modèle ML indisponible — calcul effectué par le moteur heuristique expliqué.',
    warn: true,
  },
};

function ModelsInfoPanel({
  risk,
  gaps,
}: Readonly<{ risk: ReturnType<typeof useTeacherRisk>; gaps: ReturnType<typeof useTeacherGaps> }>) {
  if (risk.isLoading) {
    return (
      <div style={{ padding: 30, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  const mode = risk.data?.model_mode ?? 'HEURISTIC_FALLBACK';
  const version = risk.data?.model_version ?? null;
  const modelName = risk.data?.model_name ?? null;
  const algorithm = risk.data?.model_algorithm ?? null;
  const meta = MODEL_MODE_TEXTS[mode] ?? MODEL_MODE_TEXTS.HEURISTIC_FALLBACK;
  const model = gaps.data?.model;

  // Affichage clair du modèle : Mode, Algorithme, Artefact, Version (depuis l'API).
  const detailRows: Array<[string, string]> = [
    ['Mode', mode],
    ['Algorithme', algorithm || 'Non disponible'],
  ];
  if (modelName && mode !== 'HEURISTIC_FALLBACK') {
    detailRows.push(['Artefact du modèle', modelName]);
  }
  if (version && mode !== 'HEURISTIC_FALLBACK') {
    detailRows.push(["Version de l'artefact", formatModelVersion(version)]);
  }
  if (model?.dataset_version) {
    detailRows.push(['Version du jeu de données', model.dataset_version]);
  }
  if (model?.prediction_horizon) {
    detailRows.push(['Horizon de prédiction', model.prediction_horizon]);
  }
  if (model?.total_rows !== undefined) {
    detailRows.push(['Observations (total)', String(model.total_rows)]);
  }
  if (model?.real_rows !== undefined) {
    detailRows.push(['Observations réelles', String(model.real_rows)]);
  }
  if (model?.synthetic_share_pct !== undefined) {
    detailRows.push(['Part synthétique', `${model.synthetic_share_pct}%`]);
  }
  if (model?.fallback_reason) {
    detailRows.push(['Raison du fallback', model.fallback_reason]);
  }
  return (
    <div style={{ padding: '6px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--at-ink2)' }}>
          Statut du modèle :
        </span>
        <ModelBadge
          modelMode={mode as ModelMode | undefined}
          modelVersion={version}
          modelName={modelName}
          modelAlgorithm={algorithm}
        />
      </div>
      {detailRows.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '6px 16px',
          }}
        >
          {detailRows.map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, color: 'var(--at-ink3)' }}>
              {k} : <b style={{ color: 'var(--at-ink2)' }}>{v}</b>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: meta.warn ? 'var(--at-warning)' : 'var(--at-ink3)',
        }}
      >
        {meta.titre} — {meta.detail}
      </div>
    </div>
  );
}

/* ── Contenu onglet Gaps ──────────────────────────────────────── */
function GapsTab({
  gaps,
  onSelectCompetence,
}: {
  readonly gaps: ReturnType<typeof useTeacherGaps>;
  readonly onSelectCompetence: (g: { competence_id: number }) => void;
}) {
  if (gaps.isLoading)
    return (
      <div style={{ padding: 30, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  if (gaps.data?.gaps.length) {
    return (
      <GapsTable
        gaps={gaps.data.gaps}
        loading={gaps.isLoading}
        onRowClick={(g) => onSelectCompetence(g)}
      />
    );
  }
  return <Empty description="Aucun gap — lancez une analyse" />;
}
