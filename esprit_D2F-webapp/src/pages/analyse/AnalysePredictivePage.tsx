import { useState, useEffect, useContext, useMemo } from "react";
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
import { AuthContext } from "@/components/common/AuthProvider";
import AnalysePredictiveService, {
  AnalyseData,
  DecliningCompetency,
  InDemandCompetency,
  TeacherRiskIndicator,
} from "@/services/analyse/AnalysePredictiveService";
import DashboardKpis from "@/components/charts/DashboardKpis";
import RiskTable from "@/components/charts/RiskTable";
import GapTable from "@/components/charts/GapTable";
import ProfileCard from "@/components/charts/ProfileCard";
import PathTimeline from "@/components/charts/PathTimeline";
import EnseignantSelect from "@/components/charts/EnseignantSelect";
import ModelStatusBadge from "@/components/charts/ModelStatusBadge";
import "@/styles/pages/analyse-predictive-page.css";
import { AppPageHeader, brand } from "@/components/common";

const { Title, Text } = Typography;
const { Option } = Select;

const normalizeRole = (v: unknown): string =>
  String(v || "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");

export default function AnalysePredictivePage() {
  const { message } = useAppNotification();
  const { user } = useContext(AuthContext) as { user: { role?: string } | null };
  const role = normalizeRole(user?.role);
  const isAdmin = role === "admin";

  // ── Dashboard state ─────────────────────────
  const [dashLoading, setDashLoading] = useState<boolean>(false);
  const [declining, setDeclining] = useState<DecliningCompetency[]>([]);
  const [inDemand, setInDemand] = useState<InDemandCompetency[]>([]);
  const [riskIndicators, setRiskIndicators] = useState<TeacherRiskIndicator[]>([]);
  const [riskThreshold, setRiskThreshold] = useState<number>(0.7);
  const [modelStatusKey, setModelStatusKey] = useState<number>(0);

  // ── Individual analysis state ───────────────
  const [enseignantId, setEnseignantId] = useState<string>("");
  const [competenceCible, setCompetenceCible] = useState<string>("");
  const [analyseData, setAnalyseData] = useState<AnalyseData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setDashLoading(true);
    try {
      const data = await AnalysePredictiveService.getDashboardSummary();
      setDeclining(data.declining_competencies || []);
      setInDemand(data.in_demand_competencies || []);
      setRiskIndicators(data.teacher_risk_indicators || []);
    } catch {
      // using empty state as fallback
    } finally {
      setDashLoading(false);
    }
  }

  async function handleTrainModel() {
    setLoading(true);
    try {
      const result = await AnalysePredictiveService.trainModel();
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
      const data = await AnalysePredictiveService.analyserEnseignant(
        id,
        competenceCible.trim() || undefined,
        { autoTrain: isAdmin },
      );
      setAnalyseData(data);
      setActiveTab("individual");
    } catch (err) {
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
            declining={declining}
            inDemand={inDemand}
            riskIndicators={riskIndicators}
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
                <Button size="small" icon={<ReloadOutlined />} onClick={loadDashboard}>
                  Rafraîchir
                </Button>
              </Space>
            }
          >
            <RiskTable
              data={riskIndicators}
              threshold={riskThreshold}
              onAnalyze={handleAnalyzeFromTable}
            />
          </Card>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={12}>
              <Card title={<span><FallOutlined /> Compétences en Déclin</span>} className="analyse-card">
                {declining.length > 0 ? (
                  <Table
                    dataSource={declining}
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
                {inDemand.length > 0 ? (
                  <Table
                    dataSource={inDemand}
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
            <Button icon={<ReloadOutlined />} onClick={loadDashboard} loading={dashLoading}>
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
              teachers={riskIndicators}
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
