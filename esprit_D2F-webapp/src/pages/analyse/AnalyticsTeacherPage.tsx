import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Row, Col, Input, Spin, Empty, Tag } from "antd";
import {
  ReloadOutlined, ExperimentOutlined,
  RiseOutlined, FallOutlined, AimOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import {
  useAnalyzeTeacher,
  useTeacherGaps,
  useTeacherRecommendations,
  useTeacherRisk,
  useTeacherScopeAnalysis,
  useRiskHistory,
} from "@/hooks/analytics/useAnalyticsQueries";
import {
  GapsTable,
  RecommendationsList,
  RiskHistoryChart,
} from "@/components/analytics";
import ModelBadge from "@/components/analytics/ModelBadge";
import TeacherScopePanel from "@/components/analytics/TeacherScopePanel";
import { riskColor, riskLabel } from "@/utils/analytics/format";
import type { RiskFactor } from "@/models/analyse/analyticsFeature";
import { Tabs as AntTabs } from "antd";
import "./analyticsTeacher.redesign.css";

export default function AnalyticsTeacherPage() {
  const { enseignantId = "" } = useParams<{ enseignantId: string }>();
  const [urgence, setUrgence] = useState<string | undefined>();
  const [competenceId, setCompetenceId] = useState<number | null>(null);

  const analyze = useAnalyzeTeacher(enseignantId);
  const risk = useTeacherRisk(enseignantId);
  const gaps = useTeacherGaps(enseignantId, urgence);
  const recos = useTeacherRecommendations(enseignantId, competenceId ?? undefined);
  const history = useRiskHistory(enseignantId);
  const scope = useTeacherScopeAnalysis(enseignantId);

  const loading = analyze.isPending || risk.isLoading || gaps.isLoading || recos.isLoading;

  const gapStats = useMemo(() => {
    const list = gaps.data?.gaps ?? [];
    const unique = new Map<number, (typeof list)[0]>();
    for (const g of list) {
      const existing = unique.get(g.competence_id);
      if (!existing || g.gap_score > existing.gap_score) unique.set(g.competence_id, g);
    }
    const deduped = Array.from(unique.values());
    const critiques = deduped.filter((g) => g.niveau_urgence === "CRITIQUE").length;
    const hautes = deduped.filter((g) => g.niveau_urgence === "HAUTE").length;
    const stagnants = deduped.filter((g) => g.mois_stagnation > 0).length;
    const regressions = deduped.filter((g) => g.en_regression).length;
    return { total: deduped.length, critiques, hautes, stagnants, regressions };
  }, [gaps.data]);

  const score = risk.data?.score ?? 0;
  const level = risk.data?.niveau ?? "FAIBLE";
  const color = riskColor(level);
  const pct = Math.round(score * 100);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - score);

  const trend = risk.data?.tendance ?? "STABLE";
  const trendClass = trend === "AMELIORATION" ? "at-trend-up" : trend === "DEGRADATION" ? "at-trend-down" : "at-trend-flat";
  const trendIcon = trend === "AMELIORATION" ? <RiseOutlined /> : trend === "DEGRADATION" ? <FallOutlined /> : "—";

  return (
    <div className="at-root">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="at-hero at-animate">
        <div className="at-hero-glow" />
        <div className="at-hero-row">
          <div className="at-hero-avatar">
            {risk.data?.enseignant_nom
              ? risk.data.enseignant_nom.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
              : enseignantId.slice(-2)}
          </div>
          <div className="at-hero-info">
            <div className="at-hero-kicker">
              <AimOutlined /> Analyse prédictive — Enseignant
            </div>
            <h1 className="at-hero-title">{risk.data?.enseignant_nom || scope.data?.context?.nom_complet || enseignantId}</h1>
            <p className="at-hero-sub">
              Score de risque <b>{pct}%</b> · {riskLabel(level)}
              <span style={{ marginLeft: 12, verticalAlign: "middle" }}>
                <ModelBadge modelMode={risk.data?.model_mode} modelVersion={risk.data?.model_version} size="small" />
              </span>
            </p>
          </div>
          <div className="at-hero-actions">
            <Input
              value={risk.data?.enseignant_nom ? `${risk.data.enseignant_nom} (${enseignantId})` : enseignantId}
              disabled
              placeholder="Enseignant"
              style={{
                width: 220, background: "var(--at-panel2)", borderColor: "var(--at-line)",
                color: "var(--at-ink)", borderRadius: 12,
              }}
            />
            <button
              type="button"
              className="at-btn at-btn-primary"
              disabled={analyze.isPending}
              onClick={() => analyze.mutate()}
            >
              <ExperimentOutlined />
              {analyze.isPending ? "Analyse..." : "Lancer l'analyse"}
            </button>
            <button type="button" className="at-btn" onClick={() => risk.refetch()}>
              <ReloadOutlined /> Rafraîchir
            </button>
          </div>
        </div>
      </div>

      {/* ── Score + Factors ───────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <div
            className="at-score-card at-animate at-animate-d1"
            style={{ "--score-color": color } as React.CSSProperties}
          >
            {risk.isLoading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
            ) : (
              <>
                <div className="at-score-gauge">
                  <svg className="at-score-ring" viewBox="0 0 160 160">
                    <circle className="at-score-ring-bg" cx="80" cy="80" r="70" />
                    <circle
                      className="at-score-ring-fill"
                      cx="80" cy="80" r="70"
                      style={{ strokeDasharray: circumference, strokeDashoffset: offset, stroke: color }}
                    />
                  </svg>
                  <div className="at-score-label">
                    <div className="at-score-pct">
                      {pct}<span className="at-score-pct-sign">%</span>
                    </div>
                  </div>
                </div>
                <div className="at-score-tag" style={{ color, borderColor: color }}>
                  {riskLabel(level)}
                </div>
                <div className="at-score-meta">
                  {risk.data?.precedent_score != null && (
                    <div className="at-score-meta-row">
                      Précédent : <b>{Math.round(risk.data.precedent_score * 100)}%</b>
                    </div>
                  )}
                  <div className="at-score-meta-row">
                    Tendance :{" "}
                    <span className={`at-trend-badge ${trendClass}`}>
                      {trendIcon} {trend}
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
          />
        </Col>
      </Row>

      {/* ── Stats pills ────────────────────────────────────── */}
      {!gaps.isLoading && gapStats.total > 0 && (
        <div className="at-stats at-animate at-animate-d2">
          <div className="at-stat" style={{ "--accent": "var(--at-brand)" } as React.CSSProperties}>
            <div className="at-stat-value" style={{ color: "var(--at-brand)" }}>{gapStats.total}</div>
            <div className="at-stat-label">Gaps détectés</div>
          </div>
          <div className="at-stat" style={{ "--accent": gapStats.critiques > 0 ? "var(--at-danger)" : "var(--at-success)" } as React.CSSProperties}>
            <div className="at-stat-value" style={{ color: gapStats.critiques > 0 ? "var(--at-danger)" : "var(--at-success)" }}>
              {gapStats.critiques}
            </div>
            <div className="at-stat-label">Critiques</div>
          </div>
          <div className="at-stat" style={{ "--accent": "var(--at-warning)" } as React.CSSProperties}>
            <div className="at-stat-value" style={{ color: "var(--at-warning)" }}>{gapStats.stagnants}</div>
            <div className="at-stat-label">Stagnants</div>
          </div>
          <div className="at-stat" style={{ "--accent": gapStats.regressions > 0 ? "var(--at-danger)" : "var(--at-success)" } as React.CSSProperties}>
            <div className="at-stat-value" style={{ color: gapStats.regressions > 0 ? "var(--at-danger)" : "var(--at-success)" }}>
              {gapStats.regressions}
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
              key: "scope",
              label: `Analyse contextuelle${scope.data ? ` (${scope.data.gaps.length})` : ""}`,
              children: <TeacherScopePanel data={scope.data} loading={scope.isLoading} />,
            },
            {
              key: "gaps",
              label: `Gaps de compétences${gapStats.total > 0 ? ` (${gapStats.total})` : ""}`,
              children: (
                <div>
                  <div className="at-urgence-pills">
                    {(["FAIBLE", "MODEREE", "HAUTE", "CRITIQUE"] as const).map((u) => (
                      <span
                        key={u}
                        className={`at-pill ${urgence === u ? "is-active" : ""}`}
                        onClick={() => setUrgence(urgence === u ? undefined : u)}
                      >
                        {u}
                      </span>
                    ))}
                  </div>
                  <GapsTab gaps={gaps} onSelectCompetence={(g) => setCompetenceId(g.competence_id)} />
                </div>
              ),
            },
            {
              key: "recos",
              label: `Recommandations${recos.data?.total ? ` (${recos.data.total})` : ""}`,
              children: (
                <RecommendationsList recommendations={recos.data?.recommendations ?? []} loading={recos.isLoading} />
              ),
            },
            {
              key: "models",
              label: "Modèles",
              children: <ModelsInfoPanel risk={risk} />,
            },
            {
              key: "history",
              label: "Historique du risque",
              children: <RiskHistoryChart points={history.data?.points ?? []} loading={history.isLoading} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

/* ── Factors panel ──────────────────────────────────────────── */
function FactorsPanel({ facteurs, loading }: { facteurs: RiskFactor[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="at-factors" style={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <Spin />
      </div>
    );
  }
  if (!facteurs?.length) {
    return (
      <div className="at-factors" style={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <Empty description="Aucun facteur disponible" />
      </div>
    );
  }
  return (
    <div className="at-factors">
      <div className="at-factors-head">
        <div className="at-icon"><InfoCircleOutlined /></div>
        Explication du score (facteurs pondérés)
      </div>
      {facteurs.map((f) => {
        const contribPct = Math.round(Math.abs(f.contribution) * 100);
        const isRisk = f.contribution >= 0;
        // Facteurs ML : HIGH_proba / MEDIUM_proba / LOW_proba / CRITICAL_proba -> produit du classifier
        const isProbaFactor = /^(HIGH|MEDIUM|LOW|CRITICAL)_proba$/i.test(f.nom);
        const displayName = isProbaFactor
          ? `Probabilité ${f.nom.replace("_proba", "").toLowerCase()}`
          : f.nom;
        const displayValue = isProbaFactor
          ? `${(f.valeur_brute * 100).toFixed(0)}% (prob.)`
          : `valeur ${f.valeur_brute % 1 === 0 ? f.valeur_brute : f.valeur_brute.toFixed(2)}`;
        return (
          <div key={f.nom} className="at-factor-row">
            <div>
              <div className="at-factor-name">
                {displayName}
                {isProbaFactor && (
                  <span style={{ fontSize: 10, color: "var(--at-ink3)", marginLeft: 6 }} title="Probabilite calculee par le classifier RandomForest entraine">
                    ML
                  </span>
                )}
              </div>
              <div className="at-factor-bar-wrap">
                <div className="at-factor-bar">
                  <div
                    className={`at-factor-bar-fill ${isRisk ? "is-risk" : "is-safe"}`}
                    style={{ width: `${contribPct}%` }}
                  />
                </div>
                <span className="at-factor-weight" title="Valeur brute du facteur (proba pour les facteurs ML, sinon valeur brute metriquee)">
                  {displayValue}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={`at-factor-contrib ${isRisk ? "is-risk" : "is-safe"}`}>
                {contribPct}%
              </div>
              <div style={{ fontSize: 10, color: "var(--at-ink3)" }}>
                contribution {f.contribution.toFixed(3)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Panneau Modeles ─────────────────────────────────────────────── */
function ModelsInfoPanel({ risk }: { risk: ReturnType<typeof useTeacherRisk> }) {
  if (risk.isLoading) {
    return <div style={{ padding: 30, textAlign: "center" }}><Spin /></div>;
  }
  const mode = risk.data?.model_mode ?? "HEURISTIC_FALLBACK";
  const version = risk.data?.model_version ?? null;
  return (
    <div style={{ padding: "6px 2px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--at-ink2)" }}>
          Statut du modèle :
        </span>
        <ModelBadge modelMode={mode} modelVersion={version} />
      </div>
      {mode === "ML" && version && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--at-ink3)" }}>
          Modèle entraîné le <b>{new Date(version).toLocaleString("fr-FR")}</b> — GradientBoosting
          temporel sur corpus réel + synthétique. Les gaps proviennent du vrai artefact
          (pas de fallback heuristique).
        </div>
      )}
      {mode !== "ML" && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--at-warning)" }}>
          Pas d'artefact ML disponible. Calcul en mode règles (heuristique).
        </div>
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
  if (gaps.isLoading) return <div style={{ padding: 30, textAlign: "center" }}><Spin /></div>;
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
