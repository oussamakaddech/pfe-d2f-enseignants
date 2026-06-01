import { useState, useMemo } from "react";
import {
  Card, Input, Button, Tag, Row, Col, Alert, Spin, Typography, Space, Empty,
  Tabs, Select, Table,
} from "antd";
import {
  SearchOutlined, RobotOutlined, RiseOutlined, FallOutlined, TeamOutlined,
  UserOutlined, ProjectOutlined, ReloadOutlined, ExperimentOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useDashboardSummary, useTrainModel, useAnalyserEnseignant,
  useGapHeatmap, useRiskEvolution, useModelPerformance,
} from "@/hooks/analyse/useAnalysePredictive";
import type { AnalyseData, DecliningCompetency, InDemandCompetency, TeacherRiskIndicator } from "@/models/analyse"; // NOSONAR
import DashboardKpis from "@/components/charts/DashboardKpis";
import RiskTable from "@/components/charts/RiskTable";
import GapTable from "@/components/charts/GapTable";
import ProfileCard from "@/components/charts/ProfileCard";
import PathTimeline from "@/components/charts/PathTimeline";
import EnseignantSelect from "@/components/charts/EnseignantSelect";
import ModelStatusBadge from "@/components/charts/ModelStatusBadge";
import GapHeatmap from "@/components/charts/GapHeatmap";
import TrendLineChart from "@/components/charts/TrendLineChart";
import "@/styles/pages/analyse-predictive-page.css";
import { AppPageHeader, brand } from "@/components/common";

const { Title, Text } = Typography;
const { Option } = Select;

const normalizeRole = (v: unknown): string =>
  String(v || "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");

export default function AnalysePredictivePage() {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isAdmin = role === "admin";

  // ── Dashboard state ─────────────────────────
  const { data: dashboardData, isLoading: dashLoading, refetch: refetchDashboard } = useDashboardSummary();
  const trainModelMutation = useTrainModel();
  const analyserEnseignantMutation = useAnalyserEnseignant();
  const { data: gapHeatmap = [] } = useGapHeatmap();
  const { data: riskEvolution = [] } = useRiskEvolution(6);
  const { data: modelPerf } = useModelPerformance();
  const [riskThreshold, setRiskThreshold] = useState<number>(0.7);
  const [modelStatusKey, setModelStatusKey] = useState<number>(0);

  // ── Individual analysis state ───────────────
  const [enseignantId, setEnseignantId] = useState<string>("");
  const [competenceCible, setCompetenceCible] = useState<string>("");
  const [analyseData, setAnalyseData] = useState<AnalyseData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  async function handleTrainModel() {
    setLoading(true);
    try {
      const result = await trainModelMutation.mutateAsync();
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

  // Quand l'utilisateur clique sur l'icône "éclair" d'une ligne de la table risque
  function handleAnalyzeFromTable(teacherId: string) {
    setCompetenceCible("");
    handleAnalyserEnseignant(teacherId);
  }

  const declineColumns = useMemo(() => [
    { title: "Compétence", dataIndex: "competency_name", render: (v: string) => <Text strong>{v}</Text> },
    { title: "Domaine", dataIndex: "domaine_name", render: (v: string) => <Tag>{v || "—"}</Tag> },
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

  const tabItems = [
    {
      key: "dashboard",
      label: <span><DashboardOutlined /> Dashboard Prédictif</span>,
      children: (
        <Spin spinning={dashLoading}>
            <DashboardKpis
            declining={dashboardData?.declining_competencies || []}
            inDemand={dashboardData?.in_demand_competencies || []}
            riskIndicators={dashboardData?.teacher_risk_indicators || []}
            riskThreshold={riskThreshold}
          />

          <Card
            title={<span><TeamOutlined /> Indicateurs de Risque par Enseignant</span>}
            className="analyse-card"
            style={{ marginBottom: 24 }}
            extra={
              <Space>
                <Select value={riskThreshold} onChange={setRiskThreshold} style={{ width: 140 }} size="small">
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

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={12}>
              <Card title={<span><FallOutlined /> Compétences en Déclin</span>} className="analyse-card">
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
            </Col>
            <Col xs={24} lg={12}>
              <Card title={<span><RiseOutlined /> Compétences en Forte Demande</span>} className="analyse-card">
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
            </Col>
          </Row>

          <Card
            title={<span><DashboardOutlined /> Heatmap des Gaps · Département × Compétence</span>}
            className="analyse-card"
            style={{ marginTop: 24 }}
            extra={<Text type="secondary">Gap moyen (0–5) — plus c'est rouge, plus l'écart collectif est fort</Text>}
          >
            <GapHeatmap data={gapHeatmap} />
          </Card>

          <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={16}>
              <Card title={<span><RiseOutlined /> Évolution Mensuelle du Risque</span>} className="analyse-card">
                <TrendLineChart data={riskEvolution} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<span><ExperimentOutlined /> Performance du Modèle</span>} className="analyse-card">
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <div>
                    <Text type="secondary">Précision (R²) du modèle de gaps</Text>
                    <div><Title level={3} style={{ margin: 0 }}>
                      {modelPerf?.gap_model_accuracy == null ? "—" : modelPerf.gap_model_accuracy.toFixed(2)}
                    </Title></div>
                  </div>
                  <div>
                    <Text type="secondary">Proba. de réussite moyenne (reco)</Text>
                    <div><Text strong>
                      {modelPerf?.recommendation_avg_proba == null
                        ? "—" : `${(modelPerf.recommendation_avg_proba * 100).toFixed(0)}%`}
                    </Text></div>
                  </div>
                  <div>
                    <Text type="secondary">Dernier ré-entraînement</Text>
                    <div>
                      <Tag color={modelPerf?.last_retrain_status === "success" ? "green" : "default"}>
                        {modelPerf?.last_retrained
                          ? new Date(modelPerf.last_retrained).toLocaleString()
                          : "Jamais"}
                      </Tag>
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Spin>
      ),
    },
    {
      key: "individual",
      label: <span><UserOutlined /> Analyse Individuelle</span>,
      children: (
        <AnimatePresence mode="wait">
          {analyseData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key="result">
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <Card
                    title={<span><FallOutlined /> Gaps de Compétences Prédits</span>}
                    className="analyse-card"
                    extra={<Tag color="blue">{analyseData.gaps.length} gaps</Tag>}
                  >
                    <GapTable data={analyseData.gaps} />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <ProfileCard data={analyseData} />
                </Col>
                <Col xs={24}>
                  <Card title={<span><RiseOutlined /> Parcours Recommandé</span>} className="analyse-card">
                    <PathTimeline steps={analyseData.recommandationsFormations} />
                  </Card>
                </Col>
              </Row>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="empty">
              <div style={{ textAlign: "center", padding: "80px 0", background: "white", borderRadius: 20 }}>
                <Empty
                  image={<RobotOutlined style={{ fontSize: 56, color: "#e2e8f0" }} />}
                  description={
                    <div style={{ marginTop: 20 }}>
                      <Title level={4} type="secondary">Prêt pour l'analyse</Title>
                      <Text type="secondary">Utilisez les filtres ci-dessus pour lancer une analyse individuelle.</Text>
                    </div>
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ),
    },
  ];

  return (
    <div className="analyse-container">
      <AppPageHeader
        icon={<RobotOutlined />}
        title="Intelligence Prédictive"
        subtitle="Anticipez les besoins en compétences et optimisez les parcours de formation"
        actions={
          <Space>
            <ModelStatusBadge refreshKey={modelStatusKey} />
            {isAdmin && (
              <Button icon={<ExperimentOutlined />} onClick={handleTrainModel} loading={loading}>
                Ré-entraîner le modèle
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => refetchDashboard()} loading={dashLoading}>
              Rafraîchir
            </Button>
          </Space>
        }
      />

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

      <Card className="analyse-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
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
              prefix={<ProjectOutlined style={{ color: "#B51200" }} />}
              style={{ borderRadius: 10 }}
              onPressEnter={() => handleAnalyserEnseignant()}
            />
          </Col>
          <Col xs={24} md={6}>
            <div style={{ height: 28 }} />
            <Button
              type="primary"
              size="large"
              block
              icon={<SearchOutlined />}
              onClick={() => handleAnalyserEnseignant()}
              loading={loading}
              disabled={!enseignantId}
              style={{ height: 48, borderRadius: 12, backgroundColor: brand[600], borderColor: brand[600] }}
            >
              Analyser
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="analyse-tabs" />
    </div>
  );
}
