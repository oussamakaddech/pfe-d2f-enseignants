import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Row, Col, Empty, Spin, Tooltip, Table, Tag, Progress, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  RobotOutlined, ReloadOutlined, ExperimentOutlined, TeamOutlined,
  FireOutlined, FallOutlined, BellOutlined, SafetyCertificateOutlined,
  RiseOutlined, BulbOutlined, DashboardOutlined, LineChartOutlined,
  ThunderboltOutlined, TrophyOutlined, ApartmentOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import useAppNotification from "@/hooks/ui/useAppNotification";
import {
  useDashboardSummary, useTrainModel, useGapHeatmap, useRiskEvolution,
  useModelPerformance, useOverview, useDemandForecast,
  useSupplyDemand, useRiskDistribution,
} from "@/hooks/analyse/useAnalysePredictive";
import { useDashboard } from "@/hooks/analyse/useDashboard";
import PredictionScoreBar from "@/components/charts/PredictionScoreBar";
import type {
  OverviewKpis, TeacherRiskIndicator, TopFormation, AlerteResumee,
  TrainingEffectiveness, CouvertureDepartement,
} from "@/models/analyse";
import { roleColors, brand, accent, semantic, neutral } from "@/styles/themes/tokens";
import GlassCard from "@/components/ui/GlassCard";
import GlassKpi from "@/components/ui/GlassKpi";
import GlassHeatmap from "@/components/charts/glass/GlassHeatmap";
import GlassForecast from "@/components/charts/glass/GlassForecast";
import GlassTrend from "@/components/charts/glass/GlassTrend";
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

const SEVERITE_COLOR: Record<string, string> = {
  CRITICAL: "red", WARNING: "orange", INFO: "blue",
};

function couvertureColor(taux: number): string {
  if (taux >= 75) return "#10b981";
  if (taux >= 50) return "#f59e0b";
  return "#ef4444";
}

const topFormColumns: ColumnsType<TopFormation> = [
  { title: "Formation", dataIndex: "formation_titre", render: v => <Text strong>{v}</Text> },
  { title: "Reco.", dataIndex: "nb_recommandations", align: "center", width: 80, render: v => <Tag color="blue">{v}</Tag> },
  { title: "Score moyen", dataIndex: "score_moyen", width: 170, render: v => <PredictionScoreBar value={v} size="small" showPct /> },
  { title: "Réussite moy.", dataIndex: "proba_reussite_moy", align: "center", width: 120, render: v => <Text style={{ color: semantic.success, fontWeight: 600 }}>{Math.round((v ?? 0) * 100)}%</Text> },
];

const alerteColumns: ColumnsType<AlerteResumee> = [
  { title: "Titre", dataIndex: "titre", render: v => <Text strong>{v}</Text> },
  { title: "Type", dataIndex: "type_alerte", render: v => <Tag color="purple" className="text-xs">{String(v).replaceAll("_", " ")}</Tag> },
  { title: "Sévérité", dataIndex: "severite", width: 100, render: v => <Tag color={SEVERITE_COLOR[v as string] ?? "default"}>{v}</Tag> },
  { title: "Date", dataIndex: "created_at", width: 160, render: v => <Text type="secondary" className="text-xs">{dayjs(v).format("DD/MM/YYYY HH:mm")}</Text> },
];

const effColumns: ColumnsType<TrainingEffectiveness> = [
  { title: "Formation", dataIndex: "formation_titre", render: v => <Text strong>{v}</Text> },
  { title: "Gain niveau moy.", dataIndex: "avg_level_gain", align: "center", width: 140, render: v => { const color = v >= 1 ? "success" : v > 0 ? "processing" : "default"; return <Tag color={color}>+{Number(v ?? 0).toFixed(2)}</Tag>; } },
  { title: "Taux complétion", dataIndex: "completion_rate", width: 160, render: v => <Progress percent={Math.round((v ?? 0) * 100)} size="small" strokeColor="#b51200" /> },
  { title: "Recommandée", dataIndex: "nb_recommandee", align: "center", width: 110, render: v => <Tag color="blue">{v}×</Tag> },
];

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
  const { data: riskEvolution = [] } = useRiskEvolution(6);
  const { data: modelPerf } = useModelPerformance();
  const { data: demandForecast } = useDemandForecast(6);
  const { data: supplyDemand, isLoading: supplyLoading } = useSupplyDemand();
  const { data: riskDistribution, isLoading: riskDistLoading } = useRiskDistribution();
  const trainModelMutation = useTrainModel();

  const { dashboard: ad, lastUpdate } = useDashboard();

  const [refreshing, setRefreshing] = useState(false);

  const riskTeachers = useMemo(
    () => [...(summary?.teacher_risk_indicators ?? [])]
      .sort((a, b) => b.attrition_risk_score - a.attrition_risk_score)
      .slice(0, 7),
    [summary]
  );
  const declining = (summary?.declining_competencies ?? []).slice(0, 6);
  const inDemand = (summary?.in_demand_competencies ?? []).slice(0, 6);

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

      {/* ── Tendance + Compétences ──────────────────────────── */}
      <section className="glass-section">
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={10}>
            <GlassCard title="Évolution mensuelle du risque" subtitle="6 derniers mois" icon={<ThunderboltOutlined />} iconColor="#00b4d8" iconBg="rgba(0,180,216,0.12)">
              {riskEvolution.length === 0 ? <Empty description="Pas d'historique" /> : <GlassTrend data={riskEvolution} />}
            </GlassCard>
          </Col>
          <Col xs={24} lg={7}>
            <GlassCard title="Compétences en déclin" subtitle="Niveau en régression" icon={<FallOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
              {declining.length === 0 ? <Empty description="Aucune" /> : (
                <div className="glass-list">
                  {declining.map((c) => (
                    <div key={c.competency_id} className="glass-list-item">
                      <div className="li-main"><div className="li-title">{c.competency_name}</div><div className="li-sub">{c.domaine_name ?? "—"}</div></div>
                      <span className="glass-chip" style={{ color: semantic.error }}><FallOutlined /> {c.demand_12m ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </Col>
          <Col xs={24} lg={7}>
            <GlassCard title="Compétences en forte demande" subtitle="Priorité d'action" icon={<BulbOutlined />} iconColor={semantic.success} iconBg={semantic.successBg}>
              {inDemand.length === 0 ? <Empty description="Aucune" /> : (
                <div className="glass-list">
                  {inDemand.map((c) => (
                    <div key={c.competency_id} className="glass-list-item">
                      <div className="li-main"><div className="li-title">{c.competency_name}</div><div className="li-sub">{c.domaine_name ?? "—"}</div></div>
                      <span className="glass-chip" style={{ color: semantic.info }}><RiseOutlined /> {c.demand_12m ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
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

      {/* ── Détails opérationnels ─────────────────────────── */}
      <section className="glass-section">
        <div className="glass-section-head">
          <span className="bar" /><span className="txt">Détails opérationnels</span>
          <span className="sub">{lastUpdate ? `Mise à jour ${lastUpdate}` : ""}</span><span className="line" />
        </div>
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={12}>
            <GlassCard title="Top formations recommandées" subtitle={`${ad?.top_formations_recommandees?.length ?? 0} recommandations`} icon={<TrophyOutlined />} iconColor="#b51200" iconBg="rgba(181,18,0,0.10)">
              {ad?.top_formations_recommandees?.length ? (
                <Table dataSource={ad.top_formations_recommandees} columns={topFormColumns} rowKey="formation_id" pagination={false} size="small" />
              ) : <Empty description="Aucune donnée" />}
            </GlassCard>
          </Col>
          <Col xs={24} lg={12}>
            <GlassCard title="Alertes récentes" subtitle={`${ad?.alertes_recentes?.length ?? 0} alertes`} icon={<BellOutlined />} iconColor={semantic.info} iconBg={semantic.infoBg}>
              {ad?.alertes_recentes?.length ? (
                <Table dataSource={ad.alertes_recentes} columns={alerteColumns} rowKey="id" pagination={{ pageSize: 5, size: "small" }} size="small" />
              ) : <Empty description="Aucune alerte" />}
            </GlassCard>
          </Col>
        </Row>
      </section>

      {/* ── Efficacité & couverture ───────────────────────── */}
      <section className="glass-section">
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={14}>
            <GlassCard title="Efficacité des formations" subtitle="Gain de niveau & complétion" icon={<TrophyOutlined />} iconColor="#b51200" iconBg="rgba(181,18,0,0.10)">
              {ad?.training_effectiveness?.length ? (
                <Table dataSource={ad.training_effectiveness} columns={effColumns} rowKey="formation_id" pagination={{ pageSize: 5, size: "small" }} size="small" />
              ) : <Empty description="Aucune donnée" />}
            </GlassCard>
          </Col>
          <Col xs={24} lg={10}>
            <GlassCard title="Couverture par département" subtitle="Taux de couverture" icon={<ApartmentOutlined />} iconColor={semantic.success} iconBg={semantic.successBg}>
              {ad?.taux_couverture_departements?.length ? (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {ad.taux_couverture_departements.map((c: CouvertureDepartement) => (
                    <div key={c.departement}>
                      <Space style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <Text strong>{c.departement || "—"}</Text>
                        <Text type="secondary" className="text-xs">{c.nb_evalues} évalué(s)</Text>
                      </Space>
                      <Progress percent={Math.round(c.taux_couverture)} strokeColor={couvertureColor(c.taux_couverture)} size="small" />
                    </div>
                  ))}
                </Space>
              ) : <Empty description="Aucune donnée" />}
            </GlassCard>
          </Col>
        </Row>
      </section>
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
