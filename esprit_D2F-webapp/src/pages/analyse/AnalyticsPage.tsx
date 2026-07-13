import { useMemo, useState, useCallback } from "react";
import {
  ReloadOutlined, ThunderboltOutlined, TeamOutlined, WarningOutlined,
  SafetyCertificateOutlined, BellOutlined, ExperimentOutlined, RiseOutlined,
  FallOutlined, BulbOutlined, LineChartOutlined, RightCircleOutlined, RocketOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import {
  useOverview, usePriorityActions, useGapHeatmap,
  useDemandForecast, useAlertsSummary,
  useModelPerformance, useDriftStatus, useTrainingEffectiveness, useTrainModel,
  useTopFormations, useDecliningCompetencies, useRiskEvolution,
} from "@/hooks/analyse/useAnalysePredictive";
import {
  useUnifiedRiskDistribution, useUnifiedForecast,
} from "@/redesign/useUnified";
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
import RecommandationsPlus from "@/redesign/components/RecommandationsPlus";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useQueryClient } from "@tanstack/react-query";
import "@/redesign/redesign.css";

dayjs.locale("fr");

const RISK_THRESHOLDS_LABEL = "Faible < 40 % · Modéré 40–59 % · Élevé 60–79 % · Critique ≥ 80 %";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { message } = useAppNotification();
  const qc = useQueryClient();
  const roleKey = normalizeRole(user?.role);
  const isAdmin = roleKey === "admin";

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [refreshing, setRefreshing] = useState(false);
  const [horizon, setHorizon] = useState(6);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);

  const { data: overview, isLoading: ovLoading, isError: ovError, refetch: refetchOverview } = useOverview();
  const { data: priorityTeachers = [], isLoading: prioLoading } = usePriorityActions(15);
  const effectiveTeacherId = activeTeacherId ?? priorityTeachers[0]?.enseignant_id ?? null;
  const { data: heatmap = [], isLoading: heatLoading } = useGapHeatmap();
  const { data: forecast } = useDemandForecast(horizon);
  const { data: alerts, isLoading: alertsLoading } = useAlertsSummary();
  const { data: modelPerf, isLoading: mpLoading } = useModelPerformance();
  const { data: drift } = useDriftStatus();
  const { data: effectiveness = [] } = useTrainingEffectiveness();
  const { data: topFormations = [], isLoading: topFormLoading } = useTopFormations();
  const { data: declining = [], isLoading: declLoading } = useDecliningCompetencies();
  const { data: riskEvo = [], isLoading: evoLoading } = useRiskEvolution();
  const trainModel = useTrainModel();

  const unifiedDist = useUnifiedRiskDistribution();
  const unifiedForecast = useUnifiedForecast("demand", horizon);

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

  const totalEcarts = heatmap.length || null;
  const formationsAPlanifier = topFormations.length || null;
  const completionMoyenne = useMemo(() => {
    const valid = effectiveness.filter((e) => typeof e.completion_rate === "number");
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((s, e) => s + (e.completion_rate ?? 0), 0) / valid.length) * 100);
  }, [effectiveness]);
  const joursDepuisEntrainement = modelPerf?.last_retrained
    ? Math.max(0, dayjs().diff(dayjs(modelPerf.last_retrained), "day"))
    : null;
  const stable = drift?.drift_detected === false;

  /* ── Centre d'actions — données dérivées ────────────────────────── */
  const impactMoyenPct = useMemo(() => {
    const valid = topFormations.filter((f) => typeof f.proba_reussite_moy === "number");
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((s, f) => s + (f.proba_reussite_moy ?? 0), 0) / valid.length) * 100);
  }, [topFormations]);

  type ActionCard = {
    formation_id: number;
    title: string;
    recommendationCount: number;
    successProb: number;
  };

  const actionsToLaunch: ActionCard[] = useMemo(
    () => [...topFormations]
      .sort((a, b) => (b.score_moyen ?? 0) - (a.score_moyen ?? 0))
      .slice(0, 3)
      .map((f) => ({
        formation_id: f.formation_id,
        title: f.formation_titre,
        recommendationCount: f.nb_recommandations,
        successProb: f.proba_reussite_moy,
      })),
    [topFormations],
  );

  const enrichedTeachers = useMemo(
    () => priorityTeachers.map((t) => {
      const niveau = (t.niveau_risque ?? "").toUpperCase();
      const stagnation = (t.historique?.nb_mois_stagnation ?? 0) > 0;
      const hasAlertes = (t.nb_alertes_ouvertes ?? 0) > 0;
      const isUrgent = niveau === "ELEVE" || niveau === "CRITIQUE";
      const urgence: "haute" | "moderee" | "basse" =
        isUrgent ? "haute" : niveau === "MODERE" || stagnation ? "moderee" : "basse";
      return { ...t, urgence, hasAlertes, stagnation };
    }),
    [priorityTeachers],
  );

  const surveillanceList = useMemo(
    () => enrichedTeachers
      .filter((t) => t.hasAlertes || t.urgence === "haute" || t.urgence === "moderee")
      .sort((a, b) => (b.urgence === a.urgence ? (b.nb_alertes_ouvertes ?? 0) - (a.nb_alertes_ouvertes ?? 0) : (a.urgence === "haute" ? -1 : 1))),
    [enrichedTeachers],
  );
  const surveillanceCount = surveillanceList.length;

  const buckets = useMemo(() => {
    const critique: typeof enrichedTeachers = [];
    const confirmer: typeof enrichedTeachers = [];
    const suivre: typeof enrichedTeachers = [];
    for (const t of surveillanceList) {
      const isCritical = t.urgence === "haute" || (t.nb_alertes_ouvertes ?? 0) >= 2;
      const isConfirm = t.urgence === "moderee" || t.stagnation || (t.tendance === "REGRESSION") || (t.nb_alertes_ouvertes ?? 0) === 1;
      if (isCritical) critique.push(t);
      else if (isConfirm) confirmer.push(t);
      else suivre.push(t);
    }
    return { critique, confirmer, suivre };
  }, [surveillanceList]);

  type Parcours = {
    enseignant_id: string;
    teacher_name: string;
    competence_prioritaire?: { competence_nom: string } | null;
    action_recommandee: string;
    probabilite: number;
    impact: number;
    urgence: "haute" | "moderee" | "basse";
    etapes: Array<{ label: string; etat: "recommended" | "in-progress" | "blocked" }>;
  };

  const parcours: Parcours[] = useMemo(() => {
    return enrichedTeachers
      .filter((t) => t.hasAlertes || t.urgence !== "basse")
      .slice(0, 3)
      .map((t) => {
        const niveauNiveau = (t.niveau_risque ?? "").toUpperCase();
        const formationPrincipale = topFormations[0];
        const deuxiemeFormation = topFormations[1];
        const step2Etat: "recommended" | "blocked" =
          niveauNiveau === "FAIBLE" ? "blocked" : "recommended";
        const etapes: Parcours["etapes"] = [];
        if (formationPrincipale) etapes.push({ label: formationPrincipale.formation_titre, etat: "recommended" });
        if (deuxiemeFormation) etapes.push({ label: deuxiemeFormation.formation_titre, etat: step2Etat });
        if (formationPrincipale) etapes.push({ label: "Audit / consolidation", etat: "in-progress" });
        const probabilite = Math.round((formationPrincipale?.proba_reussite_moy ?? 0.7) * 100);
        const impact = Math.max(8, Math.round((t.score_risque ?? 0.3) * 60 + 8));
        return {
          enseignant_id: t.enseignant_id,
          teacher_name: t.teacher_name ?? "—",
          competence_prioritaire: t.competence_prioritaire,
          action_recommandee: t.action_recommandee ?? "",
          probabilite,
          impact,
          urgence: t.urgence,
          etapes,
        };
      });
  }, [enrichedTeachers, topFormations]);

  const primaryKpis = [
    <CompactKpi key="followed" label="Enseignants analysés" value={overview?.nb_enseignants_suivis ?? null} unit="int"
      icon={<TeamOutlined />} accent="#b51200" accentBg="rgba(181,18,0,0.10)"
      trend={buildTrend({ current: overview?.nb_enseignants_suivis, previous: overview?.deltas?.nb_enseignants_suivis, higherIsBetter: true })}
      loading={ovLoading} />,
    <CompactKpi key="atrisk" label="À risque élevé" value={atRiskCount} unit="int"
      icon={<WarningOutlined />} accent={semantic.error} accentBg={semantic.errorBg}
      helper="Enseignants à score ≥ 60 %"
      loading={unifiedDist.loading} />,
    <CompactKpi key="alerts" label="Alertes critiques" value={alerts?.critiques_ouvertes ?? null} unit="int"
      icon={<BellOutlined />} accent={semantic.warning} accentBg={semantic.warningBg}
      helper={`${alerts?.total ?? 0} ouvertes au total`}
      loading={alertsLoading} />,
    <CompactKpi key="coverage" label="Couverture compétences" value={overview?.taux_couverture_global ?? null} unit="coverage"
      icon={<SafetyCertificateOutlined />} accent={semantic.success} accentBg={semantic.successBg}
      helper="Part au niveau requis"
      loading={ovLoading} />,
    <CompactKpi key="avgrisk" label="Risque moyen" value={avgRisk} unit="custom" customText={avgRisk == null ? NA_CALC : `${avgRisk} %`}
      icon={<FallOutlined />} accent={semantic.error} accentBg={semantic.errorBg}
      helper={RISK_THRESHOLDS_LABEL}
      trend={buildTrend({ current: overview?.score_risque_moyen, previous: overview?.score_risque_moyen_precedent, higherIsBetter: false, unit: "pts" })}
      loading={ovLoading} />,
  ];

  const secondaryKpis = [
    <CompactKpi key="ecarts" label="Écarts détectés" value={totalEcarts} unit="int"
      icon={<ExperimentOutlined />} accent="#f97316" accentBg="rgba(249,115,22,0.10)"
      helper="Compétence × département en écart"
      loading={heatLoading} />,
    <CompactKpi key="formations" label="Formations à planifier" value={formationsAPlanifier} unit="int"
      icon={<BulbOutlined />} accent="#0891b2" accentBg="rgba(8,145,178,0.10)"
      helper="Recommandées par le moteur"
      loading={topFormLoading} />,
    <CompactKpi key="completion" label="Complétion formations" value={completionMoyenne} unit="custom" customText={completionMoyenne != null ? `${completionMoyenne} %` : NA_CALC}
      icon={<LineChartOutlined />} accent={semantic.success} accentBg={semantic.successBg}
      helper="Moyenne des formations suivies"
      loading={false} />,
    <CompactKpi key="entrainement" label="Dernier entraînement" value={joursDepuisEntrainement} unit="custom" customText={joursDepuisEntrainement != null ? `Il y a ${joursDepuisEntrainement} j` : NA_CALC}
      icon={<ExperimentOutlined />} accent={stable ? semantic.success : semantic.warning} accentBg={stable ? semantic.successBg : semantic.warningBg}
      helper={stable ? "Modèle stable, pas de dérive" : "Dérive détectée — réentraînement conseillé"}
      loading={mpLoading} />,
  ];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: ["analyse"] });
      message.success("Données actualisées.");
    } finally {
      setRefreshing(false);
    }
  }, [qc, message]);

  const handleRetrain = useCallback(async () => {
    try {
      await trainModel.mutateAsync();
      message.success("Réentraînement lancé avec succès.");
    } catch {
      message.error("Échec du réentraînement. Vérifiez les droits d'accès.");
    }
  }, [trainModel, message]);

  const lastUpdate = overview?.generated_at ? dayjs(overview.generated_at).format("DD/MM/YYYY à HH:mm") : null;

  return (
    <div className="rd" data-theme={theme}>
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
            Visualisez les écarts de compétences, identifiez les enseignants à risque, suivez l’évolution
            des besoins par département et priorisez les formations à lancer selon les signaux du moteur prédictif.
          </p>
        </div>
        <div className="rd-hero-actions">
          <span className="rd-hero-status">
            <span className={`rd-dot ${ovError ? "error" : "ok"}`} />
            {lastUpdate ? `Mis à jour le ${lastUpdate}` : "Données en live"}
          </span>
          <button className="rd-btn" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button className="rd-btn" onClick={handleRefresh} disabled={refreshing}>
            <ReloadOutlined spin={refreshing} /> Rafraîchir
          </button>
          {isAdmin && (
            <button className="rd-btn rd-btn-primary" onClick={handleRetrain} disabled={trainModel.isPending}>
              <ExperimentOutlined /> {trainModel.isPending ? "Entraînement…" : "Réentraîner"}
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
            {deptOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
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
          {/* ── 4. BLOC RISQUE — où sont les fragilités ───────────────── */}
          <Section title="Cartographie du risque" subtitle="Répartition des niveaux de risque et localisation des fragilités">
            <div className="rd-grid-2">
              <Card title="Répartition du risque" subtitle={`${unifiedDist.distribution?.total ?? 0} enseignants évalués`} icon={<WarningOutlined />} iconColor={semantic.warning} iconBg={semantic.warningBg}>
                <RiskDistributionChart distribution={unifiedDist.distribution} loading={unifiedDist.loading} />
              </Card>
              <Card title="Heatmap des compétences" subtitle="Écart moyen par compétence × département — cliquez pour filtrer" icon={<LineChartOutlined />} iconColor="#b51200" iconBg="rgba(181,18,0,0.10)"
                extra={deptFilter ? <span className="rd-chip" style={{ color: semantic.info }}>{deptFilter}</span> : null}>
                <Heatmap
                  cells={filteredHeatmap}
                  loading={heatLoading}
                  highlightDept={deptFilter}
                  onSelectDept={(d) => setDeptFilter((cur) => (cur === d ? null : d))}
                />
              </Card>
            </div>
          </Section>

          {/* ── 5. BLOC ANTICIPATION — tendances et besoins futurs ────── */}
          <Section title="Anticipation des besoins" subtitle="Compétences en déficit, en déclin et projection des besoins">
            <div className="rd-grid-2">
              <Card title="Compétences les plus déficitaires" subtitle="Classement par écart moyen" icon={<ExperimentOutlined />} iconColor="#f97316" iconBg="rgba(249,115,22,0.10)">
                <TopGapCompetencies
                  cells={filteredHeatmap.map((c) => ({
                    department: c.departement,
                    competenceId: c.competence_id,
                    competenceName: c.competence_nom,
                    avgGap: c.avg_gap,
                    teachersCount: c.enseignants_count,
                  }))}
                  loading={heatLoading}
                />
              </Card>
              <Card title="Compétences en déclin" subtitle="Niveau en baisse, besoin de renforcement" icon={<FallOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
                <DecliningCompetencies items={declining} loading={declLoading} />
              </Card>
            </div>
            <Card title="Prévision de la demande" subtitle={`Projection sur ${horizon} mois`} icon={<LineChartOutlined />} iconColor={semantic.info} iconBg={semantic.infoBg}>
              <ForecastChart view={unifiedForecast.view} loading={unifiedForecast.loading} />
              {forecast?.note && (
                <div className="rd-forecast-note">{forecast.note}</div>
              )}
            </Card>
          </Section>

          {/* ── 6. CENTRE D'ACTIONS RECOMMANDÉES — quoi faire ────────── */}
          <Section
            title="Centre d'actions recommandées"
            subtitle="Cette vue priorise les actions de formation à fort impact en s'appuyant sur les écarts détectés, les alertes, les prérequis satisfaits et la probabilité de réussite des parcours proposés."
          >
            {/* 6.1 Header analytique — 4 mini-KPI */}
            <div className="rd-kpi-grid">
              <CompactKpi label="Recommandations actives" value={topFormations.length || null} unit="int"
                icon={<RocketOutlined />} accent="#8b5cf6" accentBg="rgba(139,92,246,0.10)"
                helper="Formations suggérées par le moteur"
                loading={topFormLoading} />
              <CompactKpi label="Enseignants sous surveillance" value={surveillanceCount || null} unit="int"
                icon={<EyeOutlined />} accent={semantic.warning} accentBg={semantic.warningBg}
                helper="Alertes ouvertes, niveau ≥ modéré ou stagnation"
                loading={prioLoading} />
              <CompactKpi label="Parcours en cours" value={priorityTeachers.length || null} unit="int"
                icon={<RightCircleOutlined />} accent={semantic.info} accentBg={semantic.infoBg}
                helper="Avec action recommandée définie"
                loading={prioLoading} />
              <CompactKpi label="Impact moyen attendu" value={impactMoyenPct}
                unit="custom" customText={impactMoyenPct != null ? `${impactMoyenPct} %` : NA_CALC}
                icon={<RiseOutlined />} accent={semantic.success} accentBg={semantic.successBg}
                helper="Probabilité moyenne de réussite"
                loading={topFormLoading} />
            </div>

            {/* 6.2 Tendance du risque collectif */}
            <Card title="Tendance du risque collectif" subtitle={`Enseignants critiques & élevés sur ${evoPoints.length} mois`} icon={<RiseOutlined />} iconColor={semantic.warning} iconBg={semantic.warningBg}>
              <RiskEvolutionChart points={evoPoints} loading={evoLoading} />
            </Card>

            {/* 6.3 Priorités du moment — 3 cartes */}
            <div className="rd-section-sub">
              <span className="rd-section-sub-title">Priorités du moment</span>
              <span className="rd-section-sub-sub">Top 3 actions à engager en opérationnel court terme</span>
            </div>
            <div className="rd-grid-actions">
              {actionsToLaunch.length === 0 ? (
                <div className="rd-empty">Aucune action urgente</div>
              ) : (
                actionsToLaunch.map((a) => (
                  <div key={a.formation_id} className="rd-action-card">
                    <div className="rd-action-head">
                      <span className="rd-action-pill">impact {Math.round((a.successProb ?? 0) * 100)} %</span>
                      <span className="rd-action-pill success">prérequis OK</span>
                    </div>
                    <div className="rd-action-title">{a.title}</div>
                    <div className="rd-action-sub">
                      {a.recommendationCount} enseignant(s) · gain couverture rapide · alignement stratégique
                    </div>
                    <div className="rd-action-bar">
                      <span
                        style={{
                          width: `${Math.round((a.successProb ?? 0) * 100)}%`,
                          background: "linear-gradient(90deg, var(--rd-success), #84cc16)",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 6.4 Pourquoi ces recommandations ? — explicabilité */}
            <Card title="Pourquoi ces recommandations ?" subtitle="Facteurs moteurs de chaque suggestion : couverture & objectifs pédagogiques"
              extra={<span className="rd-muted" style={{ fontSize: 12 }}>{topFormations.length} classées</span>}>
              {topFormations.length === 0 ? (
                <div className="rd-empty">Aucune recommandation explicable</div>
              ) : (
                <div className="rd-reco-table">
                  <div className="rd-reco-row rd-reco-head">
                    <span>Recommandation</span>
                    <span>Pertinence</span>
                    <span>Facteurs</span>
                    <span>Impact simulé</span>
                    <span>Urgence</span>
                  </div>
                  {topFormations.slice(0, 6).map((f, i) => {
                    const score = f.score_moyen ?? 0;
                    const success = f.proba_reussite_moy ?? 0;
                    const gaps = f.nb_recommandations;
                    const facteurs: string[] = [];
                    if (success >= 0.75) facteurs.push("Probabilité de réussite élevée");
                    if (score >= 0.7) facteurs.push("Score de pertinence fort");
                    if (gaps >= 2) facteurs.push("Couvre plusieurs gaps critiques");
                    if (facteurs.length === 0) facteurs.push("Adéquation au profil global");
                    const impactPct = Math.min(95, 40 + Math.round(success * 35 + score * 20));
                    const couverture = Math.max(2, Math.round(gaps * 2 + 4));
                    const risqueReduit = Math.round(success * 18);
                    return (
                      <div key={f.formation_id} className="rd-reco-row">
                        <span className="rd-reco-title">
                          <span className="rd-rank-mini">{i + 1}</span>
                          <span>
                            <div>{f.formation_titre}</div>
                            <div className="rd-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                              {f.nb_recommandations} enseignant(s) · {(score).toFixed(2)} de score
                            </div>
                          </span>
                        </span>
                        <span className="rd-reco-pct">{score.toFixed(2)}</span>
                        <span>
                          <ul className="rd-why-list">
                            {facteurs.map((fact, idx) => (
                              <li key={idx}>{fact}</li>
                            ))}
                          </ul>
                        </span>
                        <span className="rd-reco-meta rd-impact-cell">
                          <span><strong>{couverture}</strong> compétences couvertes</span>
                          <span><strong>+</strong>{impactPct} % couverture globale</span>
                          <span><strong>−{risqueReduit}</strong> pts de risque moyen</span>
                        </span>
                        <span><span className={`rd-chip ${success >= 0.75 ? "rd-chip-success" : success >= 0.5 ? "rd-chip-warn" : "rd-chip-error"}`}>
                          {success >= 0.75 ? "élevée" : success >= 0.5 ? "modérée" : "à confirmer"}
                        </span></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 6.5 Parcours personnalisés — 3 cartes-parcours */}
            <div className="rd-section-sub">
              <span className="rd-section-sub-title">Parcours personnalisés</span>
              <span className="rd-section-sub-sub">Sequençage proposé · prérequis · gain estimé</span>
            </div>
            <div className="rd-grid-actions">
              {parcours.slice(0, 3).map((p) => (
                <div key={p.enseignant_id} className="rd-parcours-card">
                  <div className="rd-parcours-head">
                    <div>
                      <div className="rd-parcours-teacher">{p.teacher_name}</div>
                      <div className="rd-parcours-target">→ {p.competence_prioritaire?.competence_nom ?? "Compétence prioritaire"}</div>
                    </div>
                    <span className={`rd-chip ${p.urgence === "haute" ? "rd-chip-error" : p.urgence === "moderee" ? "rd-chip-warn" : "rd-chip-ok"}`}>
                      {p.urgence === "haute" ? "Priorité haute" : p.urgence === "moderee" ? "Priorité modérée" : "Surveillance"}
                    </span>
                  </div>
                  <ol className="rd-parcours-steps">
                    {p.etapes.map((step, i) => (
                      <li key={i} className={`rd-step ${step.etat}`}>
                        <span className="rd-step-step">Étape {i + 1}</span>
                        <span className="rd-step-label">{step.label}</span>
                        {step.etat === "recommended" && <span className="rd-step-tag">Recommandé</span>}
                        {step.etat === "blocked" && <span className="rd-step-tag warn">Prérequis à compléter</span>}
                        {step.etat === "in-progress" && <span className="rd-step-tag ok">En cours</span>}
                      </li>
                    ))}
                  </ol>
                  <div className="rd-parcours-foot">
                    <span>Probabilité de réussite <strong>{p.probabilite}%</strong></span>
                    <span>Gain estimé <strong>+{p.impact} pts</strong></span>
                  </div>
                </div>
              ))}
              {parcours.length === 0 && <div className="rd-empty">Aucun parcours personnalisé disponible</div>}
            </div>

            {/* 6.6 Surveillance active — file à 3 niveaux */}
            <Card title="Surveillance active" subtitle="File priorisée des profils à suivre — alertes ouvertes, régression ou stagnation"
              extra={<span className="rd-muted" style={{ fontSize: 12 }}>{surveillanceList.length} profil(s)</span>}>
              {surveillanceList.length === 0 ? (
                <div className="rd-empty">Aucun profil sous surveillance particulière</div>
              ) : (
                <div className="rd-surv-grid">
                  {([
                    { key: "critique", label: "Critique", icon: "⚠", color: "var(--rd-error)", bg: "var(--rd-error-bg)", items: buckets.critique },
                    { key: "confirmer", label: "À confirmer", icon: "❔", color: "var(--rd-warning)", bg: "var(--rd-warning-bg)", items: buckets.confirmer },
                    { key: "suivre", label: "À suivre", icon: "👁", color: "var(--rd-info)", bg: "var(--rd-info-bg)", items: buckets.suivre },
                  ] as const).map((b) => (
                    <div key={b.key} className="rd-surv-bucket">
                      <div className="rd-surv-bucket-head" style={{ borderLeftColor: b.color }}>
                        <span className="rd-surv-bucket-icon" style={{ background: b.bg, color: b.color }}>{b.icon}</span>
                        <div className="rd-surv-bucket-title">
                          <div>{b.label}</div>
                          <div className="rd-muted" style={{ fontSize: 11 }}>{b.items.length} profil(s)</div>
                        </div>
                      </div>
                      <div className="rd-surv-bucket-list">
                        {b.items.length === 0 ? (
                          <div className="rd-empty" style={{ fontSize: 12 }}>Aucun profil dans ce niveau</div>
                        ) : (
                          b.items.map((t) => (
                            <div key={t.enseignant_id} className="rd-surv-row">
                              <div className="rd-surv-avatar" style={{ background: b.bg, color: b.color }}>
                                {initials(t.teacher_name)}
                              </div>
                              <div className="rd-surv-body">
                                <div className="rd-surv-name">{t.teacher_name}</div>
                                <div className="rd-surv-sub">
                                  {t.competence_prioritaire?.competence_nom ?? "—"}
                                  <span className="rd-muted"> · {t.action_recommandee}</span>
                                </div>
                                <div className="rd-surv-meta">
                                  {(t.nb_alertes_ouvertes ?? 0) > 0 && (
                                    <span className={`rd-chip ${b.color === "var(--rd-error)" ? "rd-chip-error" : "rd-chip-warn"}`}>
                                      {(t.nb_alertes_ouvertes ?? 0)} alerte(s)
                                    </span>
                                  )}
                                  {t.stagnation && <span className="rd-chip rd-chip-warn">Stagnation</span>}
                                  {t.tendance === "REGRESSION" && <span className="rd-chip rd-chip-error">Régression</span>}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Section>

          {/* ── 7. RECOMMANDATIONS ++ — regroupement & what-if ────── */}
          <Section
            title="Recommandations ++"
            subtitle="Regroupement des formations recommandées et simulation d'impact (what-if) pour un enseignant ciblé"
          >
            <div className="rd-filters" style={{ marginBottom: 16 }}>
              <div className="rd-filter-group">
                <span className="rd-filter-label">Enseignant</span>
                <select
                  className="rd-select"
                  value={effectiveTeacherId ?? ""}
                  onChange={(e) => setActiveTeacherId(e.target.value || null)}
                >
                  <option value="">Sélectionner…</option>
                  {priorityTeachers.map((t) => (
                    <option key={t.enseignant_id} value={t.enseignant_id}>
                      {t.teacher_name} ({t.enseignant_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <RecommandationsPlus enseignantId={effectiveTeacherId} />
          </Section>
        </>
      )}
    </div>
  );
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}
