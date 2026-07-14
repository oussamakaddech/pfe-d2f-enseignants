import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Spin, Empty, Button, Drawer, Descriptions, Alert,
} from "antd";
import {
  ReloadOutlined, RightOutlined, AppstoreOutlined, PlayCircleOutlined, BellOutlined,
  SafetyCertificateOutlined, TeamOutlined, WarningOutlined, ThunderboltOutlined,
  FileProtectOutlined, RiseOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExperimentOutlined, ArrowUpOutlined, FallOutlined, DashboardOutlined,
  ApartmentOutlined, BulbOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import { greeting } from "@/utils/helpers/greeting";
import { NA_CALC } from "@/utils/states";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { computeHealthScore } from "@/services/dashboard/dashboardService";
import { useOverview, useAlertsSummary, useRiskEvolution } from "@/hooks/analyse/useAnalysePredictive";
import { useBesoins } from "@/hooks/besoin/useBesoins";
import { useAllCertificates } from "@/hooks/certificat/useCertificats";
import { useInactifs, useFormationsTimeline, useParticipationByDept } from "@/hooks/dashboard/useDashboardData";
import { usePlatformKPIs } from "@/hooks/dashboard/usePlatformStats";
import type { FormationReco } from "@/redesign/contract";
import { toCoveragePercent, riskPct } from "@/redesign/risk";
import { brand, semantic, roleColors } from "@/styles/themes/tokens";
import { useUnifiedDashboard, selectFormationRecos } from "@/redesign/useUnified";
import type { DashboardScope } from "@/models/dashboard";
import type { AnalyticsDepartement } from "@/models/analyse/reporting";
import "@/redesign/redesign.css";
import { Section, Card } from "@/redesign/components/Section";
import RiskEvolutionChart from "@/redesign/components/charts/RiskEvolutionChart";
import { KpiSkeleton, ErrorState } from "@/redesign/components/States";
import { buildTrend } from "@/redesign/format";

dayjs.locale("fr");

const ACCENT = brand[500];

/* ──────────────────────────────────────────────────────────────────────────
   Tableau de bord institutionnel — D2F (Design ESPRIT : rd-*)
   Modules : Indicateurs clés · Formations · Besoins & compétences
              · Risque & alertes · Recommandations & impact
   ──────────────────────────────────────────────────────────────────────── */

type IndicatorKind = "int" | "coverage" | "pct" | "custom";
interface StatItem {
  key: string;
  label: string;
  value: number | null | undefined;
  unit?: IndicatorKind;
  customText?: string;
  icon: ReactNode;
  accent: string;
  accentBg: string;
  helper?: string;
  trend?: ReturnType<typeof buildTrend>;
  trendLabel?: string;
  loading?: boolean;
  /** Cible de référence pour les métriques de taux (%, ou valeur max acceptable). */
  target?: number;
  /** true = plus c'est haut mieux c'est (couverture, complétion…). false = plus c'est bas mieux c'est (risque). */
  higherIsBetter?: boolean;
}

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const { message } = useAppNotification();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const greet = greeting();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<FormationReco | null>(null);

  const { d, error, lastUpdate, refetch } = useUnifiedDashboard();
  const { data: overview, isLoading: ovLoading, isError: ovError, refetch: refetchOverview } = useOverview();
  const { data: alerts, isLoading: alertsLoading } = useAlertsSummary();
  const { data: besoins = [], isLoading: besoinsLoading } = useBesoins();
  const { data: certificats = [] } = useAllCertificates();
  const { data: inactifs, isLoading: inactifsLoading } = useInactifs();
  const { formationsByEtat, formationsByType } = usePlatformKPIs();

  const timelineScope = useMemo<DashboardScope>(() => {
    const role = (normalizeRole(user?.role) || "admin").toLowerCase();
    return {
      role,
      isAdmin: role === "admin",
      isCup: role === "cup",
      isEnseignant: role === "enseignant",
      isAnimateur: role === "animateur",
      start: dayjs().subtract(11, "month").startOf("month").format("YYYY-MM-DD"),
      end: dayjs().endOf("month").format("YYYY-MM-DD"),
      rangeKey: "12m",
    };
  }, [user?.role]);
  const { data: timeline, isLoading: timelineLoading } = useFormationsTimeline(timelineScope);
  const { data: deptAnalytics, isLoading: deptLoading } = useParticipationByDept(true);
  const { data: riskEvo = [], isLoading: riskEvoLoading } = useRiskEvolution(6);

  const reclos = useMemo(() => selectFormationRecos(d), [d]);

  const besoinsByPriorite = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const b of besoins) {
      const p = b.priorite ?? "NON_DEFINIE";
      acc[p] = (acc[p] ?? 0) + 1;
    }
    return acc;
  }, [besoins]);
  const pendingBesoins = useMemo(() => besoins.filter((b) => !b.approuveAdmin).length, [besoins]);

  const coveragePct = overview ? toCoveragePercent(overview.taux_couverture_global) : null;
  const avgRisk = overview ? riskPct(overview.score_risque_moyen) : null;
  const riskTrendBadge = buildTrend({
    current: overview?.score_risque_moyen,
    previous: overview?.score_risque_moyen_precedent,
    higherIsBetter: false,
    unit: "pts",
  });

  const avgGain = useMemo(() => {
    const eff = d?.training_effectiveness ?? [];
    if (!eff.length) return null;
    return Math.round((eff.reduce((s, f) => s + (f.avg_level_gain ?? 0), 0) / eff.length) * 10) / 10;
  }, [d]);
  const avgCompletion = useMemo(() => {
    const eff = d?.training_effectiveness ?? [];
    if (!eff.length) return null;
    return Math.round((eff.reduce((s, f) => s + (f.completion_rate ?? 0), 0) / eff.length) * 100);
  }, [d]);
  const avgParticipation = useMemo(() => {
    const deps = deptAnalytics?.departements ?? [];
    const valid = deps.filter((x) => x.tauxParticipation != null);
    if (!valid.length) return null;
    return Math.round(valid.reduce((s, x) => s + (x.tauxParticipation || 0), 0) / valid.length);
  }, [deptAnalytics]);

  const topDemande = useMemo(() => (d?.competences_en_demande ?? []).slice(0, 5), [d]);
  const topDeficit = useMemo(() => (d?.competences_en_declin ?? []).slice(0, 5), [d]);
  const topDepartementsEnRetard = useMemo(
    () => [...(d?.taux_couverture_departements ?? [])].sort((a, b) => a.taux_couverture - b.taux_couverture).slice(0, 6),
    [d],
  );

  const teachersAtRisk = (d?.enseignants_a_risque ?? []).length;
  const formationsTermineRatio = (() => {
    const t = formationsByEtat.data?.total ?? 0;
    return t === 0 ? 0 : Math.round(((formationsByEtat.data?.acheve ?? 0) / t) * 100);
  })();

  const health = useMemo(
    () => computeHealthScore({ coverage: coveragePct ?? undefined, pendingNeeds: pendingBesoins, atRisk: teachersAtRisk }),
    [coveragePct, pendingBesoins, teachersAtRisk],
  );
  const healthColor = health.level === "healthy" ? semantic.success : health.level === "attention" ? semantic.warning : semantic.error;

  const timelineData = useMemo(
    () => (timeline?.periodes ?? []).map((p) => ({ label: p.label, value: p.nombreFormations })),
    [timeline],
  );
  const riskPoints = useMemo(
    () => riskEvo.map((p) => ({ month: p.month, critical: p.critical, high: p.high })),
    [riskEvo],
  );

  const todayLabel = dayjs().format("dddd D MMMM YYYY");
  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const roleKey = normalizeRole(user?.role);
  const roleLabel = roleColors[roleKey ?? ""]?.label ?? roleKey ?? "Utilisateur";

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["analyse"] });
      await qc.invalidateQueries({ queryKey: ["kpi"] });
      message.success("Tableau de bord actualisé.");
    } finally {
      setRefreshing(false);
    }
  }

  const indicators: StatItem[] = [
    { key: "formations", label: "Formations totales", value: formationsByEtat.data?.total, unit: "int", icon: <AppstoreOutlined />, accent: ACCENT, accentBg: "rgba(181,18,0,0.10)", helper: `${formationsByEtat.data?.acheve ?? 0} achevées`, loading: formationsByEtat.isLoading },
    { key: "encours", label: "En cours", value: formationsByEtat.data?.enCours, unit: "int", icon: <PlayCircleOutlined />, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.12)", helper: `${formationsTermineRatio}% achevées`, loading: formationsByEtat.isLoading },
    { key: "besoins", label: "Besoins en attente", value: pendingBesoins, unit: "int", icon: <BellOutlined />, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.12)", helper: `${besoins.length} saisis au total`, loading: besoinsLoading },
    { key: "couverture", label: "Couverture compétences", value: coveragePct, unit: "pct", icon: <SafetyCertificateOutlined />, accent: semantic.success, accentBg: semantic.successBg, helper: "Part au niveau requis", target: 80, higherIsBetter: true, loading: ovLoading },
    { key: "suivis", label: "Enseignants suivis", value: overview?.nb_enseignants_suivis, unit: "int", icon: <TeamOutlined />, accent: "#0ea5e9", accentBg: "rgba(14,165,233,0.12)", helper: "Évalués par le moteur", loading: ovLoading },
    { key: "alertes", label: "Alertes critiques", value: alerts?.critiques_ouvertes, unit: "int", icon: <WarningOutlined />, accent: semantic.error, accentBg: semantic.errorBg, helper: `${alerts?.total ?? 0} ouvertes au total`, loading: alertsLoading },
    { key: "recos", label: "Recommandations", value: reclos.length || null, unit: "int", icon: <ThunderboltOutlined />, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.12)", helper: "Formations suggérées" },
    { key: "certificats", label: "Certificats", value: certificats.length || null, unit: "int", icon: <FileProtectOutlined />, accent: semantic.success, accentBg: semantic.successBg, helper: "Délivrés" },
    { key: "participation", label: "Participation moyenne", value: avgParticipation, unit: "pct", icon: <RiseOutlined />, accent: "#0ea5e9", accentBg: "rgba(14,165,233,0.12)", helper: "Taux par département", target: 60, higherIsBetter: true, loading: deptLoading },
    { key: "completion", label: "Complétion moyenne", value: avgCompletion, unit: "pct", icon: <CheckCircleOutlined />, accent: semantic.success, accentBg: semantic.successBg, helper: "Formations suivies", target: 75, higherIsBetter: true, loading: ovLoading },
    { key: "inactifs", label: "Sans formation ≥ 6 m", value: inactifs?.total, unit: "int", icon: <ClockCircleOutlined />, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.12)", helper: "Enseignants inactifs", loading: inactifsLoading },
    { key: "risque", label: "Risque moyen", value: avgRisk, unit: "pct", icon: <FallOutlined />, accent: semantic.error, accentBg: semantic.errorBg, helper: "Score de risque global", trend: riskTrendBadge, trendLabel: "pts", target: 40, higherIsBetter: false, loading: ovLoading },
    { key: "precision", label: "Précision modèle", value: d?.model_performance?.gap_model_accuracy != null ? Math.round(d.model_performance.gap_model_accuracy * 100) : null, unit: "pct", icon: <ExperimentOutlined />, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.12)", helper: "Qualité prédictive", target: 85, higherIsBetter: true },
    { key: "gain", label: "Gain de niveau moyen", value: avgGain, unit: "custom", customText: avgGain != null ? `+${avgGain}` : NA_CALC, icon: <ArrowUpOutlined />, accent: semantic.success, accentBg: semantic.successBg, helper: "Points gagnés" },
  ];
  const rateIndicators = indicators.filter((i) => i.unit === "pct" && i.target != null);

  const etatItems = [
    { key: "enregistre", label: "Enregistrées", value: formationsByEtat.data?.enregistre ?? 0, color: "#94a3b8" },
    { key: "planifie", label: "Planifiées", value: formationsByEtat.data?.planifie ?? 0, color: "#6366f1" },
    { key: "enCours", label: "En cours", value: formationsByEtat.data?.enCours ?? 0, color: "#f59e0b" },
    { key: "acheve", label: "Achevées", value: formationsByEtat.data?.acheve ?? 0, color: semantic.success },
    { key: "annule", label: "Annulées", value: formationsByEtat.data?.annule ?? 0, color: semantic.error },
  ];
  const typeItems = [
    { label: "Interne", value: formationsByType.data?.interne ?? 0, color: "#6366f1" },
    { label: "Externe", value: formationsByType.data?.externe ?? 0, color: "#f59e0b" },
    { label: "En ligne", value: formationsByType.data?.enLigne ?? 0, color: "#0ea5e9" },
  ];
  const prioriteColor: Record<string, string> = {
    CRITIQUE: semantic.error,
    HAUTE: "#f97316",
    MOYENNE: semantic.warning,
    BASSE: semantic.success,
    NON_DEFINIE: "#94a3b8",
  };

  if (error || ovError) {
    return (
      <div className="rd">
        <Section title="Tableau de bord exécutif">
          <ErrorState
            message="Impossible de charger le tableau de bord."
            onRetry={() => { refetch(); refetchOverview(); }}
          />
        </Section>
        <style>{ED_CSS}</style>
      </div>
    );
  }

  return (
    <div className="rd">
      {/* ── Bandeau haut ─────────────────────────────────────────────── */}
      <section className="rd-hero">
        <div className="rd-hero-avatar"><DashboardOutlined /></div>
        <div className="rd-hero-body">
          <div className="rd-hero-eyebrow">
            Plateforme D2F
            <span className="rd-hero-role">{roleLabel}</span>
          </div>
          <h1 className="rd-hero-title">{greet.emoji} {greet.text}, {displayName}</h1>
          <p className="rd-hero-sub">
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · Vue institutionnelle consolidée des formations, compétences et risques.
          </p>
        </div>
        <div className="rd-hero-actions">
          <span className="rd-hero-status">
            <span className={`rd-dot ${error ? "error" : "ok"}`} />
            {lastUpdate ? `Maj ${lastUpdate}` : "Données en direct"}
          </span>
          <button className="rd-btn" onClick={handleRefresh} disabled={refreshing}>
            <ReloadOutlined spin={refreshing} /> Rafraîchir
          </button>
        </div>
      </section>

      {/* ── Indicateurs clés ─────────────────────────────────────────── */}
      <Section title="Indicateurs clés" subtitle="Les chiffres qui pilotent la décision">
        {ovLoading && !overview ? (
          <KpiSkeleton count={14} />
        ) : (
          <div className="ed-kpi-grid">
            {indicators.map((s) => (
              <KpiTile key={s.key} item={s} />
            ))}
          </div>
        )}

        <div className="ed-grid ed-grid--kpi" style={{ marginTop: 16 }}>
          <Card title="Synthèse des taux clés" subtitle="Valeur vs objectif (cible)"
            icon={<RiseOutlined />} iconColor="#0ea5e9" iconBg="rgba(14,165,233,0.12)">
            <RateBars items={rateIndicators} />
          </Card>

          <Card title="Détail des indicateurs" subtitle="Valeur, progression et état"
            icon={<DashboardOutlined />} iconColor={ACCENT} iconBg="rgba(181,18,0,0.10)">
            <SynthesisTable items={indicators} />
          </Card>
        </div>
      </Section>

      {/* ════════ FORMATIONS ════════ */}
      <Section title="Formations" subtitle="État, typologie, évolution et couverture par département">
        <div className="ed-grid">
          <Card title="Répartition par état" subtitle={`${formationsByEtat.data?.total ?? 0} formations`}
            icon={<AppstoreOutlined />} iconColor={ACCENT} iconBg="rgba(181,18,0,0.10)">
            {formationsByEtat.isLoading ? <ChartSkeletonLocal /> : <DonutChart items={etatItems} total={formationsByEtat.data?.total ?? 0} />}
          </Card>

          <Card title="Complétion & gain" subtitle={`${formationsTermineRatio}% achevées`}
            icon={<CheckCircleOutlined />} iconColor={semantic.success} iconBg={semantic.successBg}>
            <div className="ed-ring-row">
              <ProgressRing value={avgCompletion ?? 0} color={semantic.success} size={108} suffix="%" />
              <div>
                <div className="ed-bignum" style={{ color: semantic.success }}>{avgGain != null ? `+${avgGain}` : NA_CALC}</div>
                <div className="rd-muted" style={{ fontSize: 12, marginTop: 4 }}>points gagnés en moyenne</div>
              </div>
            </div>
          </Card>

          <Card title="Par type" subtitle="Interne · Externe · En ligne"
            icon={<ApartmentOutlined />} iconColor="#6366f1" iconBg="rgba(99,102,241,0.12)">
            {formationsByType.isLoading ? <ChartSkeletonLocal /> : <SegBars items={typeItems} />}
          </Card>

          <Card title="Évolution mensuelle" subtitle={`${timeline?.totalFormations ?? 0} formations sur 12 mois`} className="ed-col-2"
            icon={<RiseOutlined />} iconColor="#0ea5e9" iconBg="rgba(14,165,233,0.12)">
            {timelineLoading ? <ChartSkeletonLocal height={230} /> : <AreaLineChart data={timelineData} color={ACCENT} />}
          </Card>

          <Card title="Top départements" subtitle="Formations organisées · Top 8"
            icon={<ApartmentOutlined />} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)" className="ed-col-2">
            {deptLoading ? <ChartSkeletonLocal /> : <DeptBars departements={deptAnalytics?.departements ?? []} />}
          </Card>
        </div>
      </Section>

      {/* ════════ BESOINS & COMPÉTENCES ════════ */}
      <Section title="Besoins & compétences" subtitle="Priorisation des besoins et tension sur les compétences">
        <div className="ed-grid">
          <Card title="Besoins par priorité" subtitle={`${besoins.length} au total`}
            icon={<BellOutlined />} iconColor="#f97316" iconBg="rgba(249,115,22,0.12)">
            {besoinsLoading ? <ChartSkeletonLocal /> : (
              Object.keys(besoinsByPriorite).length === 0 ? <EmptyMini label="Aucun besoin" /> : (
                <BarList
                  items={Object.entries(besoinsByPriorite).map(([p, n]) => ({
                    label: p, value: n, total: besoins.length,
                    color: prioriteColor[p] ?? "#94a3b8",
                  }))}
                />
              )
            )}
          </Card>

          <Card title="Couverture globale" subtitle="Niveau requis atteint"
            icon={<SafetyCertificateOutlined />} iconColor={semantic.success} iconBg={semantic.successBg}>
            <div className="ed-ring-row">
              <ProgressRing value={coveragePct ?? 0} color={semantic.success} size={108} suffix="%" />
              <div>
                <div className="ed-bignum">{overview?.nb_enseignants_suivis ?? NA_CALC}</div>
                <div className="rd-muted" style={{ fontSize: 12, marginTop: 2 }}>enseignants évalués</div>
              </div>
            </div>
          </Card>

          <Card title="Compétences les plus demandées" subtitle="Top 5"
            icon={<BulbOutlined />} iconColor="#0ea5e9" iconBg="rgba(14,165,233,0.12)">
            {topDemande.length === 0 ? <EmptyMini label="Aucun signal de tension" /> : (
              <RankList
                items={topDemande.map((c: any, i: number) => ({
                  rank: i + 1,
                  title: c.competence_nom,
                  sub: `${c.domaine_nom ?? "—"} · ${c.nb_gaps ?? 0} gap(s)`,
                  badge: `${Math.round((c.score_demande ?? 0) * 100)}`,
                  badgeColor: "#b45309",
                  badgeBg: "rgba(245,158,11,.16)",
                }))}
              />
            )}
          </Card>

          <Card title="Compétences en tension" subtitle="Top 5 déficit"
            icon={<FallOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg} className="ed-col-2">
            {topDeficit.length === 0 ? <EmptyMini label="Aucune compétence en déficit" /> : (
              <RankList
                items={topDeficit.map((c: any, i: number) => ({
                  rank: i + 1,
                  title: c.competence_nom,
                  sub: c.domaine_nom ?? "—",
                  badge: `Δ ${(c.delta ?? 0).toFixed(1)}`,
                  badgeColor: "#b91c1c",
                  badgeBg: "rgba(239,68,68,.16)",
                }))}
              />
            )}
          </Card>

          <Card title="Départements en retard" subtitle="Top 6 plus faibles"
            icon={<ApartmentOutlined />} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)" className="ed-col-2">
            {topDepartementsEnRetard.length === 0 ? <EmptyMini label="Aucune donnée départementale" /> : (
              <BarList
                items={topDepartementsEnRetard.map((dep: any) => ({
                  label: dep.departement, value: Math.round(dep.taux_couverture ?? 0), total: 100,
                  color: semantic.success, suffix: "%",
                }))}
              />
            )}
          </Card>
        </div>
      </Section>

      {/* ════════ RISQUE & ALERTES ════════ */}
      <Section title="Risque & alertes" subtitle="Population à risque, alertes ouvertes et tendance">
        <div className="ed-grid">
          <Card title="Enseignants à risque" subtitle="Identifiés par le moteur prédictif"
            icon={<WarningOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
            <div className="ed-bignum" style={{ color: semantic.error }}>{teachersAtRisk}</div>
            <div className="rd-muted" style={{ fontSize: 12 }}>profils nécessitant un suivi</div>
          </Card>

          <Card title="Sans formation récente" subtitle="≥ 6 mois"
            icon={<ClockCircleOutlined />} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)">
            {inactifsLoading ? <Spin /> : <>
              <div className="ed-bignum" style={{ color: semantic.warning }}>{inactifs?.total ?? 0}</div>
              <div className="rd-muted" style={{ fontSize: 12 }}>enseignant(s) sans suivi</div>
            </>}
          </Card>

          <Card title="Alertes" subtitle="Répartition des alertes ouvertes"
            icon={<BellOutlined />} iconColor={semantic.warning} iconBg={semantic.warningBg}>
            <div className="ed-kv">
              <KvRow label="Ouvertes" value={alerts?.total} color={semantic.warning} loading={alertsLoading} />
              <KvRow label="Nouvelles" value={alerts?.nouvelles} color="#6366f1" loading={alertsLoading} />
              <KvRow label="Critiques ouvertes" value={alerts?.critiques_ouvertes} color={semantic.error} loading={alertsLoading} />
            </div>
          </Card>

          <Card title="Tendance du risque" subtitle="Critiques & élevés · 6 mois" className="ed-col-3"
            icon={<FallOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
            {riskEvoLoading ? <ChartSkeletonLocal height={230} /> : <RiskEvolutionChart points={riskPoints} loading={riskEvoLoading} />}
          </Card>
        </div>
      </Section>

      <div className="rd-card" style={{ marginTop: 4 }}>
        <Alert type="info" showIcon message="Analyse prédictive détaillée"
          description="Pour la liste nominative des enseignants, l'historique des alertes et les écarts par compétence/département, ouvrez l'Analyse Prédictive."
          action={<Button type="primary" size="small" onClick={() => navigate("/home/AnalysePredictive")}>Ouvrir <RightOutlined /></Button>} />
      </div>

      {/* ════════ RECOMMANDATIONS & IMPACT ════════ */}
      <Section title="Recommandations & impact" subtitle="Formations prioritaires et santé du modèle prédictif">
        <div className="ed-grid">
          <Card title="Top formations à planifier" subtitle={`${reclos.length} recommandation(s)`}
            icon={<ThunderboltOutlined />} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)" className="ed-col-2">
            {reclos.length === 0 ? <EmptyMini label="Aucune recommandation" /> : (
              <RankList
                clickable
                items={reclos.map((f, i) => ({
                  rank: i + 1,
                  title: f.title,
                  sub: `${f.recommendationCount} reco${f.avgScore != null ? ` · ${f.avgScore.toFixed(2)}` : ""}`,
                  badge: `${Math.round((f.successProb ?? 0) * 100)}%`,
                  badgeColor: "#15803d",
                  badgeBg: "rgba(34,197,94,.16)",
                  onClick: () => setSelectedTraining(f),
                }))}
              />
            )}
          </Card>

          <Card title="Impact observé & santé du modèle"
            icon={<ExperimentOutlined />} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)">
            <div className="ed-kv">
              <KvRow label="Gain de niveau moyen" value={avgGain != null ? `+${avgGain} pts` : null} color={semantic.success} />
              <KvRow label="Complétion moyenne" value={avgCompletion == null ? null : `${avgCompletion}%`} color={semantic.success} />
              <KvRow label="Précision du modèle" value={d?.model_performance?.gap_model_accuracy != null ? `${Math.round(d.model_performance.gap_model_accuracy * 100)}%` : null} color="#6366f1" />
            </div>
            <div className="ed-ring-row" style={{ marginTop: 4 }}>
              <ProgressRing value={health.score} color={healthColor} size={92} max={100} />
              <div>
                <span className="rd-chip" style={{ color: healthColor, background: healthColor === semantic.success ? "rgba(34,197,94,.16)" : healthColor === semantic.warning ? "rgba(245,158,11,.16)" : "rgba(239,68,68,.16)" }}>
                  {health.level === "healthy" ? "Sain" : health.level === "attention" ? "Attention" : "Critique"}
                </span>
                <div className="rd-muted" style={{ fontSize: 11.5, marginTop: 6, maxWidth: 200 }}>Basé sur couverture, besoins en attente et engagement.</div>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <Drawer
        title={selectedTraining ? selectedTraining.title : "Détail"}
        placement="right" width={440} open={!!selectedTraining} onClose={() => setSelectedTraining(null)}
        extra={selectedTraining ? <Button type="link" onClick={() => navigate("/home/analytics/alerts")}>Centre d'action <RightOutlined /></Button> : null}
      >
        {selectedTraining && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Recommandations">{selectedTraining.recommendationCount}</Descriptions.Item>
              <Descriptions.Item label="Score moyen">{selectedTraining.avgScore != null ? selectedTraining.avgScore.toFixed(2) : NA_CALC}</Descriptions.Item>
              <Descriptions.Item label="Réussite estimée">{Math.round((selectedTraining.successProb ?? 0) * 100)} %</Descriptions.Item>
            </Descriptions>
            <Alert style={{ marginTop: 16 }} type="info" showIcon message="Formation prioritaire"
              description="Issue du moteur de recommandation. Un score élevé et une probabilité de réussite forte indiquent un bon levier pour réduire les écarts de compétences." />
          </>
        )}
      </Drawer>

      <style>{ED_CSS}</style>
    </div>
  );
}

/* ── Sous-composants ──────────────────────────────────────────────────── */
function ChartSkeletonLocal({ height = 200 }: { height?: number }) {
  return <div className="rd-skel rd-skel-block" style={{ height }} />;
}

function EmptyMini({ label }: { label: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={label} style={{ margin: "8px 0" }} />;
}

function KvRow({ label, value, color, loading }: { label: string; value: number | string | null | undefined; color: string; loading?: boolean }) {
  const display = value == null || value === "" ? NA_CALC : value;
  return (
    <div className="ed-kv-row">
      <span className="ed-kv-dot" style={{ background: color }} />
      <span className="ed-kv-label">{label}</span>
      <span className="ed-kv-val" style={{ color }}>{loading ? <Spin size="small" /> : display}</span>
    </div>
  );
}

interface RankItem { rank: number; title: string; sub?: string; badge?: string; badgeColor?: string; badgeBg?: string; onClick?: () => void; }
function RankList({ items, clickable }: { items: RankItem[]; clickable?: boolean }) {
  return (
    <div className="rd-list">
      {items.map((it, i) => (
        <div key={i} className={`rd-list-item ${clickable ? "interactive" : ""}`} onClick={it.onClick}>
          <span className="rd-rank">{it.rank}</span>
          <div className="li-main">
            <div className="li-title">{it.title}</div>
            {it.sub && <div className="li-sub">{it.sub}</div>}
          </div>
          {it.badge && <span className="rd-chip" style={{ color: it.badgeColor, background: it.badgeBg }}>{it.badge}</span>}
        </div>
      ))}
    </div>
  );
}

interface BarItem { label: string; value: number; total: number; color: string; suffix?: string; }
function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <div className="ed-bars">
      {items.map((it, i) => (
        <div key={i} className="ed-bar-row">
          <div className="ed-bar-head">
            <span className="ed-bar-label">{it.label}</span>
            <span className="ed-bar-val">{it.value}{it.suffix ?? ""}</span>
          </div>
          <div className="rd-bar"><span style={{ width: `${Math.min(100, (it.value / max) * 100)}%`, background: `linear-gradient(90deg, ${it.color}, ${it.color}dd)` }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ── Donut (hover highlight + centre dynamique + légende) ─────────────── */
function DonutChart({ items, total }: { items: Array<{ key: string; label: string; value: number; color: string }>; total: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const size = 168, r = 64, sw = 16, c = 2 * Math.PI * r, cx = 84, cy = 84;
  let offset = 0;
  const active = items.find((s) => s.key === hover);
  return (
    <div className="ed-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rd-surface-3)" strokeWidth={sw} />
        {items.map((s) => {
          const frac = total > 0 ? s.value / total : 0;
          const dash = frac * c;
          const el = (
            <circle key={s.key} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={hover === s.key ? sw + 4 : sw} strokeLinecap="round"
              strokeDasharray={`${Math.max(0, dash - 1.5)} ${c - Math.max(0, dash - 1.5)}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} className="ed-donut-seg"
              onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}
              style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1), stroke-width .2s" }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--rd-text)">{active ? active.value : total}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="10" fill="var(--rd-text-3)" fontWeight="600">{active ? active.label : "formations"}</text>
      </svg>
      <div className="ed-donut-legend">
        {items.map((s) => (
          <div key={s.key} className={`ed-legend-item ${hover === s.key ? "hovered" : ""}`}
            onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
            <span className="ed-legend-dot" style={{ background: s.color }} />
            <span className="ed-legend-label">{s.label}</span>
            <span className="ed-legend-count">{s.value}</span>
            <span className="ed-legend-pct">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Ring (gradient + track) ─────────────────────────────────────────── */
function ProgressRing({ value, color, size = 108, suffix = "", max = 100 }: { value: number; color: string; size?: number; suffix?: string; max?: number }) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
  const frac = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const gid = `ring-${color.replace(/[^a-z0-9]/gi, "")}-${size}-${Math.round(value)}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rd-surface-3)" strokeWidth={9} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={`${frac * c} ${c - frac * c}`} transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy + 1} textAnchor="middle" fontSize={suffix ? 18 : 24} fontWeight="800" fill="var(--rd-text)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {suffix ? `${Math.round(value)}${suffix}` : `${Math.round(value)}`}
      </text>
    </svg>
  );
}

/* ── SegBars (rounded gradient + %) ──────────────────────────────────── */
function SegBars({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const sum = items.reduce((s, t) => s + t.value, 0);
  if (sum === 0) return <EmptyMini label="Aucune donnée de typage" />;
  return (
    <div className="ed-bars">
      {items.map((t) => (
        <div key={t.label} className="ed-bar-row">
          <div className="ed-bar-head">
            <span className="ed-bar-label">{t.label}</span>
            <span className="ed-bar-val">{t.value} · {Math.round((t.value / sum) * 100)}%</span>
          </div>
          <div className="rd-bar"><span style={{ width: `${(t.value / sum) * 100}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}cc)` }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ── AreaLineChart (gradient, grille, tooltip au survol) ─────────────── */
function AreaLineChart({ data, color }: { data: Array<{ label: string; value: number }>; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <EmptyMini label="Aucune donnée" />;
  const W = 600, H = 230, PL = 34, PR = 16, PT = 16, PB = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const n = data.length;
  const x = (i: number) => PL + (n <= 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / niceMax);

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p0 = pts[i - 1], p1 = pts[i], mx = (p0.x + p1.x) / 2;
    line += ` C ${mx.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - PB} L ${x(0).toFixed(1)} ${H - PB} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => PT + (H - PT - PB) * t);
  const step = Math.max(1, Math.ceil(n / 7));
  const gid = `ed-la-${color.replace(/[^a-z0-9]/gi, "")}`;
  const hoverPt = hover != null && hover < n ? pts[hover] : null;
  return (
    <div className="rd-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
        onMouseMove={(e) => {
          const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
          if (!rect) return;
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0, bd = Infinity;
          for (let i = 0; i < n; i++) { const dd = Math.abs(x(i) - px); if (dd < bd) { bd = dd; best = i; } }
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((gy, i) => (
          <g key={i}>
            <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="var(--rd-border)" strokeWidth={1} />
            <text x={PL - 7} y={gy + 3} textAnchor="end" className="rd-axis-label">{Math.round(niceMax * (1 - i / 4))}</text>
          </g>
        ))}
        {hover != null && hoverPt && (
          <line x1={hoverPt.x} y1={PT} x2={hoverPt.x} y2={H - PB} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.06))" }} />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 3} fill="#fff" stroke={color} strokeWidth={2} style={{ transition: "r .15s ease" }} />
        ))}
        {hover != null && hover < n && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={x(hover) - 32} y={y(data[hover].value) - 30} width="64" height="22" rx="5" fill="var(--rd-text)" />
            <text x={x(hover)} y={y(data[hover].value) - 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{data[hover].value}</text>
          </g>
        )}
        {data.map((d, i) => (i % step === 0 || i === n - 1) ? (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--rd-text-3)">{d.label}</text>
        ) : null)}
      </svg>
      {hover != null && (
        <div className="rd-chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: 4 }}>
          <div className="t-date">{data[hover].label}</div>
          <div className="t-row"><span className="t-k">{data[hover].value} formations</span></div>
        </div>
      )}
    </div>
  );
}

/* ── DeptBars (horizontal, rounded) ──────────────────────────────────── */
function DeptBars({ departements }: { departements: AnalyticsDepartement[] }) {
  if (!departements.length) return <EmptyMini label="Aucune donnée départementale" />;
  const sorted = [...departements].sort((a, b) => (b.nombreFormationsOrganisees ?? 0) - (a.nombreFormationsOrganisees ?? 0)).slice(0, 8);
  const max = Math.max(1, ...sorted.map((d) => d.nombreFormationsOrganisees ?? 0));
  return (
    <div className="ed-bars">
      {sorted.map((d) => {
        const v = d.nombreFormationsOrganisees ?? 0;
        return (
          <div key={d.departementId} className="ed-bar-row">
            <div className="ed-bar-head">
              <span className="ed-bar-label" style={{ maxWidth: 200 }}>{d.departementNom}</span>
              <span className="ed-bar-val">{v}</span>
            </div>
            <div className="rd-bar"><span style={{ width: `${(v / max) * 100}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Statut d'un indicateur vs objectif ─────────────────────────────── */
type Status = "good" | "warn" | "bad" | "na" | "neutral";
const STATUS_COLOR: Record<Status, string> = {
  good: semantic.success,
  warn: semantic.warning,
  bad: semantic.error,
  na: "#94a3b8",
  neutral: "#6366f1",
};
const STATUS_LABEL: Record<Status, string> = {
  good: "Bon", warn: "À surveiller", bad: "Critique", na: "N/A", neutral: "—",
};
function statusOf(value: number | null | undefined, target?: number, higherIsBetter?: boolean): Status {
  if (value == null || Number.isNaN(value) || target == null) return target == null ? "neutral" : "na";
  if (higherIsBetter) {
    if (value >= target) return "good";
    if (value >= target * 0.7) return "warn";
    return "bad";
  }
  if (value <= target) return "good";
  if (value <= target * 1.4) return "warn";
  return "bad";
}

function formatStat(item: StatItem): string {
  if (item.value == null || Number.isNaN(item.value)) return NA_CALC;
  if (item.customText) return item.customText;
  if (item.unit === "pct") return `${Math.round(item.value)} %`;
  if (item.unit === "int") return Math.round(item.value).toLocaleString("fr-FR");
  return `${Math.round(item.value)}`;
}

/* ── KPI tile (carte + mini-barre de progression) ────────────────────── */
function KpiTile({ item }: { item: StatItem }) {
  const shown = formatStat(item);
  const isPct = item.unit === "pct";
  const pctVal = isPct && item.value != null && !Number.isNaN(item.value) ? Math.max(0, Math.min(100, item.value)) : null;
  const status = isPct && item.target != null ? statusOf(item.value, item.target, item.higherIsBetter) : "neutral";
  const barColor = STATUS_COLOR[status];
  return (
    <div className="ed-kpi-tile" style={{ "--kpi-accent": item.accent, "--kpi-accent-bg": item.accentBg } as CSSProperties}>
      <div className="ed-kpi-top">
        <span className="ed-kpi-ic" style={{ color: item.accent, background: item.accentBg }}>{item.icon}</span>
        <span className="ed-kpi-label">{item.label}</span>
        {item.trend && (
          <span className={`rd-trend ${item.trend.direction} ${item.trend.good ? "good" : "bad"}`}>
            {item.trend.direction === "up" ? "▲" : item.trend.direction === "down" ? "▼" : "–"}
            {item.trend.value != null && item.trend.value !== 0 ? ` ${item.trend.value}${item.trendLabel ? ` ${item.trendLabel}` : ""}` : ""}
          </span>
        )}
      </div>
      <div className="ed-kpi-val">{item.loading ? <span className="rd-skel" style={{ width: 56, height: 22 }} /> : shown}</div>
      {pctVal != null ? (
        <div className="ed-kpi-bar">
          <span style={{ width: `${pctVal}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)` }} />
          {item.target != null && <i className="ed-kpi-target" style={{ left: `${Math.min(100, item.target)}%` }} title={`Objectif ${item.target}%`} />}
        </div>
      ) : (
        item.helper && <div className="ed-kpi-help">{item.helper}</div>
      )}
    </div>
  );
}

/* ── Barres de synthèse des taux (chart) ─────────────────────────────── */
function RateBars({ items }: { items: StatItem[] }) {
  if (!items.length) return <EmptyMini label="Aucun taux calculable" />;
  return (
    <div className="ed-rate">
      {items.map((it) => {
        const val = it.value != null && !Number.isNaN(it.value) ? Math.max(0, Math.min(100, it.value)) : 0;
        const status = statusOf(it.value, it.target, it.higherIsBetter);
        const color = STATUS_COLOR[status];
        return (
          <div key={it.key} className="ed-rate-row">
            <div className="ed-rate-head">
              <span className="ed-rate-label">{it.label}</span>
              <span className="ed-rate-val" style={{ color }}>{formatStat(it)}</span>
            </div>
            <div className="ed-rate-track">
              <span className="ed-rate-fill" style={{ width: `${val}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
              {it.target != null && <i className="ed-rate-target" style={{ left: `${Math.min(100, it.target)}%` }} />}
            </div>
            <span className="ed-rate-status" style={{ color }}>{STATUS_LABEL[status]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tableau de détail des indicateurs ───────────────────────────────── */
function SynthesisTable({ items }: { items: StatItem[] }) {
  return (
    <div className="ed-table">
      <div className="ed-table-head">
        <span>Indicateur</span>
        <span className="ta-c">Valeur</span>
        <span>Progression</span>
        <span className="ta-r">État</span>
      </div>
      {items.map((it) => {
        const status = it.unit === "pct" && it.target != null ? statusOf(it.value, it.target, it.higherIsBetter) : "neutral";
        const color = STATUS_COLOR[status];
        const pct = it.unit === "pct" && it.value != null && !Number.isNaN(it.value) ? Math.max(0, Math.min(100, it.value)) : null;
        return (
          <div key={it.key} className="ed-table-row">
            <span className="ed-table-ind"><span className="ed-table-ic" style={{ color: it.accent, background: it.accentBg }}>{it.icon}</span>{it.label}</span>
            <span className="ed-table-val ta-c">{formatStat(it)}</span>
            <span className="ed-table-bar">
              {pct != null ? <span className="ed-table-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} /> : <span className="ed-table-bar-na">—</span>}
            </span>
            <span className="ta-r"><span className="rd-chip" style={{ color, background: `${color}1f` }}>{STATUS_LABEL[status]}</span></span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Styles (ESPRIT / rd-* compléments de mise en page) ──────────────── */
const ED_CSS = `
.ed-grid{ display:grid; gap:16px; grid-template-columns:repeat(2,minmax(0,1fr)); }
.ed-col-2{ grid-column:span 2; }
.ed-col-3{ grid-column:span 2; }
@media(min-width:1024px){
  .ed-grid{ grid-template-columns:repeat(3,minmax(0,1fr)); }
  .ed-col-2{ grid-column:span 2; }
  .ed-col-3{ grid-column:span 3; }
}
.ed-bignum{ font-size:38px; font-weight:800; letter-spacing:-.03em; line-height:1; font-variant-numeric:tabular-nums; }
.ed-ring-row{ display:flex; align-items:center; gap:16px; }
.ed-kv{ display:flex; flex-direction:column; gap:4px; }
.ed-kv-row{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; transition:background .15s; }
.ed-kv-row:hover{ background:var(--rd-surface-2); }
.ed-kv-dot{ width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.ed-kv-label{ flex:1; font-size:13px; color:var(--rd-text-2); }
.ed-kv-val{ font-size:14px; font-weight:800; font-variant-numeric:tabular-nums; }
.ed-bars{ display:flex; flex-direction:column; gap:12px; }
.ed-bar-row{ display:flex; flex-direction:column; gap:5px; }
.ed-bar-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ed-bar-label{ font-size:13px; color:var(--rd-text); font-weight:550; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ed-bar-val{ font-size:13px; font-weight:700; color:var(--rd-text-2); font-variant-numeric:tabular-nums; }
.ed-donut{ display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.ed-donut-seg{ cursor:pointer; }
.ed-donut-legend{ display:flex; flex-direction:column; gap:6px; flex:1; min-width:140px; }
.ed-legend-item{ display:flex; align-items:center; gap:9px; padding:6px 9px; border-radius:9px; font-size:12.5px; transition:background .15s; }
.ed-legend-item.hovered, .ed-legend-item:hover{ background:var(--rd-surface-2); }
.ed-legend-dot{ width:10px; height:10px; border-radius:4px; flex-shrink:0; }
.ed-legend-label{ flex:1; font-weight:600; color:var(--rd-text); }
.ed-legend-count{ font-weight:700; font-variant-numeric:tabular-nums; }
.ed-legend-pct{ width:38px; text-align:right; color:var(--rd-text-3); font-variant-numeric:tabular-nums; }
.ed-empty{ color:var(--rd-text-3); font-size:13px; text-align:center; padding:10px; }

/* ── KPI tiles (cartes + mini-barre) ─────────────────────────────────── */
.ed-kpi-grid{ display:grid; gap:14px; grid-template-columns:repeat(2,minmax(0,1fr)); }
.ed-grid--kpi{ grid-template-columns:repeat(1,minmax(0,1fr)); }
@media(min-width:760px){ .ed-kpi-grid{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media(min-width:1100px){ .ed-kpi-grid{ grid-template-columns:repeat(4,minmax(0,1fr)); } .ed-grid--kpi{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
.ed-kpi-tile{
  position:relative; background:var(--rd-surface); border:1px solid var(--rd-border);
  border-radius:var(--rd-radius); padding:14px 16px 13px; overflow:hidden;
  box-shadow:var(--rd-shadow-sm); transition:transform .18s ease, box-shadow .2s ease, border-color .2s ease;
}
.ed-kpi-tile::before{ content:""; position:absolute; left:0; top:0; bottom:0; width:4px;
  background:linear-gradient(180deg, var(--kpi-accent), color-mix(in srgb, var(--kpi-accent) 45%, transparent)); }
.ed-kpi-tile:hover{ transform:translateY(-3px); box-shadow:var(--rd-shadow-md); border-color:var(--rd-border-strong); }
.ed-kpi-top{ display:flex; align-items:center; gap:10px; }
.ed-kpi-ic{ width:34px; height:34px; border-radius:10px; display:grid; place-items:center; font-size:16px; flex:0 0 auto; box-shadow:inset 0 1px 0 rgba(255,255,255,.5); }
.ed-kpi-label{ font-size:12.5px; font-weight:600; color:var(--rd-text-2); flex:1; min-width:0; line-height:1.2; }
.ed-kpi-val{ font-size:26px; font-weight:800; letter-spacing:-.02em; margin-top:10px; line-height:1; font-variant-numeric:tabular-nums; }
.ed-kpi-bar{ position:relative; height:7px; border-radius:999px; background:var(--rd-surface-3); margin-top:10px; overflow:visible; }
.ed-kpi-bar > span{ display:block; height:100%; border-radius:999px; transition:width .7s cubic-bezier(.22,1,.36,1); }
.ed-kpi-target{ position:absolute; top:-3px; width:2px; height:13px; background:var(--rd-text); opacity:.5; border-radius:2px; }
.ed-kpi-help{ font-size:11px; color:var(--rd-text-3); margin-top:8px; line-height:1.35; }

/* ── Synthèse des taux (barres horizontales) ─────────────────────────── */
.ed-rate{ display:flex; flex-direction:column; gap:14px; }
.ed-rate-row{ display:grid; grid-template-columns:1fr; gap:5px; }
.ed-rate-head{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
.ed-rate-label{ font-size:13px; font-weight:600; color:var(--rd-text); }
.ed-rate-val{ font-size:15px; font-weight:800; font-variant-numeric:tabular-nums; }
.ed-rate-track{ position:relative; height:12px; border-radius:999px; background:var(--rd-surface-3); overflow:visible; }
.ed-rate-fill{ display:block; height:100%; border-radius:999px; transition:width .7s cubic-bezier(.22,1,.36,1); box-shadow:inset 0 1px 0 rgba(255,255,255,.35); }
.ed-rate-target{ position:absolute; top:-4px; width:3px; height:20px; background:var(--rd-text); opacity:.55; border-radius:2px; transform:translateX(-50%); }
.ed-rate-status{ font-size:11.5px; font-weight:700; align-self:flex-end; }

/* ── Tableau de détail ────────────────────────────────────────────────── */
.ed-table{ display:flex; flex-direction:column; }
.ed-table-head, .ed-table-row{ display:grid; grid-template-columns:1.6fr .7fr 1.3fr .8fr; gap:10px; align-items:center; }
.ed-table-head{ font-size:10.5px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:var(--rd-text-3); padding:0 10px 9px; border-bottom:1px solid var(--rd-border-strong); }
.ed-table-row{ padding:10px; border-bottom:1px solid var(--rd-border); }
.ed-table-row:last-child{ border-bottom:none; }
.ed-table-row:hover{ background:var(--rd-surface-2); }
.ed-table-ind{ display:flex; align-items:center; gap:9px; font-size:13px; font-weight:600; color:var(--rd-text); min-width:0; }
.ed-table-ic{ width:28px; height:28px; border-radius:8px; display:grid; place-items:center; font-size:13px; flex:0 0 auto; }
.ed-table-val{ font-size:14px; font-weight:800; font-variant-numeric:tabular-nums; }
.ed-table-bar{ position:relative; height:8px; border-radius:999px; background:var(--rd-surface-3); overflow:hidden; min-width:0; }
.ed-table-bar-fill{ display:block; height:100%; border-radius:999px; transition:width .7s cubic-bezier(.22,1,.36,1); }
.ed-table-bar-na{ color:var(--rd-text-3); font-size:12px; padding-left:2px; }
.ta-c{ text-align:center; } .ta-r{ text-align:right; }
@media(max-width:760px){
  .ed-table-head{ display:none; }
  .ed-table-row{ grid-template-columns:1fr auto; grid-auto-rows:auto; gap:6px; }
  .ed-table-ind{ grid-column:1 / -1; }
  .ed-table-val{ grid-column:2; }
  .ed-table-bar{ grid-column:1 / -1; }
}
@media(max-width:640px){ .ed-bignum{ font-size:30px; } }
`;
