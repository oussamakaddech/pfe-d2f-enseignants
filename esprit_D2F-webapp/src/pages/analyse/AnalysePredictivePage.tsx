import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Row, Col, Empty, Spin, Tooltip } from "antd";
import {
  RobotOutlined, ReloadOutlined, ExperimentOutlined, TeamOutlined,
  FireOutlined, FallOutlined, BellOutlined, SafetyCertificateOutlined,
  RiseOutlined, DashboardOutlined, LineChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import useAppNotification from "@/hooks/ui/useAppNotification";
import {
  useDashboardSummary, useTrainModel, useGapHeatmap,
  useModelPerformance, useOverview, useDemandForecast,
  useSupplyDemand, useRiskDistribution,
} from "@/hooks/analyse/useAnalysePredictive";
import type { OverviewKpis, TeacherRiskIndicator } from "@/models/analyse";
import { roleColors, brand, accent, semantic, neutral } from "@/styles/themes/tokens";
import GlassCard from "@/components/ui/GlassCard";
import GlassKpi from "@/components/ui/GlassKpi";
import GlassHeatmap from "@/components/charts/glass/GlassHeatmap";
import GlassForecast from "@/components/charts/glass/GlassForecast";
import GlassSupplyDemand from "@/components/charts/glass/GlassSupplyDemand";
import GlassRiskDistribution from "@/components/charts/glass/GlassRiskDistribution";
import GlassRiskTable from "@/components/charts/glass/GlassRiskTable";
import "@/styles/pages/glass.css";

dayjs.locale("fr");

function normalizeRole(v: unknown): string {
  return String(v ?? "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");
}

function greeting(): { text: string; emoji: string } {
  const h = dayjs().hour();
  if (h < 12) return { text: "Bonjour", emoji: "🌅" };
  if (h < 18) return { text: "Bon après-midi", emoji: "☀️" };
  return { text: "Bonsoir", emoji: "🌙" };
}

export default function AnalysePredictivePage() {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const qc = useQueryClient();
  const roleKey = normalizeRole(user?.role);
  const isAdmin = roleKey === "admin";
  const roleStyle = roleColors[roleKey] ?? { color: brand[500], bg: brand[50], label: "Utilisateur" };
  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const todayLabel = dayjs().format("dddd D MMMM YYYY");
  const greet = greeting();

  const { data: summary } = useDashboardSummary();
  const { data: overview, isLoading: overviewLoading } = useOverview();
  const { data: gapHeatmap = [] } = useGapHeatmap();
  const { data: modelPerf } = useModelPerformance();
  const { data: demandForecast } = useDemandForecast(6);
  const { data: supplyDemand, isLoading: supplyLoading } = useSupplyDemand();
  const { data: riskDistribution, isLoading: riskDistLoading } = useRiskDistribution();
  const trainModelMutation = useTrainModel();

  const [refreshing, setRefreshing] = useState(false);

  const riskTeachers = useMemo(
    () => [...(summary?.teacher_risk_indicators ?? [])]
      .sort((a, b) => b.attrition_risk_score - a.attrition_risk_score)
      .slice(0, 7),
    [summary]
  );

  const modelVariant: "ok" | "warn" | "error" | "idle" = useMemo(() => {
    if (!modelPerf) return "idle";
    if (modelPerf.last_retrain_status === "success") return "ok";
    if (modelPerf.last_retrain_status === "failed") return "error";
    return "warn";
  }, [modelPerf]);

  const modelLabel: Record<string, string> = {
    ok: "actif", error: "en erreur", warn: "à entraîner", idle: "inactif",
  };

  async function handleTrain() {
    try {
      await trainModelMutation.mutateAsync();
      message.success("Modèle prédictif ré-entraîné avec succès.");
    } catch {
      message.error("Échec de l'entraînement du modèle.");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["analyse"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    setRefreshing(false);
  }

  function buildKpis(o?: OverviewKpis) {
    if (!o) return [];
    return [
      { label: "Enseignants suivis", icon: <TeamOutlined />, accent: brand[500], tint: brand[50], value: String(Math.round(o.nb_enseignants_suivis)), delta: o.deltas.nb_enseignants_suivis, deltaGoodWhenUp: true },
      { label: "Risque moyen", icon: <FireOutlined />, accent: semantic.error, tint: semantic.errorBg, value: `${Math.round(o.score_risque_moyen * 100)}%`, delta: o.deltas.score_risque_moyen, deltaGoodWhenUp: false, deltaLabel: `${Math.abs((o.deltas.score_risque_moyen ?? 0) * 100).toFixed(0)} pts` },
      { label: "Gaps critiques", icon: <FallOutlined />, accent: semantic.warning, tint: semantic.warningBg, value: String(Math.round(o.nb_gaps_critiques)), delta: o.deltas.nb_gaps_critiques, deltaGoodWhenUp: false },
      { label: "Alertes nouvelles", icon: <BellOutlined />, accent: semantic.info, tint: semantic.infoBg, value: String(Math.round(o.nb_alertes_nouvelles)), delta: o.deltas.nb_alertes_nouvelles, deltaGoodWhenUp: false },
      { label: "Couverture", icon: <SafetyCertificateOutlined />, accent: semantic.success, tint: semantic.successBg, value: `${o.taux_couverture_global.toFixed(0)}%`, delta: o.deltas.taux_couverture_global, deltaGoodWhenUp: true, deltaLabel: `${Math.abs(o.deltas.taux_couverture_global ?? 0).toFixed(1)} pts` },
      { label: "Précision modèle (R²)", icon: <ExperimentOutlined />, accent: "#8b5cf6", tint: "rgba(139,92,246,0.12)", value: o.precision_modele != null ? o.precision_modele.toFixed(2) : "—", delta: o.deltas.precision_modele, deltaGoodWhenUp: true },
    ];
  }

  const kpis = buildKpis(overview);

  return (
    <div className="glass-app">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="glass-hero">
        <div className="glass-hero-avatar"><RobotOutlined /></div>
        <div className="glass-hero-body">
          <div className="glass-hero-eyebrow">
            Intelligence Artificielle · D2F
            <span className="glass-hero-role">{roleStyle.label}</span>
          </div>
          <h1 className="glass-hero-title">{greet.emoji} {greet.text}, {displayName}</h1>
          <p className="glass-hero-sub">
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · Anticipez les besoins en compétences et optimisez les parcours
          </p>
        </div>
        <div className="glass-hero-actions">
          <span className="glass-hero-status">
            <span className={`dot ${modelVariant === "ok" ? "" : modelVariant}`} />
            Modèle {modelLabel[modelVariant]}
          </span>
          {isAdmin && (
            <Tooltip title="Ré-entraîner le modèle ML">
              <button className="glass-btn" onClick={handleTrain} disabled={trainModelMutation.isPending}>
                <ExperimentOutlined spin={trainModelMutation.isPending} /> Ré-entraîner
              </button>
            </Tooltip>
          )}
          <Tooltip title="Rafraîchir">
            <button className="glass-btn" onClick={handleRefresh} disabled={refreshing}>
              <ReloadOutlined spin={refreshing} /> Rafraîchir
            </button>
          </Tooltip>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <section className="glass-section" style={{ marginTop: 22 }}>
        <div className="glass-kpi-grid">
          {overviewLoading && !overview
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-kpi" style={{ minHeight: 116 }}><Spin /></div>
              ))
            : kpis.map((k) => (
                <GlassKpi key={k.label} label={k.label} icon={k.icon}
                  accent={k.accent} tint={k.tint} value={k.value}
                  delta={k.delta} deltaGoodWhenUp={k.deltaGoodWhenUp} deltaLabel={k.deltaLabel} />
              ))}
        </div>
      </section>

      {/* ── Risque & Distribution ───────────────────────────── */}
      <section className="glass-section">
        <div className="glass-section-head">
          <span className="bar" /><span className="txt">Risque des enseignants</span>
          <span className="sub">Distribution et top priorités</span><span className="line" />
        </div>
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={14}>
            <GlassCard title="Distribution du risque" subtitle="Histogramme · niveau · départements" icon={<DashboardOutlined />} iconColor={brand[500]} iconBg={brand[50]}>
              <GlassRiskDistribution data={riskDistribution} loading={riskDistLoading} />
            </GlassCard>
          </Col>
          <Col xs={24} lg={10}>
            <GlassCard title="Enseignants les plus à risque" subtitle={`${riskTeachers.length} affichés`} icon={<FireOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
              {riskTeachers.length === 0 ? <Empty description="Aucun enseignant à risque" /> : <GlassRiskTable data={riskTeachers} />}
            </GlassCard>
          </Col>
        </Row>
      </section>

      {/* ── Heatmap ─────────────────────────────────────────── */}
      <section className="glass-section">
        <div className="glass-section-head">
          <span className="bar" /><span className="txt">Heatmap des écarts</span>
          <span className="sub">Département × Compétence (gap moyen)</span><span className="line" />
        </div>
        <GlassCard title="Cartographie des écarts" subtitle="Plus c'est rouge, plus l'écart est fort" icon={<RiseOutlined />} iconColor={brand[500]} iconBg={brand[50]}>
          <GlassHeatmap data={gapHeatmap} />
        </GlassCard>
      </section>

      {/* ── Offre/Demande + Prévision ───────────────────────── */}
      <section className="glass-section">
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={14}>
            <GlassCard title="Matrice Offre vs Demande" subtitle="Compétences par déficit d'offre" icon={<RiseOutlined />} iconColor={accent[500]} iconBg="rgba(0,180,216,0.12)">
              <GlassSupplyDemand data={supplyDemand} loading={supplyLoading} />
            </GlassCard>
          </Col>
          <Col xs={24} lg={10}>
            <GlassCard title="Prévision de la demande" subtitle="Historique + projection" icon={<LineChartOutlined />} iconColor={brand[500]} iconBg={brand[50]}>
              {!demandForecast ? <Empty description="Pas de prévision" /> : <GlassForecast data={demandForecast} />}
            </GlassCard>
          </Col>
        </Row>
      </section>

      {/* ── Performance modèle ──────────────────────────────── */}
      {modelPerf && (
        <section className="glass-section">
          <GlassCard title="Performance du modèle prédictif" subtitle="Métriques ML" icon={<ExperimentOutlined />} iconColor={brand[500]} iconBg={brand[50]}>
            <Row gutter={[18, 18]}>
              <Col xs={24} sm={8}><ModelStat label="Précision (R²)" value={modelPerf.gap_model_accuracy != null ? modelPerf.gap_model_accuracy.toFixed(2) : "—"} color={brand[500]} /></Col>
              <Col xs={24} sm={8}><ModelStat label="Proba. réussite moy." value={modelPerf.recommendation_avg_proba != null ? `${Math.round(modelPerf.recommendation_avg_proba * 100)}%` : "—"} color={semantic.success} /></Col>
              <Col xs={24} sm={8}><ModelStat label="Dernier ré-entraînement" value={modelPerf.last_retrained ? dayjs(modelPerf.last_retrained).format("DD/MM/YY HH:mm") : "Jamais"} color={accent[500]} /></Col>
            </Row>
          </GlassCard>
        </section>
      )}

    </div>
  );
}

function ModelStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 4px" }}>
      <div style={{ fontSize: 12, color: neutral[500] }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
