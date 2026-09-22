import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Input, Spin, Empty, Alert, Collapse, Tag, Tabs as AntTabs } from 'antd';
import {
  ReloadOutlined,
  ExperimentOutlined,
  RiseOutlined,
  FallOutlined,
  AimOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
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
import RiskFactorRow, { formatScopeLabel } from '@/components/analytics/RiskFactorRow';
import TeacherScopePanel from '@/components/analytics/TeacherScopePanel';
import { riskColor } from '@/utils/analytics/format';
import type { ModelMode, RiskContribution, RiskFactor } from '@/models/analyse/analyticsFeature';
import './analyticsTeacher.redesign.css';

const RISK_CLASS_LABELS: Record<string, string> = {
  LOW: 'FAIBLE',
  MEDIUM: 'MODEREE',
  HIGH: 'HAUTE',
  CRITICAL: 'CRITIQUE',
};

function riskClassLabel(riskClass?: string | null): string {
  if (!riskClass) return '—';
  return RISK_CLASS_LABELS[riskClass.toUpperCase()] ?? riskClass;
}

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

/* Types derives des hooks : une seule source de verite pour les props des
 * sous-composants (RiskData / GapsData sont declares plus bas, hoistes). */
type RiskPayload = RiskData['data'];
type GapsModelInfo = NonNullable<GapsData['data']>['model'];
interface GapStats {
  readonly total: number;
  readonly critical: number;
  readonly high: number;
  readonly stagnant: number;
  readonly declining: number;
}

interface HeroProps {
  readonly enseignantId: string;
  readonly nom: string;
  readonly pct: number;
  readonly levelLabel: string;
  readonly scoreNonSignificatif: boolean;
  readonly gapsModel?: GapsModelInfo;
  readonly risk?: RiskPayload;
  readonly analyzePending: boolean;
  readonly onAnalyze: () => void;
  readonly onRefresh: () => void;
}

/* ── Bandeau d'identite + moteurs reellement utilises ──────────────── */
function TeacherHero({
  enseignantId,
  nom,
  pct,
  levelLabel,
  scoreNonSignificatif,
  gapsModel,
  risk,
  analyzePending,
  onAnalyze,
  onRefresh,
}: HeroProps) {
  const initiales = nom
    ? nom
        .split(' ')
        .map((mot) => mot[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : enseignantId.slice(-2);

  return (
    <div className="at-hero at-animate">
      <div className="at-hero-glow" />
      <div className="at-hero-row">
        <div className="at-hero-avatar">{initiales}</div>
        <div className="at-hero-info">
          <div className="at-hero-kicker">
            <AimOutlined /> Analyse prédictive — Enseignant
          </div>
          <h1 className="at-hero-title">{nom || enseignantId}</h1>
          <p
            className="at-hero-sub"
            title={
              scoreNonSignificatif
                ? "Aucun niveau de compétence n'est enregistré sur ce périmètre : le moteur retient un niveau actuel de 0, ce qui porte tous les écarts à leur maximum. L'indice reflète l'absence de données, pas le risque réel de l'enseignant."
                : "Indice pondéré explicable (facteurs, caps, profil comportemental) — indice d'aide au classement, PAS une probabilité calibrée."
            }
          >
            Indice de risque : <b>{pct} / 100</b> (non calibré) · {levelLabel}
            {scoreNonSignificatif && (
              <>
                {' '}
                <Tag color="warning" className="at-tag-reserve">
                  non significatif — aucun niveau enregistré
                </Tag>
              </>
            )}
          </p>
          {/* Deux moteurs distincts : les ecarts et le risque. Chaque badge decrit
              le moteur qui a reellement produit SON resultat — l'API fournit les
              deux (model_mode / model_name / model_version). */}
          <span className="at-hero-engines">
            <span className="at-hero-engine-label">Moteur des écarts :</span>
            <ModelBadge
              modelMode={gapsModel?.model_mode}
              modelVersion={gapsModel?.model_version}
              modelName={gapsModel?.model_name}
              targetValidity={gapsModel?.target_validity}
              validationScope={gapsModel?.validation_scope}
              dataOrigin={gapsModel?.data_origin}
              size="small"
            />
            <span className="at-hero-engine-label">Moteur du risque :</span>
            <ModelBadge
              modelMode={risk?.model_mode}
              modelVersion={risk?.model_version}
              modelName={risk?.model_name}
              targetValidity={risk?.target_validity ?? gapsModel?.target_validity}
              validationScope={risk?.validation_scope ?? gapsModel?.validation_scope}
              dataOrigin={risk?.data_origin ?? gapsModel?.data_origin}
              size="small"
            />
          </span>
        </div>
        <div className="at-hero-actions">
          <Input
            value={nom ? `${nom} (${enseignantId})` : enseignantId}
            disabled
            placeholder="Enseignant"
            className="at-hero-input"
          />
          <button
            type="button"
            className="at-btn at-btn-primary"
            disabled={analyzePending}
            onClick={onAnalyze}
          >
            <ExperimentOutlined />
            {analyzePending ? 'Analyse...' : "Lancer l'analyse"}
          </button>
          <button type="button" className="at-btn" onClick={onRefresh}>
            <ReloadOutlined /> Rafraîchir
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScoreCardProps {
  readonly pct: number;
  readonly score: number;
  readonly levelLabel: string;
  readonly color: string;
  readonly trend: string;
  readonly isMlRisk: boolean;
  readonly riskClass?: string | null;
  readonly precedentScore?: number | null;
  readonly scoreNonSignificatif: boolean;
  readonly loading: boolean;
}

/* ── Carte de score ────────────────────────────────────────────────
 * Quand le score n'est pas significatif (aucun niveau enregistre), la carte est
 * volontairement DESATUREE : anneau et pastille passent au gris neutre. Le
 * chiffre reste affiche — on ne cache rien — mais il cesse d'etre mis en scene
 * comme un verdict rouge alors qu'il ne mesure qu'une donnee absente. */
function RiskScoreCard({
  pct,
  score,
  levelLabel,
  color,
  trend,
  isMlRisk,
  riskClass,
  precedentScore,
  scoreNonSignificatif,
  loading,
}: ScoreCardProps) {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - score);
  const couleurServie = scoreNonSignificatif ? 'var(--at-ink3)' : color;

  return (
    <div
      className={`at-score-card at-animate at-animate-d1${scoreNonSignificatif ? ' is-non-significatif' : ''}`}
      style={{ '--score-color': couleurServie } as React.CSSProperties}
    >
      {loading ? (
        <div className="at-score-loading">
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
                  stroke: couleurServie,
                }}
              />
            </svg>
            <div
              className="at-score-label"
              title="Indice de risque (non calibré) — pas une probabilité"
            >
              <div className="at-score-pct">
                {pct}
                <span className="at-score-pct-sign">/100</span>
              </div>
            </div>
          </div>
          <div
            className="at-score-tag"
            style={{ color: couleurServie, borderColor: couleurServie }}
          >
            {levelLabel}
          </div>
          <div
            className="at-score-meta"
            title={
              isMlRisk
                ? `Score servi par le modèle ML calibré : probabilité calibrée de la classe ${riskClassLabel(riskClass)} (validation sur données simulées). Décomposition : contributions du modèle (vue principale) + heuristique de référence (vue secondaire).`
                : "Indice pondéré explicable : facteurs normalisés × poids (0,50 gaps critiques / 0,12 gaps haute urgence / 0,40 profondeur moyenne), plafonnement documenté, profil comportemental. Indice d'aide au classement — PAS une probabilité calibrée."
            }
          >
            <div className="at-score-meta-row at-score-meta-small">
              {isMlRisk ? (
                <>
                  Probabilité calibrée {pct}% · classe <b>{riskClassLabel(riskClass)}</b> (modèle
                  ML, validé sur données simulées)
                </>
              ) : (
                <>Indice de risque {pct} / 100 (non calibré)</>
              )}
            </div>
            {scoreNonSignificatif && (
              <div className="at-score-meta-row at-score-reserve">
                Score non significatif : aucun niveau enregistré, tous les écarts sont au maximum
                par défaut.
              </div>
            )}
            {precedentScore != null && (
              <div className="at-score-meta-row">
                Précédent : <b>{Math.round(precedentScore * 100)}</b> / 100
              </div>
            )}
            <div className="at-score-meta-row">
              Tendance :{' '}
              <span className={`at-trend-badge ${trendClass(trend)}`}>
                {trendIcon(trend)} {TREND_LABELS[trend] ?? trend}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Compteurs d'ecarts ────────────────────────────────────────────── */
function GapStatsRow({ stats }: { readonly stats: GapStats }) {
  const pastilles = [
    { valeur: stats.total, libelle: 'Gaps détectés', accent: 'var(--at-brand)' },
    {
      valeur: stats.critical,
      libelle: 'Critiques',
      accent: stats.critical > 0 ? 'var(--at-danger)' : 'var(--at-success)',
    },
    { valeur: stats.stagnant, libelle: 'Stagnants', accent: 'var(--at-warning)' },
    {
      valeur: stats.declining,
      libelle: 'En régression',
      accent: stats.declining > 0 ? 'var(--at-danger)' : 'var(--at-success)',
    },
  ];

  return (
    <div className="at-stats at-animate at-animate-d2">
      {pastilles.map((p) => (
        <div
          key={p.libelle}
          className="at-stat"
          style={{ '--accent': p.accent } as React.CSSProperties}
        >
          <div className="at-stat-value" style={{ color: p.accent }}>
            {p.valeur}
          </div>
          <div className="at-stat-label">{p.libelle}</div>
        </div>
      ))}
    </div>
  );
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

  const score = risk.data?.score ?? 0;
  const pct = risk.data?.score_percent ?? Math.round(score * 100);
  const level = risk.data?.niveau ?? 'FAIBLE';
  const levelLabel = risk.data?.level_label ?? 'Faible';
  const trend = risk.data?.tendance ?? 'STABLE';
  // Le moteur du risque est teste a un seul endroit : toute la page en depend.
  const isMlRisk = risk.data?.mode === 'ML';

  // Aucun niveau enregistré sur le périmètre : le moteur retient un niveau
  // actuel de 0 pour chaque savoir, ce qui porte TOUS les écarts à leur maximum
  // et gonfle mécaniquement l'indice de risque. Le score n'est alors pas une
  // mesure du risque de l'enseignant, mais la conséquence d'une donnée absente.
  // On garde le chiffre affiché, tout en cessant de le présenter comme un
  // verdict : sans cette réserve, un enseignant jamais évalué apparaît CRITIQUE.
  const scoreNonSignificatif = scope.data?.niveaux_sur_scope === 0;

  const nom = risk.data?.enseignant_nom || scope.data?.context?.nom_complet || '';

  return (
    <div className="at-root">
      <TeacherHero
        enseignantId={enseignantId}
        nom={nom}
        pct={pct}
        levelLabel={levelLabel}
        scoreNonSignificatif={scoreNonSignificatif}
        gapsModel={gaps.data?.model}
        risk={risk.data}
        analyzePending={analyze.isPending}
        onAnalyze={() => analyze.mutate()}
        onRefresh={() => risk.refetch()}
      />

      {risk.isError && (
        <Alert
          type="error"
          showIcon
          message="Impossible de charger l'analyse du risque"
          className="at-alert-block"
        />
      )}

      <Row gutter={[16, 16]} className="at-row-block">
        <Col xs={24} md={8}>
          <RiskScoreCard
            pct={pct}
            score={score}
            levelLabel={levelLabel}
            color={riskColor(level)}
            trend={trend}
            isMlRisk={isMlRisk}
            riskClass={risk.data?.risk_class}
            precedentScore={risk.data?.precedent_score}
            scoreNonSignificatif={scoreNonSignificatif}
            loading={risk.isLoading}
          />
        </Col>
        <Col xs={24} md={16}>
          {isMlRisk ? (
            <RiskMLExplanationPanel
              contributions={risk.data?.contributions}
              explanationMethod={risk.data?.explanation_method}
              probabilities={risk.data?.probabilities}
              riskClass={risk.data?.risk_class}
              heuristicReference={risk.data?.heuristic_reference}
              levelLabel={levelLabel}
              loading={risk.isLoading}
            />
          ) : (
            <FactorsPanel
              facteurs={risk.data?.facteurs}
              loading={risk.isLoading}
              levelLabel={levelLabel}
            />
          )}
          {/* La raison du repli n'est plus affichee ici : elle etait redondante.
              Le moteur reellement utilise reste visible sur le badge « Moteur du
              risque » en entete, et le detail technique figure dans l'onglet
              Modeles, ligne « Raison du repli ». La garantie de tracabilite est
              donc conservee, sans texte technique brut dans la vue principale. */}
        </Col>
      </Row>

      {!gaps.isLoading && gapStats.total > 0 && <GapStatsRow stats={gapStats} />}

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
                  {gaps.data?.model?.near_boundary_warning && (
                    <Alert
                      type="warning"
                      showIcon
                      className="at-alert-tab"
                      message="Proche des limites du domaine d'entraînement"
                      description={`${gaps.data.model.near_boundary_warning.message} — la prédiction reste servie (avertissement non bloquant), mais la fiabilité est moindre aux bornes.`}
                    />
                  )}
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
  // Perimetre partage par TOUS les facteurs du score : il est alors redondant
  // de le repeter ligne par ligne. `null` des qu'un facteur differe.
  const perimetresScore = facteursScore.map((f) => formatScopeLabel(f));
  const perimetreCommun =
    perimetresScore.length > 0 &&
    perimetresScore.every((x) => x !== null && x === perimetresScore[0])
      ? perimetresScore[0]
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
                    title="Probabilité de classe estimée par le classifier ML (hors indice de risque)"
                  >
                    {' '}
                    ML
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="at-factor-contrib is-proba">
                  {(f.valeur_brute * 100).toFixed(0)}% (classe ML)
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
            Le niveau {levelLabel} provient de l'indice métier pondéré (non calibré — pas une
            probabilité). Le classifier ML estime uniquement des probabilités de classes.
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
          {/* Perimetre commun : tous les facteurs portent le meme, on l'affiche
              une seule fois en entete plutot que de le repeter sur chaque ligne. */}
          {perimetreCommun && <div className="at-factors-scope">{perimetreCommun}</div>}
          {facteursScore.map((f) => (
            <RiskFactorRow key={f.code ?? f.nom} facteur={f} hideScope={perimetreCommun !== null} />
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
  HEURISTIC: {
    titre: 'Heuristique (repli fail-closed)',
    detail:
      "Le modèle ML est indisponible ou non déployé — score servi par l'heuristique 0,50/0,12/0,40 (raison dans fallback_reason).",
    warn: true,
  },
  HEURISTIC_FALLBACK: {
    titre: 'Analyse heuristique de secours — modèle ML indisponible',
    detail: 'Modèle ML indisponible — calcul effectué par le moteur heuristique expliqué.',
    warn: true,
  },
};

const TARGET_VALIDITY_LABELS: Record<string, string> = {
  EXTRAPOLATED_TARGET: 'Cible extrapolée — validation démonstration',
  OBSERVED_IN_SIMULATION: 'Cible observée en simulation — validation simulation',
};

const VALIDATION_SCOPE_LABELS: Record<string, string> = {
  SIMULATION_VALIDATED: 'Validé sur données simulées',
  REAL_VALIDATED: 'Validé sur données réelles DSI',
};

/** Libellé de validité de la cible (repli : valeur brute API). */
function targetValidityLabel(targetValidity: string): string {
  return TARGET_VALIDITY_LABELS[targetValidity] ?? 'Cible validée par re-mesures réelles';
}

/** Libellé de portée de validation (repli : valeur brute API). */
function validationScopeLabel(validationScope: string): string {
  return VALIDATION_SCOPE_LABELS[validationScope] ?? validationScope;
}

/** Contexte d'affichage du modèle (valeurs déjà résolues depuis l'API). */
interface ModelDisplayContext {
  mode: string;
  version: string | null;
  modelName: string | null;
  algorithm: string | null;
  targetValidity: string | null;
  validationScope: string | null;
  dataOrigin: string | null;
}

type RiskData = ReturnType<typeof useTeacherRisk>;
type GapsData = ReturnType<typeof useTeacherGaps>;

/** Lignes de détail du modèle : mode, algorithme, validité, risque, artefact. */
function buildModelDetailRows(
  risk: RiskData,
  gaps: GapsData,
  ctx: ModelDisplayContext,
): Array<[string, string]> {
  const model = gaps.data?.model;
  const rows: Array<[string, string]> = [
    ['Mode', ctx.mode],
    ['Algorithme', ctx.algorithm || 'Non disponible'],
  ];
  appendValidityRows(rows, ctx);
  appendRiskEngineRows(rows, risk);
  appendArtifactRows(rows, ctx, model);
  return rows;
}

function appendValidityRows(rows: Array<[string, string]>, ctx: ModelDisplayContext): void {
  if (ctx.targetValidity) {
    rows.push(['Validité de la cible', targetValidityLabel(ctx.targetValidity)]);
  }
  if (ctx.validationScope) {
    rows.push(['Portée de validation', validationScopeLabel(ctx.validationScope)]);
  }
  if (ctx.dataOrigin) {
    rows.push([
      'Origine des données',
      ctx.dataOrigin === 'SIMULATED' ? 'Données simulées (seed 42)' : ctx.dataOrigin,
    ]);
  }
}

function appendRiskEngineRows(rows: Array<[string, string]>, risk: RiskData): void {
  if (risk.data?.score_type) {
    rows.push(['Type de score', scoreTypeLabel(risk.data?.mode)]);
  }
  rows.push(['Moteur de risque', riskEngineLabel(risk)]);
  if (risk.data?.mode === 'HEURISTIC' && risk.data?.fallback_reason) {
    rows.push(['Raison du repli', risk.data.fallback_reason]);
  }
  if (risk.data?.mode === 'ML' && risk.data?.explanation_method) {
    rows.push(['Explicabilité', risk.data.explanation_method]);
  }
}

function scoreTypeLabel(mode: string | undefined): string {
  if (mode === 'ML') {
    return 'Probabilité calibrée par le modèle (isotonique sur CRITIQUE)';
  }
  return 'Indice pondéré explicable (non calibré)';
}

function riskEngineLabel(risk: RiskData): string {
  if (risk.data?.mode === 'ML') {
    const riskClass = risk.data?.risk_class ?? '—';
    const pct = Math.round((risk.data?.probability_calibrated ?? 0) * 100);
    return `ML calibré — classe ${riskClass} (${pct}%)`;
  }
  return 'Heuristique 0,50/0,12/0,40 (repli fail-closed)';
}

function appendArtifactRows(
  rows: Array<[string, string]>,
  ctx: ModelDisplayContext,
  model: unknown,
): void {
  const isFallback = ctx.mode === 'HEURISTIC_FALLBACK';
  if (ctx.modelName && !isFallback) {
    rows.push(['Artefact du modèle', ctx.modelName]);
  }
  if (ctx.version && !isFallback) {
    rows.push(["Version de l'artefact", formatModelVersion(ctx.version)]);
  }
  if (model == null || typeof model !== 'object') {
    return;
  }
  const m = model as Record<string, unknown>;
  appendModelMetaRows(rows, m);
}

function appendModelMetaRows(rows: Array<[string, string]>, m: Record<string, unknown>): void {
  if (typeof m['dataset_version'] === 'string') {
    rows.push(['Version du jeu de données', m['dataset_version']]);
  }
  if (typeof m['prediction_horizon'] === 'string') {
    rows.push(['Horizon de prédiction', m['prediction_horizon']]);
  }
  if (typeof m['total_rows'] === 'number') {
    rows.push(['Observations (total)', String(m['total_rows'])]);
  }
  if (typeof m['real_rows'] === 'number') {
    rows.push(['Observations réelles', String(m['real_rows'])]);
  }
  if (typeof m['synthetic_share_pct'] === 'number') {
    rows.push(['Part synthétique', `${m['synthetic_share_pct']}%`]);
  }
  if (typeof m['fallback_reason'] === 'string') {
    rows.push(['Raison du fallback', m['fallback_reason']]);
  }
  const warning = m['near_boundary_warning'];
  if (warning != null && typeof warning === 'object') {
    const w = warning as { message?: unknown; features?: unknown };
    const features = Array.isArray(w.features) ? w.features.join(', ') : '';
    rows.push(['Proximité des bornes', `${String(w.message ?? '')} (features : ${features})`]);
  }
}

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
  const targetValidity = risk.data?.target_validity ?? model?.target_validity ?? null;
  const validationScope = risk.data?.validation_scope ?? model?.validation_scope ?? null;
  const dataOrigin = risk.data?.data_origin ?? model?.data_origin ?? null;

  const detailRows = buildModelDetailRows(risk, gaps, {
    mode,
    version,
    modelName,
    algorithm,
    targetValidity,
    validationScope,
    dataOrigin,
  });
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
          targetValidity={targetValidity}
          validationScope={validationScope}
          dataOrigin={dataOrigin}
        />
      </div>
      {targetValidity === 'EXTRAPOLATED_TARGET' && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'var(--at-warning)',
            padding: '6px 10px',
            border: '1px solid var(--at-warning)',
            borderRadius: 8,
          }}
        >
          Cible extrapolée — validation démonstration : la cible gap_next_3m est dérivée de
          l'historique (tendance glissante), aucune re-mesure future réelle n'est encore disponible.
          Les métriques mesurent la qualité de l'extrapolation, pas une performance prédictive
          observée.
        </div>
      )}
      {(targetValidity === 'OBSERVED_IN_SIMULATION' ||
        validationScope === 'SIMULATION_VALIDATED' ||
        dataOrigin === 'SIMULATED') && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: '#856404',
            background: '#fff3cd',
            padding: '8px 12px',
            border: '1px solid #ffe69c',
            borderRadius: 8,
          }}
        >
          Validé sur données simulées — Pipeline et gouvernance validés de bout en bout sur données
          simulées réalistes (générateur documenté, seed 42, backtest M+3, IC bootstrap,
          calibration) ; déploiement réel conditionné à l’accès aux données DSI.
        </div>
      )}
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

/* ── Panneau d'explication du risque servi en ML (vue principale + heuristique) ── */
function RiskMLExplanationPanel({
  contributions,
  explanationMethod,
  probabilities,
  riskClass,
  heuristicReference,
  levelLabel,
  loading,
}: Readonly<{
  contributions?: RiskContribution[] | null;
  explanationMethod?: string | null;
  probabilities?: Record<string, number> | null;
  riskClass?: string | null;
  heuristicReference?: {
    description?: string;
    weights?: Record<string, number>;
    factors?: RiskFactor[];
  } | null;
  levelLabel: string;
  loading: boolean;
}>) {
  if (loading) {
    return (
      <div className="at-factors" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
        <Spin />
      </div>
    );
  }
  if (!contributions?.length) {
    return (
      <div className="at-factors" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
        <Empty description="Aucune contribution du modèle disponible" />
      </div>
    );
  }
  const maxImpact = Math.max(...contributions.map((c) => c.impact), 0.0001);
  const probaEntries = Object.entries(probabilities ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="at-factors">
      <div className="at-factors-head">
        <div className="at-icon">
          <ThunderboltOutlined />
        </div>
        Contributions du modèle ML — classe {riskClassLabel(riskClass)} ({levelLabel})
        {explanationMethod && (
          <span style={{ fontSize: 10, color: 'var(--at-ink3)', marginLeft: 8 }}>
            méthode : {explanationMethod} · validé sur données simulées
          </span>
        )}
      </div>
      {contributions.map((c) => (
        <div key={c.feature} className="at-factor-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="at-factor-name">{c.feature}</div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'var(--at-bg3, #eee)',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  width: `${Math.round((c.impact / maxImpact) * 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: 'var(--at-brand, #1677ff)',
                }}
              />
            </div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 12 }}>
            <div style={{ fontWeight: 600 }}>{Math.round(c.impact * 100)}%</div>
            <div style={{ fontSize: 10, color: 'var(--at-ink3)' }}>valeur : {c.value}</div>
          </div>
        </div>
      ))}
      {probaEntries.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--at-ink3)' }}>
          Probabilités calibrées :{' '}
          {probaEntries
            .map(([cls, p]) => `${riskClassLabel(cls)} ${Math.round(p * 100)}%`)
            .join(' · ')}
        </div>
      )}
      {heuristicReference && (
        <Collapse
          size="small"
          style={{ marginTop: 12 }}
          items={[
            {
              key: 'heuristic-ref',
              label: 'Décomposition heuristique de référence (0,50 / 0,12 / 0,40)',
              children: (
                <div>
                  {heuristicReference.description && (
                    <div style={{ fontSize: 11, color: 'var(--at-ink3)', marginBottom: 8 }}>
                      {heuristicReference.description}
                    </div>
                  )}
                  {(heuristicReference.factors ?? []).map((f) => (
                    <RiskFactorRow key={f.code ?? f.nom} facteur={f} />
                  ))}
                  {heuristicReference.weights && (
                    <div style={{ fontSize: 11, color: 'var(--at-ink3)', marginTop: 8 }}>
                      Poids :{' '}
                      {Object.entries(heuristicReference.weights)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(' · ')}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
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
