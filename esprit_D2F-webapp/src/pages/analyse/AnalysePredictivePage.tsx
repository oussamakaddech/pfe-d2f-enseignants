import { useState, useMemo } from "react";
import {
  Input, Button, Tag, Row, Col, Alert, Spin, Typography, Space, Empty,
  Tabs, Select, Table, Card, Tooltip,
} from "antd";
import {
  SearchOutlined, RobotOutlined, RiseOutlined, FallOutlined, TeamOutlined,
  UserOutlined, ProjectOutlined, ReloadOutlined, ExperimentOutlined,
  DashboardOutlined, ThunderboltOutlined, CheckCircleFilled,
  BulbOutlined, FireOutlined, LineChartOutlined, CoffeeOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useDashboardSummary, useTrainModel, useAnalyserEnseignant,
  useGapHeatmap, useRiskEvolution, useModelPerformance,
  useOverview, useDemandForecast,
} from "@/hooks/analyse/useAnalysePredictive";
import type { AnalyseData, DecliningCompetency, InDemandCompetency, TeacherRiskIndicator } from "@/models/analyse";
import DashboardKpis from "@/components/charts/DashboardKpis";
import RiskTable from "@/components/charts/RiskTable";
import GapTable from "@/components/charts/GapTable";
import ProfileCard from "@/components/charts/ProfileCard";
import PathTimeline from "@/components/charts/PathTimeline";
import EnseignantSelect from "@/components/charts/EnseignantSelect";
import ModelStatusBadge from "@/components/charts/ModelStatusBadge";
import GapHeatmap from "@/components/charts/GapHeatmap";
import TrendLineChart from "@/components/charts/TrendLineChart";
import OverviewKpiTiles from "@/components/charts/OverviewKpiTiles";
import DemandForecastChart from "@/components/charts/DemandForecastChart";
import InactiveTeachersCard from "@/components/charts/InactiveTeachersCard";
import "@/styles/pages/analyse-predictive-page.css";

const { Title, Text } = Typography;
const { Option } = Select;

const normalizeRole = (v: unknown): string =>
  String(v || "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");

interface AnalyseSectionTitleProps {
  readonly icon: React.ReactNode;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly title: string;
  readonly subtitle?: string;
}

function AnalyseSectionTitle({ icon, iconColor, iconBg, title, subtitle }: AnalyseSectionTitleProps) {
  return (
    <div className="analyse-section-title">
      <span className="analyse-section-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </span>
      <div>
        <div className="analyse-section-text">{title}</div>
        {subtitle && <span className="analyse-section-sub">{subtitle}</span>}
      </div>
      <div className="analyse-section-line" />
    </div>
  );
}

export default function AnalysePredictivePage() {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isAdmin = role === "admin";

  const { data: dashboardDataRaw, isLoading: dashLoading, refetch: refetchDashboard } = useDashboardSummary();
  const dashboardData = dashboardDataRaw as
    | {
        declining_competencies?: DecliningCompetency[];
        in_demand_competencies?: InDemandCompetency[];
        teacher_risk_indicators?: TeacherRiskIndicator[];
      }
    | undefined;
  const trainModelMutation = useTrainModel();
  const analyserEnseignantMutation = useAnalyserEnseignant();
  const { data: gapHeatmap = [] } = useGapHeatmap();
  const { data: riskEvolution = [] } = useRiskEvolution(6);
  const { data: modelPerf } = useModelPerformance();
  const { data: overview, isLoading: overviewLoading } = useOverview();
  const { data: demandForecast } = useDemandForecast(6);
  const [riskThreshold, setRiskThreshold] = useState<number>(0.7);
  const [modelStatusKey, setModelStatusKey] = useState<number>(0);

  const [enseignantId, setEnseignantId] = useState<string>("");
  const [competenceCible, setCompetenceCible] = useState<string>("");
  const [analyseData, setAnalyseData] = useState<AnalyseData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  async function handleTrainModel() {
    setLoading(true);
    try {
      const result = (await trainModelMutation.mutateAsync()) as {
        status?: string;
        message?: string;
        hint?: string;
        metrics?: { cv_rmse?: number; test_r2?: number };
      };
      if (result.status === "trained") {
        message.success(`Modèle entraîné ! RMSE: ${result.metrics?.cv_rmse || "N/A"}, R²: ${result.metrics?.test_r2 || "N/A"}`);
      } else if (result.status === "no_data") {
        message.warning(result.message || "Aucune donnée disponible pour entraîner le modèle.");
      } else if (result.status === "insufficient_data") {
        message.warning(result.message || "Données insuffisantes. " + (result.hint || ""));
      } else {
        message.info("Statut: " + result.status);
      }
      setModelStatusKey((k) => k + 1);
    } catch {
      message.error("Erreur lors de l'entraînement du modèle. Vérifiez que le service est accessible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyserEnseignant(idOverride?: string) {
    const id = (idOverride ?? enseignantId).trim();
    if (!id) return;
    if (idOverride) setEnseignantId(id);
    setLoading(true); setError(null);
    try {
      const data = await analyserEnseignantMutation.mutateAsync({
        enseignantId: id,
        competenceCible: competenceCible.trim() || undefined,
        autoTrain: isAdmin,
      });
      setAnalyseData(data);
      setActiveTab("individual");
    } catch (err: unknown) {
      const errMsg = (err as { message?: string })?.message || String(err);
      if (errMsg.includes("entraîné") || errMsg.includes("modèle") || errMsg.includes("503")) {
        setError(
          isAdmin
            ? "Le modèle prédictif n'est pas encore entraîné. Cliquez sur 'Ré-entraîner le modèle' ci-dessus pour l'activer, puis relancez l'analyse."
            : "Le modèle prédictif n'est pas encore entraîné. Demandez à un administrateur de lancer l'entraînement."
        );
      } else {
        setError("Impossible de récupérer l'analyse. Vérifiez l'ID et réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyzeFromTable(teacherId: string) {
    setCompetenceCible("");
    handleAnalyserEnseignant(teacherId);
  }

  const declineColumns = useMemo(() => [
    { title: "Compétence", dataIndex: "competency_name", render: (v: string) => <Text strong>{v}</Text> },
    { title: "Domaine", dataIndex: "domaine_name", render: (v: string) => <Tag color="default">{v || "—"}</Tag> },
    { title: "Demande 3M", dataIndex: "demand_3m", align: "center" as const },
    { title: "Demande 12M", dataIndex: "demand_12m", align: "center" as const },
  ], []);

  const inDemandColumns = useMemo(() => [
    { title: "Compétence", dataIndex: "competency_name", render: (v: string) => <Text strong>{v}</Text> },
    {
      title: "Tendance",
      dataIndex: "trend",
      render: (v: string) => (
        <Tag color={v === "increasing" ? "green" : "blue"}>
          {v === "increasing" ? "↑ Croissante" : "→ Stable"}
        </Tag>
      ),
    },
    { title: "3M", dataIndex: "demand_3m", align: "center" as const },
    { title: "12M", dataIndex: "demand_12m", align: "center" as const },
  ], []);

  // Determine model status (best-effort from status badge component)
  const modelStatusVariant: "ok" | "warn" | "error" | "idle" = useMemo(() => {
    if (!modelPerf) return "idle";
    if (modelPerf.last_retrain_status === "success") return "ok";
    if (modelPerf.last_retrain_status === "failed") return "error";
    return "warn";
  }, [modelPerf]);

  const tabItems = [
    {
      key: "dashboard",
      label: (
        <span>
          <DashboardOutlined style={{ marginRight: 6 }} />
          Dashboard Prédictif
        </span>
      ),
      children: (
        <Spin spinning={dashLoading}>
          <OverviewKpiTiles data={overview} loading={overviewLoading} />

          <DashboardKpis
            declining={dashboardData?.declining_competencies || []}
            inDemand={dashboardData?.in_demand_competencies || []}
            riskIndicators={dashboardData?.teacher_risk_indicators || []}
            riskThreshold={riskThreshold}
          />

          <AnalyseSectionTitle
            icon={<FireOutlined />}
            iconColor="#ef4444"
            iconBg="#fef2f2"
            title="Indicateurs de Risque par Enseignant"
            subtitle="Score de risque d'attrition et signaux faibles"
          />
          <div className="analyse-block">
            <Card
              variant="borderless"
              title={<span><TeamOutlined /> Enseignants à risque</span>}
              extra={
                <Space>
                  <Select value={riskThreshold} onChange={setRiskThreshold} style={{ width: 150 }} size="small">
                    <Option value={0.5}>Seuil: 50%</Option>
                    <Option value={0.7}>Seuil: 70%</Option>
                    <Option value={0.8}>Seuil: 80%</Option>
                  </Select>
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => refetchDashboard()}>
                    Rafraîchir
                  </Button>
                </Space>
              }
            >
              <RiskTable
                data={dashboardData?.teacher_risk_indicators || []}
                threshold={riskThreshold}
                onAnalyze={handleAnalyzeFromTable}
              />
            </Card>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <AnalyseSectionTitle
                icon={<FallOutlined />}
                iconColor="#ef4444"
                iconBg="#fef2f2"
                title="Compétences en Déclin"
              />
              <div className="analyse-block">
                <Card variant="borderless" title={<span><FallOutlined /> Détail des compétences en déclin</span>}>
                  {(dashboardData?.declining_competencies || []).length > 0 ? (
                    <Table
                      dataSource={dashboardData?.declining_competencies || []}
                      rowKey="competency_id"
                      pagination={false}
                      size="small"
                      columns={declineColumns}
                    />
                  ) : (
                    <Empty description="Aucune compétence en déclin détectée" />
                  )}
                </Card>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <AnalyseSectionTitle
                icon={<RiseOutlined />}
                iconColor="#10b981"
                iconBg="#ecfdf5"
                title="Compétences en Forte Demande"
              />
              <div className="analyse-block">
                <Card variant="borderless" title={<span><RiseOutlined /> Détail des compétences demandées</span>}>
                  {(dashboardData?.in_demand_competencies || []).length > 0 ? (
                    <Table
                      dataSource={dashboardData?.in_demand_competencies || []}
                      rowKey="competency_id"
                      pagination={false}
                      size="small"
                      columns={inDemandColumns}
                    />
                  ) : (
                    <Empty description="Aucune donnée de demande" />
                  )}
                </Card>
              </div>
            </Col>
          </Row>

          <AnalyseSectionTitle
            icon={<DashboardOutlined />}
            iconColor="#b51200"
            iconBg="#fff0ee"
            title="Heatmap des Gaps"
            subtitle="Département × Compétence"
          />
          <div className="analyse-block">
            <Card
              variant="borderless"
              title={<span><DashboardOutlined /> Cartographie des écarts</span>}
              extra={<Text type="secondary">Gap moyen (0–5) — plus c'est rouge, plus l'écart est fort</Text>}
            >
              <GapHeatmap data={gapHeatmap} />
            </Card>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <AnalyseSectionTitle
                icon={<LineChartOutlined />}
                iconColor="#b51200"
                iconBg="#fff0ee"
                title="Prévision de la Demande de Formation"
                subtitle="Historique des gaps détectés + projection (EWMA + tendance)"
              />
              <div className="analyse-block">
                <Card variant="borderless" title={<span><LineChartOutlined /> Tendance &amp; projection</span>}>
                  <DemandForecastChart data={demandForecast} />
                </Card>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <AnalyseSectionTitle
                icon={<CoffeeOutlined />}
                iconColor="#f59e0b"
                iconBg="#fffbeb"
                title="Enseignants Inactifs"
                subtitle="Sans formation depuis longtemps"
              />
              <div className="analyse-block">
                <Card variant="borderless" title={<span><CoffeeOutlined /> Risque de décrochage</span>}>
                  <InactiveTeachersCard mois={6} limit={5} />
                </Card>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <AnalyseSectionTitle
                icon={<RiseOutlined />}
                iconColor="#00b4d8"
                iconBg="#e6f9fd"
                title="Évolution Mensuelle du Risque"
                subtitle="Tendance sur 6 mois"
              />
              <div className="analyse-block">
                <Card variant="borderless" title={<span><RiseOutlined /> Tendance du risque</span>}>
                  <TrendLineChart data={riskEvolution} />
                </Card>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <AnalyseSectionTitle
                icon={<ExperimentOutlined />}
                iconColor="#b51200"
                iconBg="#fff0ee"
                title="Performance du Modèle"
              />
              <div className="analyse-block">
                <Card variant="borderless" title={<span><ExperimentOutlined /> Métriques ML</span>}>
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Précision (R²) — modèle de gaps</Text>
                      <div style={{ marginTop: 4 }}>
                        <Title level={2} style={{ margin: 0, color: "#b51200" }}>
                          {modelPerf?.gap_model_accuracy == null ? "—" : modelPerf.gap_model_accuracy.toFixed(2)}
                        </Title>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Proba. de réussite moyenne (recommandations)</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text strong style={{ fontSize: 20, color: "#10b981" }}>
                          {modelPerf?.recommendation_avg_proba == null
                            ? "—"
                            : `${(modelPerf.recommendation_avg_proba * 100).toFixed(0)}%`}
                        </Text>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Dernier ré-entraînement</Text>
                      <div style={{ marginTop: 4 }}>
                        <Tag color={modelPerf?.last_retrain_status === "success" ? "green" : "default"}>
                          {modelPerf?.last_retrained
                            ? new Date(modelPerf.last_retrained).toLocaleString()
                            : "Jamais"}
                        </Tag>
                      </div>
                    </div>
                  </Space>
                </Card>
              </div>
            </Col>
          </Row>
        </Spin>
      ),
    },
    {
      key: "individual",
      label: (
        <span>
          <UserOutlined style={{ marginRight: 6 }} />
          Analyse Individuelle
        </span>
      ),
      children: (
        <AnimatePresence mode="wait">
          {analyseData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key="result">
              <Row gutter={[20, 20]}>
                <Col xs={24} lg={16}>
                  <AnalyseSectionTitle
                    icon={<FallOutlined />}
                    iconColor="#ef4444"
                    iconBg="#fef2f2"
                    title="Gaps de Compétences Prédits"
                  />
                  <div className="analyse-block">
                    <Card
                      variant="borderless"
                      title={<span><FallOutlined /> Écarts prédits par l'IA</span>}
                      extra={<Tag color="blue">{analyseData.gaps.length} gaps</Tag>}
                    >
                      <GapTable data={analyseData.gaps} />
                    </Card>
                  </div>
                </Col>
                <Col xs={24} lg={8}>
                  <AnalyseSectionTitle
                    icon={<UserOutlined />}
                    iconColor="#b51200"
                    iconBg="#fff0ee"
                    title="Profil de l'enseignant"
                  />
                  <div className="analyse-block">
                    <ProfileCard data={analyseData} />
                  </div>
                </Col>
                <Col xs={24}>
                  <AnalyseSectionTitle
                    icon={<BulbOutlined />}
                    iconColor="#10b981"
                    iconBg="#ecfdf5"
                    title="Parcours Recommandé"
                    subtitle="Formations suggérées par l'IA pour combler les gaps"
                  />
                  <div className="analyse-block">
                    <Card variant="borderless" title={<span><RiseOutlined /> Plan de formation personnalisé</span>}>
                      <PathTimeline steps={analyseData.recommandationsFormations} />
                    </Card>
                  </div>
                </Col>
              </Row>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="empty">
              <div className="analyse-empty-state">
                <div className="analyse-empty-icon" aria-hidden="true">
                  <RobotOutlined />
                </div>
                <div className="analyse-empty-title">Prêt pour l'analyse</div>
                <div className="analyse-empty-desc">
                  Sélectionnez un enseignant et une compétence cible ci-dessus pour générer
                  une analyse prédictive alimentée par l'IA.
                </div>
                <div className="analyse-empty-hint">
                  <ThunderboltOutlined style={{ color: "#b51200" }} />
                  Les résultats apparaîtront ici en quelques secondes
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ),
    },
  ];

  return (
    <div className="analyse-container">
      {/* ── Hero header ──────────────────────────────────────────────── */}
      <section className="analyse-hero" aria-label="En-tête Intelligence Prédictive">
        <div className="analyse-hero-row">
          <div className="analyse-hero-icon" aria-hidden="true">
            <RobotOutlined />
          </div>
          <div>
            <h1 className="analyse-hero-title">
              Intelligence Prédictive
            </h1>
            <span className="analyse-hero-subtitle">
              Anticipez les besoins en compétences et optimisez les parcours de formation
            </span>
          </div>
          <div className="analyse-hero-spacer" />
          <div className="analyse-hero-actions">
            <div className="analyse-hero-status" aria-live="polite">
              <span className={`dot ${modelStatusVariant === "ok" ? "" : modelStatusVariant}`} />
              <span>Modèle {modelStatusVariant === "ok" ? "actif" : modelStatusVariant === "error" ? "en erreur" : modelStatusVariant === "warn" ? "à entraîner" : "inactif"}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <ModelStatusBadge refreshKey={modelStatusKey} />
            </div>
            {isAdmin && (
              <Tooltip title="Ré-entraîner le modèle ML">
                <Button
                  type="primary"
                  icon={<ExperimentOutlined />}
                  onClick={handleTrainModel}
                  loading={loading}
                >
                  Ré-entraîner le modèle
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Rafraîchir les données">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetchDashboard()}
                loading={dashLoading}
              >
                Rafraîchir
              </Button>
            </Tooltip>
          </div>
        </div>
      </section>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 12 }}
          onClose={() => setError(null)}
        />
      )}

      {/* ── Analyse form (search) ─────────────────────────────────────── */}
      <div className="analyse-search">
        <div className="analyse-search-title">
          <ThunderboltOutlined /> Lancer une analyse individuelle
        </div>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={9}>
            <div style={{ marginBottom: 6 }}><Text strong>Enseignant</Text></div>
            <EnseignantSelect
              value={enseignantId}
              onChange={setEnseignantId}
              teachers={dashboardData?.teacher_risk_indicators || []}
              loading={dashLoading}
            />
          </Col>
          <Col xs={24} md={9}>
            <div style={{ marginBottom: 6 }}><Text strong>Compétence cible (optionnel)</Text></div>
            <Input
              size="large"
              placeholder="Ex: C42 (IA & Big Data)"
              value={competenceCible}
              onChange={(e) => setCompetenceCible(e.target.value)}
              prefix={<ProjectOutlined style={{ color: "#b51200" }} />}
              style={{ borderRadius: 10 }}
              onPressEnter={() => handleAnalyserEnseignant()}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button
              type="primary"
              size="large"
              block
              className="analyse-search-btn"
              icon={<SearchOutlined />}
              onClick={() => handleAnalyserEnseignant()}
              loading={loading}
              disabled={!enseignantId}
            >
              Analyser
            </Button>
          </Col>
        </Row>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="analyse-tabs"
      />
    </div>
  );
}
