import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReloadOutlined, ThunderboltOutlined, TeamOutlined, WarningOutlined,
  SafetyCertificateOutlined, BellOutlined, ExperimentOutlined, RiseOutlined,
  FallOutlined, BulbOutlined, LineChartOutlined, RightCircleOutlined, RocketOutlined,
  EyeOutlined, NodeIndexOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import {
  useOverview, usePriorityActions, useGapHeatmap,
  useAlertsSummary, useModelPerformance, useDriftStatus,
  useTopFormations, useDecliningCompetencies, useRiskEvolution,
} from "@/hooks/analyse/useAnalysePredictive";
import { useUnifiedRiskDistribution, useUnifiedForecast } from "@/redesign/useUnified";
import { riskPct, toCoveragePercent } from "@/redesign/risk";
import { buildTrend } from "@/redesign/format";
import { NA_CALC } from "@/utils/states";
import { semantic } from "@/styles/themes/tokens";
import { Section, Card } from "@/redesign/components/Section";
import CompactKpi from "@/redesign/components/CompactKpi";
import RiskDistributionChart from "@/redesign/components/RiskDistributionChart";
import TopGapCompetencies from "@/redesign/components/charts/TopGapCompetencies";
import ForecastChart from "@/redesign/components/charts/ForecastChart";
import Heatmap from "@/redesign/components/charts/Heatmap";
import DecliningCompetencies from "@/redesign/components/charts/DecliningCompetencies";
import RiskEvolutionChart from "@/redesign/components/charts/RiskEvolutionChart";
import { KpiSkeleton, ErrorState } from "@/redesign/components/States";
import AtRiskTeachersTable from "@/redesign/components/AtRiskTeachersTable";
import AlertsPanel from "@/redesign/components/AlertsPanel";
import PilotageSummary from "@/redesign/components/PilotageSummary";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useQueryClient } from "@tanstack/react-query";
import "@/redesign/redesign.css";

const RISK_THRESHOLDS_LABEL = "Faible < 40 % · Modéré 40–59 % · Élevé 60–79 % · Critique ≥ 80 %";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = useAppNotification();
  const qc = useQueryClient();
  const roleKey = normalizeRole(user?.role);
  const isAdmin = roleKey === "admin";

  const [refreshing, setRefreshing] = useState(false);
  const [horizon, setHorizon] = useState(6);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const { data: overview, isLoading: ovLoading, isError: ovError, refetch: refetchOverview } = useOverview();
  const { data: priorityTeachers = [], isLoading: prioLoading } = usePriorityActions(15);
  const { data: heatmap = [], isLoading: heatLoading } = useGapHeatmap();
  const { view: forecast, loading: forecastLoading } = useUnifiedForecast("demand", horizon);
  const { data: alerts, isLoading: alertsLoading } = useAlertsSummary();
  const { data: modelPerf, isLoading: mpLoading } = useModelPerformance();
  const { data: drift } = useDriftStatus();
  const { data: topFormations = [], isLoading: topFormLoading } = useTopFormations();
  const { data: declining = [], isLoading: declLoading } = useDecliningCompetencies();
  const { data: riskEvo = [], isLoading: evoLoading } = useRiskEvolution();
  const unifiedDist = useUnifiedRiskDistribution();

  const avgRisk = overview ? riskPct(overview.score_risque_moyen) : null;
  const coveragePct = overview ? toCoveragePercent(overview.taux_couverture_global) : null;
  const precision = overview?.precision_modele ?? modelPerf?.gap_model_accuracy ?? null;
  const precisionPct = precision != null ? Math.round(precision * 100) : null;

  const atRiskCount = unifiedDist.distribution
    ? unifiedDist.distribution.byLevel.ELEVE + unifiedDist.distribution.byLevel.CRITIQUE
    : null;

  const filteredHeatmap = useMemo(
    () => (deptFilter ? heatmap.filter((c) => c.departement === deptFilter) : heatmap),
    [heatmap, deptFilter],
  );
  const evoPoints = useMemo(
    () => (horizon > 0 ? riskEvo.slice(-Math.max(3, horizon)) : riskEvo),
    [riskEvo, horizon],
  );
  const deptOptions = useMemo(
    () => Array.from(new Set(heatmap.map((c) => c.departement))).sort((a, b) => a.localeCompare(b)),
    [heatmap],
  );
  const joursDepuisEntrainement = modelPerf?.last_retrained
    ? Math.max(0, Math.round((Date.now() - new Date(modelPerf.last_retrained).getTime()) / 86400000))
    : null;
  const stable = drift?.drift_detected === false;

  const primaryKpis = [
    <CompactKpi key="followed" label="Enseignants analysés" value={overview?.nb_enseignants_suivis ?? null} unit="int"
      icon={<TeamOutlined />} accent="#b51200" accentBg="rgba(181,18,0,0.10)"
      loading={ovLoading} />,
    <CompactKpi key="atrisk" label="À risque élevé" value={atRiskCount} unit="int"
      icon={<WarningOutlined />} accent={semantic.error} accentBg={semantic.errorBg}
      helper="Enseignants à score ≥ 60 %" loading={unifiedDist.loading} />,
    <CompactKpi key="alerts" label="Alertes critiques" value={alerts?.critiques_ouvertes ?? null} unit="int"
      icon={<BellOutlined />} accent={semantic.warning} accentBg={semantic.warningBg}
      helper={`${alerts?.total ?? 0} ouvertes au total`} loading={alertsLoading} />,
    <CompactKpi key="coverage" label="Couverture compétences" value={overview?.taux_couverture_global ?? null} unit="coverage"
      icon={<SafetyCertificateOutlined />} accent={semantic.success} accentBg={semantic.successBg}
      helper="Part au niveau requis" loading={ovLoading} />,
    <CompactKpi key="avgrisk" label="Risque moyen" value={avgRisk} unit="custom" customText={avgRisk == null ? NA_CALC : `${avgRisk} %`}
      icon={<FallOutlined />} accent={semantic.error} accentBg={semantic.errorBg}
      helper={RISK_THRESHOLDS_LABEL}
      trend={buildTrend({ current: overview?.score_risque_moyen, previous: overview?.score_risque_moyen_precedent, higherIsBetter: false, unit: "pts" })}
      loading={ovLoading} />,
  ];

  const secondaryKpis = [
    <CompactKpi key="ecarts" label="Écarts détectés" value={heatmap.length || null} unit="int"
      icon={<ExperimentOutlined />} accent="#f97316" accentBg="rgba(249,115,22,0.10)"
      helper="Compétence × département en écart" loading={heatLoading} />,
    <CompactKpi key="formations" label="Formations à planifier" value={topFormations.length || null} unit="int"
      icon={<BulbOutlined />} accent="#0891b2" accentBg="rgba(8,145,178,0.10)"
      helper="Recommandées par le moteur" loading={topFormLoading} />,
    <CompactKpi key="precision" label="Précision modèle" value={precisionPct} unit="custom" customText={precisionPct == null ? NA_CALC : `${precisionPct} %`}
      icon={<LineChartOutlined />} accent={semantic.info} accentBg={semantic.infoBg}
      helper="Exactitude du predicteur de gaps" loading={mpLoading} />,
    <CompactKpi key="entrainement" label="Dernier entraînement" value={joursDepuisEntrainement} unit="custom" customText={joursDepuisEntrainement != null ? `Il y a ${joursDepuisEntrainement} j` : NA_CALC}
      icon={<ExperimentOutlined />} accent={stable ? semantic.success : semantic.warning} accentBg={stable ? semantic.successBg : semantic.warningBg}
      helper={stable ? "Modèle stable, pas de dérive" : "Dérive détectée — réentraînement conseillé"}
      loading={mpLoading} />,
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: ["analyse"] });
      message.success("Données actualisées.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="rd" data-theme="light">
      {/* ── 1. BANDEAU HAUT ──────────────────────────────────────────── */}
      <section className="rd-hero">
        <div className="rd-hero-avatar"><ThunderboltOutlined /></div>
        <div className="rd-hero-body">
          <div className="rd-hero-eyebrow">
            Analyse Prédictive · D2F
            <span className="rd-hero-role">Pilotage</span>
          </div>
          <h1 className="rd-hero-title">Tableau de bord Analyse Prédictive</h1>
          <p className="rd-hero-sub">
            Visualisez les écarts de compétences, identifiez les enseignants à risque et priorisez
            les formations selon les signaux du moteur prédictif.
          </p>
        </div>
        <div className="rd-hero-actions">
          <button className="rd-btn" onClick={handleRefresh} disabled={refreshing}>
            <ReloadOutlined spin={refreshing} /> Rafraîchir
          </button>
          {isAdmin && (
            <button className="rd-btn rd-btn-primary" onClick={() => navigate("/home/analytics/model")} disabled={!isAdmin}>
              <ExperimentOutlined /> Gérer le modèle
            </button>
          )}
        </div>
      </section>

      {/* ── 2. FILTRES ────────────────────────────────────────────────── */}
      <div className="rd-filters">
        <div className="rd-filter-group">
          <span className="rd-filter-label">Département</span>
          <select className="rd-select" value={deptFilter ?? ""} onChange={(e) => setDeptFilter(e.target.value || null)}>
            <option value="">Tous</option>
            {deptOptions.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
        <div className="rd-filter-group">
          <span className="rd-filter-label">Période</span>
          <div className="rd-seg">
            {[3, 6, 12].map((h) => (
              <button key={h} className={`rd-seg-btn ${horizon === h ? "active" : ""}`} onClick={() => setHorizon(h)}>{h} mois</button>
            ))}
          </div>
        </div>
        {deptFilter && (
          <button className="rd-btn rd-btn-ghost" onClick={() => setDeptFilter(null)}>Réinitialiser le département</button>
        )}
      </div>

      {/* ── 3. INDICATEURS CLÉS ──────────────────────────────────────── */}
      <Section title="Indicateurs clés" subtitle="Les chiffres qui pilotent vos décisions">
        {ovError ? (
          <ErrorState message="Impossible de charger les indicateurs." onRetry={() => { refetchOverview(); }} />
        ) : (
          <div className="rd-kpi-grid">
            {ovLoading && !overview ? <KpiSkeleton count={6} /> : primaryKpis}
          </div>
        )}
        <div className="rd-kpi-grid rd-kpi-grid--secondary">
          {ovLoading && !overview ? <KpiSkeleton count={4} /> : secondaryKpis}
        </div>
      </Section>

      {!ovError && (
        <>
          {/* ── 4. RISQUE ─────────────────────────────────────────────── */}
          <Section title="Cartographie du risque" subtitle="Répartition des niveaux de risque et localisation des fragilités">
            <div className="rd-grid-2">
              <Card title="Répartition du risque" subtitle={`${unifiedDist.distribution?.total ?? 0} enseignants évalués`} icon={<WarningOutlined />} iconColor={semantic.warning} iconBg={semantic.warningBg}>
                <RiskDistributionChart distribution={unifiedDist.distribution} loading={unifiedDist.loading} />
              </Card>
              <Card title="Heatmap des compétences" subtitle="Écart moyen par compétence × département — cliquez pour filtrer" icon={<LineChartOutlined />} iconColor="#b51200" iconBg="rgba(181,18,0,0.10)"
                extra={deptFilter ? <span className="rd-chip" style={{ color: semantic.info }}>{deptFilter}</span> : null}>
                <Heatmap cells={filteredHeatmap} loading={heatLoading} highlightDept={deptFilter}
                  onSelectDept={(d) => setDeptFilter((cur) => (cur === d ? null : d))} />
              </Card>
            </div>
          </Section>

          {/* ── 5. ANTICIPATION ──────────────────────────────────────── */}
          <Section title="Anticipation des besoins" subtitle="Compétences en déficit, en déclin et projection des besoins">
            <div className="rd-grid-2">
              <Card title="Compétences les plus déficitaires" subtitle="Classement par écart moyen" icon={<ExperimentOutlined />} iconColor="#f97316" iconBg="rgba(249,115,22,0.10)">
                <TopGapCompetencies cells={filteredHeatmap.map((c) => ({
                  department: c.departement, competenceId: c.competence_id, competenceName: c.competence_nom,
                  avgGap: c.avg_gap, teachersCount: c.enseignants_count,
                }))} loading={heatLoading} />
              </Card>
              <Card title="Compétences en déclin" subtitle="Niveau en baisse, besoin de renforcement" icon={<FallOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
                <DecliningCompetencies items={declining} loading={declLoading} />
              </Card>
            </div>
            <Card title="Prévision de la demande" subtitle={`Projection sur ${horizon} mois`} icon={<LineChartOutlined />} iconColor={semantic.info} iconBg={semantic.infoBg}>
              <ForecastChart view={forecast} loading={forecastLoading} />
              {forecast?.note && (<div className="rd-forecast-note">{forecast.note}</div>)}
            </Card>
          </Section>

          {/* ── 6. ENSEIGNANTS À RISQUE ──────────────────────────────── */}
          <Section title="Enseignants à risque" subtitle="File priorisée avec action recommandée">
            <AtRiskTeachersTable teachers={priorityTeachers} loading={prioLoading} />
          </Section>

          {/* ── 7. ALERTES ───────────────────────────────────────────── */}
          <Section title="Alertes récentes" subtitle="Signaux critiques à traiter en priorité"
            extra={<button className="rd-btn rd-btn-ghost" onClick={() => navigate("/home/analytics/alerts")}>Toutes les alertes →</button>}>
            <AlertsPanel alerts={alerts ?? null} loading={alertsLoading} />
          </Section>

          {/* ── 8. TENDANCE ──────────────────────────────────────────── */}
          <Section title="Tendance du risque collectif" subtitle={`Enseignants critiques & élevés sur ${evoPoints.length} mois`}>
            <Card title="Évolution mensuelle du risque" icon={<RiseOutlined />} iconColor={semantic.warning} iconBg={semantic.warningBg}>
              <RiskEvolutionChart points={evoPoints} loading={evoLoading} />
            </Card>
          </Section>

          {/* ── 9. PILOTAGE ──────────────────────────────────────────── */}
          <PilotageSummary horizon={horizon} />
        </>
      )}
    </div>
  );
}
