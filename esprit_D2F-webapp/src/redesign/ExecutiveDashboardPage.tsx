import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card, Row, Col, Statistic, Progress, Tag, Empty, Spin, Alert, Button,
  Tooltip, List,   Drawer, Descriptions, Space, Typography,
} from "antd";
import {
  ReloadOutlined, HeartOutlined, TeamOutlined, SafetyCertificateOutlined,
  BellOutlined, BulbOutlined, RiseOutlined, FallOutlined,
  FileDoneOutlined, ThunderboltOutlined,
  RightOutlined, CalendarOutlined,
  ReadOutlined, ApartmentOutlined, RightCircleOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import { greeting } from "@/utils/helpers/greeting";
import { NA_CALC } from "@/utils/states";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { computeHealthScore } from "@/services/dashboard/dashboardService";
import { useOverview, useAlertsSummary } from "@/hooks/analyse/useAnalysePredictive";
import { useBesoins } from "@/hooks/besoin/useBesoins";
import { useAllCertificates } from "@/hooks/certificat/useCertificats";
import { useInactifs } from "@/hooks/dashboard/useDashboardData";
import { usePlatformKPIs } from "@/hooks/dashboard/usePlatformStats";
import type { FormationReco } from "@/redesign/contract";
import { toCoveragePercent } from "@/redesign/risk";
import { roleColors, brand, accent, semantic } from "@/styles/themes/tokens";
import { useUnifiedDashboard, selectFormationRecos } from "@/redesign/useUnified";

dayjs.locale("fr");

const { Title, Text } = Typography;

const RISK_THRESHOLDS_LABEL = "Faible < 40 · Modéré 40–59 · Élevé 60–79 · Critique ≥ 80";

/* ──────────────────────────────────────────────────────────────────────────
   Tableau de bord institutionnel — D2F
   Réponse aux 4 questions de pilotage :
     1) Que s'est-il passé ? → Activité formation
     2) Où sont les priorités ? → Besoins & tensions
     3) Qui nécessite une action ? → Pilotage compétences
     4) Quelle formation lancer ? → Recommandations & impact
   ──────────────────────────────────────────────────────────────────────── */

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
  const { data: certificats = [], isLoading: certLoading } = useAllCertificates();
  const { data: inactifs, isLoading: inactifsLoading } = useInactifs();
  const { formationsByEtat, formationsByType } = usePlatformKPIs();

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

  const avgGain = useMemo(() => {
    const eff = d?.training_effectiveness ?? [];
    if (!eff.length) return null;
    const total = eff.reduce((s, f) => s + (f.avg_level_gain ?? 0), 0);
    return Math.round((total / eff.length) * 10) / 10;
  }, [d]);
  const avgCompletion = useMemo(() => {
    const eff = d?.training_effectiveness ?? [];
    if (!eff.length) return null;
    return Math.round((eff.reduce((s, f) => s + (f.completion_rate ?? 0), 0) / eff.length) * 100);
  }, [d]);
  const formationsTerminees = formationsByEtat.data?.acheve ?? 0;
  const teachersAtRisk = (d?.enseignants_a_risque ?? []).length;

  /* Top compétences en tension = top compétences_en_demande (score_demande) */
  const topDemande = useMemo(() =>
    (d?.competences_en_demande ?? []).slice(0, 5), [d]);
  /* Top compétences en déficit = top compétences_en_declin (delta le plus négatif) */
  const topDeficit = useMemo(() =>
    (d?.competences_en_declin ?? []).slice(0, 5), [d]);
  /* Couverture par département (top 5 plus bas) */
  const topDepartementsEnRetard = useMemo(() =>
    [...(d?.taux_couverture_departements ?? [])]
      .sort((a: any, b: any) => a.taux_couverture - b.taux_couverture)
      .slice(0, 5), [d]);

  const health = useMemo(
    () => computeHealthScore({
      coverage: coveragePct ?? undefined,
      pendingNeeds: pendingBesoins,
      atRisk: teachersAtRisk,
    }),
    [coveragePct, pendingBesoins, teachersAtRisk],
  );
  const healthColor = health.level === "healthy" ? semantic.success : health.level === "attention" ? semantic.warning : semantic.error;
  const healthLabel = health.level === "healthy" ? "Sain" : health.level === "attention" ? "Attention" : "Critique";

  const todayLabel = dayjs().format("dddd D MMMM YYYY");
  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const roleKey = normalizeRole(user?.role);
  const roleStyle = roleColors[roleKey] ?? { color: brand[500], bg: brand[50], label: "Utilisateur" };

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

  /* ── Synthèse haute — 6 KPI institutionnels ─────────────────────────── */
  const syntheseKpis: SyntheseKpi[] = [
    { key: "terminees", label: "Formations clôturées", value: formationsTerminees, icon: <ApartmentOutlined />, accent: brand[500], accentBg: brand[50], loading: formationsByEtat.isLoading },
    { key: "besoins", label: "Besoins en attente", value: pendingBesoins, icon: <FileDoneOutlined />, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.12)", loading: besoinsLoading, help: `${besoins.length} besoins saisis` },
    { key: "alertes", label: "Alertes critiques", value: alerts?.critiques_ouvertes, icon: <BellOutlined />, accent: semantic.error, accentBg: semantic.errorBg, loading: alertsLoading, help: `${alerts?.total ?? 0} alertes ouvertes au total` },
    { key: "couverture", label: "Couverture compétences", value: coveragePct == null ? NA_CALC : `${coveragePct} %`, icon: <SafetyCertificateOutlined />, accent: semantic.success, accentBg: semantic.successBg, loading: ovLoading, help: RISK_THRESHOLDS_LABEL },
    { key: "suivis", label: "Enseignants suivis", value: overview?.nb_enseignants_suivis, icon: <ReadOutlined />, accent: "#2563eb", accentBg: "#eff6ff", loading: ovLoading },
    { key: "certificats", label: "Certificats délivrés", value: certificats.length || null, icon: <RiseOutlined />, accent: semantic.success, accentBg: semantic.successBg, loading: certLoading },
  ];

  /* ── Indicateurs secondaires ──────────────────────────────────────── */
  const secondaireKpis: SyntheseKpi[] = [
    { key: "participation", label: "Taux de participation", value: NA_CALC, icon: <TeamOutlined />, accent: semantic.info, accentBg: semantic.infoBg, loading: false, help: "Source indisponible — widget masqué tant que non corrigé" },
    { key: "completion", label: "Complétion moyenne", value: avgCompletion == null ? NA_CALC : `${avgCompletion} %`, icon: <RiseOutlined />, accent: semantic.success, accentBg: semantic.successBg, loading: false },
    { key: "inactifs", label: "Enseignants sans formation (≥ 6 mois)", value: inactifs?.total, icon: <TeamOutlined />, accent: semantic.warning, accentBg: semantic.warningBg, loading: inactifsLoading },
    { key: "recommandations", label: "Recommandations émises", value: reclos.length, icon: <BulbOutlined />, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.12)", loading: false },
    { key: "sante", label: "Score de santé global", value: `${health.score}/100`, icon: <HeartOutlined />, accent: healthColor, accentBg: healthColor === semantic.success ? semantic.successBg : healthColor === semantic.warning ? semantic.warningBg : semantic.errorBg, loading: false },
    { key: "entrainement", label: "Précision modèle", value: d?.model_performance?.gap_model_accuracy != null ? `${Math.round(d.model_performance.gap_model_accuracy * 100)} %` : NA_CALC, icon: <ExperimentOutlined />, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.12)", loading: false, help: d?.model_performance?.last_retrained ? `Dernier entraînement : ${dayjs(d.model_performance.last_retrained).format("DD/MM/YYYY")}` : undefined },
  ];

  return (
    <div className="dashx">
      <style>{CSS}</style>

      {/* ── HERO — synthèse institutionnelle ─────────────────────────── */}
      <div className="dashx-hero">
        <div className="dashx-hero-glow" aria-hidden />
        <div className="dashx-hero-avatar"><ThunderboltOutlined /></div>
        <div className="dashx-hero-body">
          <Space size={8} wrap>
            <span className="dashx-eyebrow">Plateforme D2F</span>
            <Tag className="dashx-role" style={{ color: roleStyle.color, background: roleStyle.bg, borderColor: "transparent" }}>{roleStyle.label}</Tag>
          </Space>
          <Title level={2} className="dashx-hero-title">
            {greet.emoji} {greet.text}, {displayName}
          </Title>
          <Text className="dashx-hero-sub">
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · Vue institutionnelle consolidant formation, besoins, compétences et analyse prédictive.
          </Text>
        </div>
        <div className="dashx-hero-actions">
          <span className="dashx-status">
            <span className={`dashx-dot ${error ? "err" : "ok"}`} />
            {lastUpdate ? `Maj ${lastUpdate}` : "Données en direct"}
          </span>
          <Tooltip title="Rafraîchir les données">
            <Button type="primary" icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing}>
              Rafraîchir
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── 1. SYNTHÈSE HAUTE — KPI + secondaire ─────────────────────── */}
      <div className="dashx-sectionhead">
        <Title level={4} style={{ margin: 0 }}>Synthèse institutionnelle</Title>
        <Text type="secondary">Les chiffres qui donnent l’état global de la plateforme</Text>
      </div>

      {error || ovError ? (
        <Alert type="error" showIcon message="Impossible de charger le tableau de bord"
          action={<Button size="small" onClick={() => { refetch(); refetchOverview(); }}>Réessayer</Button>} style={{ marginBottom: 20 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {syntheseKpis.map((k) => (
              <Col xs={24} sm={12} lg={8} xl={4} key={k.label}>
                <KpiCardx {...k} />
              </Col>
            ))}
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
            {secondaireKpis.map((k) => (
              <Col xs={24} sm={12} lg={8} xl={4} key={k.label}>
                <KpiCardx {...k} subtle />
              </Col>
            ))}
          </Row>
        </>
      )}

      {!error && !ovError && (
        <>
          {/* ════════════════════════════════════════════════════════════ */}
          {/* BLOC 1 — Activité de formation                              */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="dashx-sectionhead">
            <Title level={4} style={{ margin: 0 }}>Activité de formation</Title>
            <Text type="secondary">Répartition et état d’avancement du cycle de vie des formations</Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card className="dashx-card" title={<span><CalendarOutlined style={{ color: brand[500], marginRight: 8 }} />Formations par état</span>}>
                {formationsByEtat.isLoading ? <CenteredSpin />
                  : <StateDonut items={[
                      { key: "enregistre", label: "Enregistrées", value: formationsByEtat.data?.enregistre ?? 0, color: "#94a3b8" },
                      { key: "planifie", label: "Planifiées", value: formationsByEtat.data?.planifie ?? 0, color: semantic.info },
                      { key: "enCours", label: "En cours", value: formationsByEtat.data?.enCours ?? 0, color: semantic.warning },
                      { key: "acheve", label: "Achevées", value: formationsByEtat.data?.acheve ?? 0, color: semantic.success },
                      { key: "annule", label: "Annulées", value: formationsByEtat.data?.annule ?? 0, color: semantic.error },
                    ]} total={formationsByEtat.data?.total ?? 0} />}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="dashx-card" title={<span><ApartmentOutlined style={{ color: accent[500], marginRight: 8 }} />Taux de complétion moyen</span>}
                extra={<Text type="secondary">Gain de niveau moyen</Text>}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <div>
                    <Space align="center" size={24}>
                      <Progress type="circle" percent={avgCompletion ?? 0} strokeColor={semantic.success}
                        format={() => (avgCompletion == null ? NA_CALC : `${avgCompletion} %`)} size={110} />
                      <div>
                        <Statistic value={avgGain != null ? `+${avgGain}` : NA_CALC}
                          valueStyle={{ fontSize: 32, fontWeight: 800, color: semantic.success }} />
                        <Text type="secondary">points moyens gagnés</Text>
                      </div>
                    </Space>
                  </div>
                  <Progress percent={Math.min(100, Math.round(((formationsTermineeRatio(formationsByEtat.data)) * 100))) || 0}
                    showInfo={true} strokeColor={semantic.success}
                    format={() => `${formationsTermineeRatio(formationsByEtat.data) || 0} %`} />
                  <Text type="secondary">Part des formations achevées sur le total</Text>
                </Space>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 4 }}>
            <Col xs={24}>
              <Card className="dashx-card" title={<span><ApartmentOutlined style={{ color: semantic.info, marginRight: 8 }} />Formations par type</span>}>
                {formationsByType.isLoading ? <CenteredSpin />
                  : (() => {
                      const types = [
                        { label: "Interne", value: formationsByType.data?.interne ?? 0, color: "#8b5cf6" },
                        { label: "Externe", value: formationsByType.data?.externe ?? 0, color: "#f59e0b" },
                        { label: "En ligne", value: formationsByType.data?.enLigne ?? 0, color: semantic.info },
                      ];
                      const sum = types.reduce((s, t) => s + t.value, 0);
                      if (sum === 0) return <Empty description="Aucune donnée de typage" />;
                      return (
                        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr 1fr" }}>
                          {types.map((t) => (
                            <div key={t.label}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                                <span><span className="dashx-swatch" style={{ background: t.color }} />{t.label}</span>
                                <Text strong>{t.value}</Text>
                              </div>
                              <Progress percent={Math.round((t.value / sum) * 100)} showInfo={false} strokeColor={t.color} size="small" />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
              </Card>
            </Col>
          </Row>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* BLOC 2 — Besoins & priorités                                */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="dashx-sectionhead">
            <Title level={4} style={{ margin: 0 }}>Besoins et tensions</Title>
            <Text type="secondary">Pression organisationnelle et compétences les plus sollicitées</Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card className="dashx-card" title={<span><FileDoneOutlined style={{ color: "#8b5cf6", marginRight: 8 }} />Besoins par priorité</span>}
                extra={<Text type="secondary">{besoins.length} au total</Text>}>
                {besoins.length === 0 ? <Empty description="Aucun besoin" />
                  : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {Object.entries(besoinsByPriorite).map(([p, n]) => {
                        const col = p === "CRITIQUE" || p === "HAUTE" ? semantic.error : p === "MOYENNE" ? semantic.warning : semantic.success;
                        return (
                          <div key={p}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                              <Text>{p}</Text>
                              <Text strong>{n}</Text>
                            </div>
                            <Progress percent={Math.round((n / besoins.length) * 100)} showInfo={false} strokeColor={col} size="small" />
                          </div>
                        );
                      })}
                    </div>}
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card className="dashx-card" title={<span><BulbOutlined style={{ color: "#f59e0b", marginRight: 8 }} />Compétences les plus demandées</span>}
                extra={<Text type="secondary">Top 5</Text>}>
                {topDemande.length === 0 ? <Empty description="Aucun signal de tension" />
                  : <List
                      dataSource={topDemande}
                      renderItem={(c: any, i: number) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<div className="dashx-rank" style={{ background: "rgba(245,158,11,0.14)", color: "#b45309" }}>{i + 1}</div>}
                            title={c.competence_nom}
                            description={`${c.domaine_nom ?? ""} · ${c.nb_gaps ?? 0} gap(s)`}
                          />
                          <Tag color="orange" style={{ fontWeight: 700 }}>score {Math.round((c.score_demande ?? 0) * 100)}</Tag>
                        </List.Item>
                      )}
                    />}
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 4 }}>
            <Col xs={24} lg={14}>
              <Card className="dashx-card" title={<span><ApartmentOutlined style={{ color: semantic.info, marginRight: 8 }} />Départements en retard de couverture</span>}
                extra={<Text type="secondary">Top 5 plus faibles</Text>}>
                {topDepartementsEnRetard.length === 0 ? <Empty description="Aucune donnée départementale" />
                  : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {topDepartementsEnRetard.map((dep: any) => (
                        <div key={dep.departement} className="glass-list-item" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <Text strong>{dep.departement}</Text>
                            <Progress percent={dep.taux_couverture ?? 0} showInfo={false} strokeColor={semantic.success} size="small" style={{ marginTop: 4 }} />
                          </div>
                          <Text strong style={{ color: semantic.success }}>{Math.round(dep.taux_couverture ?? 0)} %</Text>
                        </div>
                      ))}
                    </div>}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="dashx-card" title={<span><TeamOutlined style={{ color: semantic.warning, marginRight: 8 }} />Enseignants sans formation récente</span>}
                extra={<Text type="secondary">≥ 6 mois</Text>}>
                {inactifsLoading ? <CenteredSpin />
                  : <Space align="center" size={16} style={{ padding: "10px 0" }}>
                      <Statistic value={inactifs?.total ?? 0}
                        valueStyle={{ fontSize: 38, fontWeight: 800, color: semantic.warning }} />
                      <Text type="secondary">enseignant(s)<br />sans suivi</Text>
                    </Space>}
              </Card>
            </Col>
          </Row>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* BLOC 3 — Pilotage des compétences                            */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="dashx-sectionhead">
            <Title level={4} style={{ margin: 0 }}>Pilotage des compétences</Title>
            <Text type="secondary">Couverture globale, risque et compétences en tension</Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card className="dashx-card" title={<span><SafetyCertificateOutlined style={{ color: semantic.success, marginRight: 8 }} />Couverture globale</span>}>
                <Space align="center" size={20} wrap>
                  <Progress type="circle" percent={coveragePct ?? 0}
                    strokeColor={semantic.success}
                    format={() => (coveragePct == null ? NA_CALC : `${coveragePct} %`)} size={130} />
                  <div>
                    <Statistic value={overview?.nb_enseignants_suivis ?? NA_CALC}
                      valueStyle={{ fontSize: 28, fontWeight: 800 }} />
                    <Text type="secondary">enseignants évalués</Text>
                    <div style={{ marginTop: 8, fontSize: 12, color: semantic.success, fontWeight: 600 }}>
                      {RISK_THRESHOLDS_LABEL}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card className="dashx-card" title={<span><BellOutlined style={{ color: semantic.error, marginRight: 8 }} />Enseignants à risque & alertes</span>}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <NextKpi icon={<TeamOutlined />} color={semantic.error} label="À risque" value={teachersAtRisk} />
                  <NextKpi icon={<BellOutlined />} color={semantic.warning} label="Alertes ouvertes" value={alerts?.total ?? NA_CALC} />
                  <NextKpi icon={<RightCircleOutlined />} color={semantic.info} label="Nouvelles alertes" value={alerts?.nouvelles ?? NA_CALC} />
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card className="dashx-card" title={<span><FallOutlined style={{ color: semantic.error, marginRight: 8 }} />Compétences en tension</span>}>
                {topDeficit.length === 0 ? <Empty description="Aucune compétence en déficit" />
                  : <List
                      dataSource={topDeficit}
                      renderItem={(c: any, i: number) => (
                        <List.Item style={{ padding: "8px 0" }}>
                          <List.Item.Meta
                            avatar={<div className="dashx-rank" style={{ background: "rgba(239,68,68,0.14)", color: "#b91c1c" }}>{i + 1}</div>}
                            title={<Text>{c.competence_nom}</Text>}
                            description={`${c.domaine_nom ?? ""} · Δ ${(c.delta ?? 0).toFixed(1)} pts`}
                          />
                        </List.Item>
                      )}
                    />}
              </Card>
            </Col>
          </Row>
          <Card className="dashx-card" style={{ marginTop: 4 }}>
            <Alert type="info" showIcon message="Analyse prédictive détaillée"
              description="Les chiffres ci-dessus sont agrégés. Pour la liste nominative des enseignants, l’historique des alertes, ou les écarts par compétence et département, ouvrez l’Analyse Prédictive."
              action={
                <Button type="primary" onClick={() => navigate("/home/AnalysePredictive")}>
                  Ouvrir l’Analyse Prédictive <RightOutlined />
                </Button>
              }
            />
          </Card>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* BLOC 4 — Recommandations & impact                            */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="dashx-sectionhead">
            <Title level={4} style={{ margin: 0 }}>Recommandations et impact</Title>
            <Text type="secondary">Top formations suggérées et effet observé</Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card className="dashx-card" title={<span><BulbOutlined style={{ color: "#8b5cf6", marginRight: 8 }} />Top formations à planifier</span>}>
                {reclos.length === 0 ? <Empty description="Aucune recommandation" />
                  : <List
                      dataSource={reclos}
                      renderItem={(f, i) => (
                        <List.Item style={{ cursor: "pointer" }} onClick={() => setSelectedTraining(f)}
                          actions={[<Text key="r" style={{ color: semantic.success }}>{Math.round((f.successProb ?? 0) * 100)} % réussite</Text>]}>
                          <List.Item.Meta
                            avatar={<div className="dashx-rank">{i + 1}</div>}
                            title={f.title}
                            description={`${f.recommendationCount} recommandation(s)${f.avgScore != null ? ` · score ${f.avgScore.toFixed(2)}` : ""}`}
                          />
                        </List.Item>
                      )}
                    />}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="dashx-card" title={<span><HeartOutlined style={{ color: healthColor, marginRight: 8 }} />Impact observé & santé du modèle</span>}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <NextKpi icon={<RiseOutlined />} color={semantic.success} label="Gain de niveau moyen après formation"
                    value={avgGain != null ? `+${avgGain} pts` : NA_CALC} />
                  <NextKpi icon={<RiseOutlined />} color={semantic.success} label="Taux moyen de complétion"
                    value={avgCompletion == null ? NA_CALC : `${avgCompletion} %`} />
                  <NextKpi icon={<ExperimentOutlined />} color="#8b5cf6" label="Précision du modèle"
                    value={d?.model_performance?.gap_model_accuracy != null ? `${Math.round(d.model_performance.gap_model_accuracy * 100)} %` : NA_CALC} />
                  <div style={{ marginTop: 6 }}>
                    <Space align="center" size={16}>
                      <Progress type="circle" percent={health.score} strokeColor={healthColor}
                        format={() => `${health.score}/100`} size={88} />
                      <div>
                        <Tag color={health.level === "healthy" ? "green" : health.level === "attention" ? "orange" : "red"} style={{ fontWeight: 700 }}>
                          {healthLabel}
                        </Tag>
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--neutral-600,#5a6373)", maxWidth: 220 }}>
                          Basé sur la couverture, les besoins en attente et l’engagement.
                        </div>
                      </div>
                    </Space>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Drawer
        title={selectedTraining ? selectedTraining.title : "Détail"}
        placement="right" width={460} open={!!selectedTraining} onClose={() => setSelectedTraining(null)}
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
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
interface SyntheseKpi {
  key: string;
  label: string;
  value: number | string | null | undefined;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  loading?: boolean;
  help?: string;
  subtle?: boolean;
}

function KpiCardx({ label, value, icon, accent, accentBg, loading, help, subtle }: SyntheseKpi) {
  const display = value == null || (typeof value === "number" && Number.isNaN(value)) || value === "" ? NA_CALC : value;
  return (
    <div className={`dashx-kpi${subtle ? " is-subtle" : ""}`} style={{ animation: "dashxFade .5s ease both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text type="secondary" style={{ fontSize: subtle ? 12.5 : 13, fontWeight: 600 }}>{label}</Text>
        <div style={{ width: subtle ? 32 : 36, height: subtle ? 32 : 36, borderRadius: 10, display: "grid", placeItems: "center", background: accentBg, color: accent, fontSize: subtle ? 15 : 17 }}>{icon}</div>
      </div>
      <div style={{ marginTop: subtle ? 6 : 10 }}>
        {loading ? <Spin size="small" />
          : <Statistic value={display as number | string}
              valueStyle={{ fontSize: subtle ? 23 : 27, fontWeight: 800, color: typeof display === "string" ? "var(--neutral-600,#5a6373)" : "#1e293b" }} />}
      </div>
      {help && <Text type="secondary" style={{ fontSize: 11.5, display: "block", marginTop: 6 }}>{help}</Text>}
    </div>
  );
}

function NextKpi({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number | string | null }) {
  const display = value == null || value === "" ? NA_CALC : value;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: color === semantic.success ? semantic.successBg : color === semantic.warning ? semantic.warningBg : color === semantic.error ? semantic.errorBg : color === semantic.info ? semantic.infoBg : "rgba(139,92,246,0.12)", color, fontSize: 15 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <Text type="secondary" style={{ fontSize: 12.5, display: "block" }}>{label}</Text>
        <Text strong style={{ fontSize: 19, color }}>{display}</Text>
      </div>
    </div>
  );
}

function CenteredSpin() {
  return <div style={{ padding: 36, textAlign: "center" }}><Spin /></div>;
}

function StateDonut({ items, total }: { items: Array<{ key: string; label: string; value: number; color: string }>; total: number }) {
  const size = 130, r = 52, c = 2 * Math.PI * r, cx = 65, cy = 65;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2f7" strokeWidth={16} />
        {items.map((s) => {
          const frac = total > 0 ? s.value / total : 0;
          const dash = frac * c;
          const el = (
            <circle key={s.key} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={16}
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray .6s ease" }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="9" fill="#64748b">formations</text>
      </svg>
      <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((s) => (
          <div key={s.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span><span className="dashx-swatch" style={{ background: s.color }} />{s.label}</span>
            <Text strong>{s.value}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}

function formationsTermineeRatio(data: { total?: number; acheve?: number } | undefined): number {
  if (!data || !data.total || data.total === 0) return 0;
  return Math.round(((data.acheve ?? 0) / data.total) * 100);
}

/* ── Styles ──────────────────────────────────────────────────────────── */
const CSS = `
.dashx { max-width: 1340px; margin: 0 auto; padding: 24px 24px 48px; }
.dashx-hero {
  position: relative; overflow: hidden; display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  padding: 26px 28px; border-radius: 20px; margin-bottom: 22px;
  background: linear-gradient(120deg, ${brand[500]} 0%, #e11d48 55%, #f97316 100%);
  color: #fff; box-shadow: 0 18px 40px rgba(181,18,0,0.22);
}
.dashx-hero-glow { position: absolute; inset: 0; background: radial-gradient(600px 200px at 90% -20%, rgba(255,255,255,0.25), transparent 60%); }
.dashx-hero-avatar { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; font-size: 26px; background: rgba(255,255,255,0.18); backdrop-filter: blur(4px); z-index: 1; }
.dashx-hero-body { flex: 1; min-width: 240px; z-index: 1; }
.dashx-eyebrow { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .9; font-weight: 600; }
.dashx-hero-title { color: #fff !important; margin: 6px 0 2px !important; font-weight: 800 !important; }
.dashx-hero-sub { color: rgba(255,255,255,0.92) !important; font-size: 13.5px; }
.dashx-hero-actions { display: flex; align-items: center; gap: 14px; z-index: 1; }
.dashx-status { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: rgba(255,255,255,0.9); }
.dashx-dot { width: 9px; height: 9px; border-radius: 50%; }
.dashx-dot.ok { background: #4ade80; box-shadow: 0 0 0 4px rgba(74,222,128,0.25); }
.dashx-dot.err { background: #fecaca; }
.dashx-role { font-weight: 700; }
.dashx-sectionhead { margin: 28px 0 12px; display: flex; flex-direction: column; gap: 2px; animation: dashxFade .5s ease both; }
.dashx-card { border: none !important; border-radius: 16px !important; box-shadow: 0 6px 18px rgba(15,23,42,0.07) !important; }
.dashx-card .ant-card-head { border-bottom: 1px solid #f1f5f9; min-height: 52px; }
.dashx-rank { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; background: rgba(139,92,246,0.14); color: #8b5cf6; font-weight: 800; }
.dashx-swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; vertical-align: middle; }
.dashx-kpi { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(15,23,42,0.07); transition: transform .18s ease, box-shadow .18s ease; height: 100%; }
.dashx-kpi:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(15,23,42,0.12); }
.dashx-kpi.is-subtle { padding: 14px 16px; }
.dashx-kpi.is-subtle .ant-statistic-content { font-weight: 700 !important; }
@keyframes dashxFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.glass-list-item { padding: 10px 12px; border-radius: 12px; }
`;
