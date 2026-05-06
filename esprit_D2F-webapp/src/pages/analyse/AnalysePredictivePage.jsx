import { useState, useEffect, useContext } from "react";
import {
  Card, Input, Button, Table, Tag, Statistic, Row, Col, Alert, Spin, Progress,
  Typography, Tooltip, Space, Empty, Avatar, Divider, Select, Tabs, Badge, message,
} from "antd";
import {
  SearchOutlined, RobotOutlined, WarningOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, ThunderboltOutlined, UserOutlined, ProjectOutlined, BulbOutlined,
  HistoryOutlined, ReloadOutlined, ExperimentOutlined, SafetyCertificateOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../../context/AuthContext";
import AnalysePredictiveService from "../../services/AnalysePredictiveService";
import "./AnalysePredictivePage.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const graviteColors = { elevee: "#ef4444", moyenne: "#f59e0b", faible: "#10b981" };
const riskColor = (s) => s >= 0.7 ? "#ef4444" : s >= 0.4 ? "#f59e0b" : "#10b981";
const normalizeRole = (v) => String(v || "").toLowerCase().replace(/[\s_-]+/g, "");

export default function AnalysePredictivePage() {
  const { user } = useContext(AuthContext);
  const role = normalizeRole(user?.role);
  const isAdmin = role === "admin";

  // ── Dashboard state ─────────────────────────
  const [dashLoading, setDashLoading] = useState(false);
  const [declining, setDeclining] = useState([]);
  const [inDemand, setInDemand] = useState([]);
  const [riskIndicators, setRiskIndicators] = useState([]);
  const [atRiskTeachers, setAtRiskTeachers] = useState(null);
  const [riskThreshold, setRiskThreshold] = useState(0.7);

  // ── Individual analysis state ───────────────
  const [enseignantId, setEnseignantId] = useState("");
  const [competenceCible, setCompetenceCible] = useState("");
  const [analyseData, setAnalyseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Load dashboard on mount ─────────────────
  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setDashLoading(true);
    try {
      const data = await AnalysePredictiveService.getDashboardSummary();
      setDeclining(data.declining_competencies || []);
      setInDemand(data.in_demand_competencies || []);
      setRiskIndicators(data.teacher_risk_indicators || []);
    } catch (e) {
      console.warn("Dashboard load failed, using empty state", e);
    } finally {
      setDashLoading(false);
    }
  }

  async function loadAtRiskTeachers() {
    setDashLoading(true);
    try {
      const data = await AnalysePredictiveService.getAtRiskTeachers(riskThreshold);
      setAtRiskTeachers(data);
    } catch (e) {
      message.error("Erreur chargement enseignants à risque");
    } finally {
      setDashLoading(false);
    }
  }

  async function handleTrainModel() {
    setLoading(true);
    try {
      const result = await AnalysePredictiveService.trainModel();
      message.success(`Modèle entraîné ! RMSE: ${result.metrics?.cv_rmse || "N/A"}, R²: ${result.metrics?.test_r2 || "N/A"}`);
    } catch {
      message.error("Erreur lors de l'entraînement du modèle");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyserEnseignant() {
    if (!enseignantId.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await AnalysePredictiveService.analyserEnseignant(enseignantId.trim(), competenceCible.trim() || undefined);
      setAnalyseData(data);
      setActiveTab("individual");
    } catch {
      setError("Impossible de récupérer l'analyse. Vérifiez l'ID et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  // ── Columns ─────────────────────────────────
  const riskColumns = [
    {
      title: "Enseignant", key: "name", render: (_, r) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: riskColor(r.attrition_risk_score) }} />
          <div>
            <Text strong>{r.teacher_name}</Text>
            <br /><Text type="secondary" style={{ fontSize: 11 }}>{r.teacher_id}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Score Risque", dataIndex: "attrition_risk_score", width: 160, sorter: (a, b) => a.attrition_risk_score - b.attrition_risk_score,
      defaultSortOrder: "descend",
      render: (v) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={Math.round(v * 100)} size="small" strokeColor={riskColor(v)} showInfo={false} />
          <Text strong style={{ color: riskColor(v) }}>{(v * 100).toFixed(0)}%</Text>
        </Space>
      ),
    },
    {
      title: "Signaux", dataIndex: "disengagement_signals", render: (signals) => (
        <Space wrap size={4}>
          {(signals || []).map((s, i) => <Tag key={i} color="volcano" style={{ fontSize: 11 }}>{s}</Tag>)}
          {(!signals || signals.length === 0) && <Tag color="green">Aucun signal</Tag>}
        </Space>
      ),
    },
    {
      title: "Stagnation", dataIndex: "competency_stagnation_rate", width: 100, align: "center",
      render: (v) => <Text style={{ color: v > 0.5 ? "#ef4444" : "#64748b" }}>{(v * 100).toFixed(0)}%</Text>,
    },
    {
      title: "Formations", dataIndex: "training_velocity", width: 100, align: "center",
      render: (v) => <Badge count={v || 0} showZero style={{ backgroundColor: v > 3 ? "#10b981" : v > 0 ? "#f59e0b" : "#ef4444" }} />,
    },
    {
      title: "Action", dataIndex: "recommendation", width: 160,
      render: (v) => <Tag color={v === "OK" ? "green" : v?.includes("entretien") ? "red" : "orange"}>{v}</Tag>,
    },
  ];

  const gapColumns = [
    {
      title: "Compétence", key: "label", render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.competenceLabel}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.competenceCode}</Text>
        </Space>
      ),
    },
    {
      title: "Actuel", dataIndex: "niveauActuel", width: 110,
      render: (v) => (<Space direction="vertical" size={0} style={{ width: "100%" }}>
        <Progress percent={(v / 5) * 100} size="small" showInfo={false} strokeColor="#94a3b8" />
        <Text style={{ fontSize: 12 }}>{v}/5</Text>
      </Space>),
    },
    {
      title: "Cible", dataIndex: "niveauCible", width: 110,
      render: (v) => (<Space direction="vertical" size={0} style={{ width: "100%" }}>
        <Progress percent={(v / 5) * 100} size="small" showInfo={false} strokeColor="#B51200" />
        <Text style={{ fontSize: 12 }}>{v}/5</Text>
      </Space>),
    },
    {
      title: "Gap", dataIndex: "gap", width: 80, align: "center",
      render: (v) => <Text strong style={{ color: v >= 1.5 ? "#ef4444" : "#1e293b", fontSize: 16 }}>{v?.toFixed?.(1)}</Text>,
    },
    {
      title: "Gravité", dataIndex: "gravite", width: 110,
      render: (v) => <Tag color={graviteColors[v]} style={{ borderRadius: 12, border: "none" }}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: "Analyse IA", dataIndex: "explication",
      render: (v) => (<Tooltip title={v}><Space><BulbOutlined style={{ color: "#f59e0b" }} /><Text type="secondary" ellipsis style={{ maxWidth: 180 }}>{v}</Text></Space></Tooltip>),
    },
  ];

  // ── KPI cards ───────────────────────────────
  const atRiskCount = riskIndicators.filter((r) => r.attrition_risk_score >= riskThreshold).length;

  const tabItems = [
    {
      key: "dashboard", label: <span><DashboardOutlined /> Dashboard Prédictif</span>,
      children: (
        <Spin spinning={dashLoading}>
          {/* KPI Row */}
          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card className="analyse-glass-card analyse-stat-card" hoverable>
                <Statistic title="Compétences en Déclin" value={declining.length} prefix={<FallOutlined style={{ color: "#ef4444" }} />} valueStyle={{ color: "#ef4444" }} />
                <div style={{ marginTop: 12 }}>
                  {declining.slice(0, 5).map((c, i) => <Tag key={i} color="red" style={{ marginBottom: 4 }}>{c.competency_name}</Tag>)}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="analyse-glass-card analyse-stat-card" hoverable>
                <Statistic title="En Forte Demande" value={inDemand.length} prefix={<RiseOutlined style={{ color: "#10b981" }} />} valueStyle={{ color: "#10b981" }} />
                <div style={{ marginTop: 12 }}>
                  {inDemand.slice(0, 5).map((c, i) => <Tag key={i} color="green" style={{ marginBottom: 4 }}>{c.competency_name}</Tag>)}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="analyse-glass-card analyse-stat-card" hoverable>
                <Statistic title="Enseignants à Risque" value={atRiskCount} prefix={<WarningOutlined style={{ color: "#f59e0b" }} />} valueStyle={{ color: "#f59e0b" }} suffix={`/ ${riskIndicators.length}`} />
                <Progress percent={riskIndicators.length ? Math.round((atRiskCount / riskIndicators.length) * 100) : 0} strokeColor="#f59e0b" style={{ marginTop: 12 }} />
              </Card>
            </Col>
          </Row>

          {/* Risk Table */}
          <Card title={<span><TeamOutlined /> Indicateurs de Risque par Enseignant</span>} className="analyse-glass-card" style={{ marginBottom: 24 }}
            extra={<Space>
              <Select value={riskThreshold} onChange={setRiskThreshold} style={{ width: 140 }} size="small">
                <Option value={0.5}>Seuil: 50%</Option>
                <Option value={0.7}>Seuil: 70%</Option>
                <Option value={0.8}>Seuil: 80%</Option>
              </Select>
              <Button size="small" icon={<ReloadOutlined />} onClick={loadDashboard}>Rafraîchir</Button>
            </Space>}
          >
            <Table dataSource={riskIndicators} columns={riskColumns} rowKey="teacher_id" pagination={{ pageSize: 8 }} size="middle"
              rowClassName={(r) => r.attrition_risk_score >= riskThreshold ? "risk-row-high" : ""} />
          </Card>

          {/* Competency Details */}
          <Row gutter={[20, 20]}>
            <Col xs={24} lg={12}>
              <Card title={<span><FallOutlined /> Compétences en Déclin</span>} className="analyse-glass-card">
                {declining.length > 0 ? (
                  <Table dataSource={declining} rowKey="competency_id" pagination={false} size="small" columns={[
                    { title: "Compétence", dataIndex: "competency_name", render: (v) => <Text strong>{v}</Text> },
                    { title: "Domaine", dataIndex: "domaine_name", render: (v) => <Tag>{v || "—"}</Tag> },
                    { title: "Demande 3M", dataIndex: "demand_3m", align: "center" },
                    { title: "Demande 12M", dataIndex: "demand_12m", align: "center" },
                  ]} />
                ) : <Empty description="Aucune compétence en déclin détectée" />}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title={<span><RiseOutlined /> Compétences en Forte Demande</span>} className="analyse-glass-card">
                {inDemand.length > 0 ? (
                  <Table dataSource={inDemand} rowKey="competency_id" pagination={false} size="small" columns={[
                    { title: "Compétence", dataIndex: "competency_name", render: (v) => <Text strong>{v}</Text> },
                    { title: "Tendance", dataIndex: "trend", render: (v) => <Tag color={v === "increasing" ? "green" : "blue"}>{v === "increasing" ? "↑ Croissante" : "→ Stable"}</Tag> },
                    { title: "3M", dataIndex: "demand_3m", align: "center" },
                    { title: "12M", dataIndex: "demand_12m", align: "center" },
                  ]} />
                ) : <Empty description="Aucune donnée de demande" />}
              </Card>
            </Col>
          </Row>
        </Spin>
      ),
    },
    {
      key: "individual", label: <span><UserOutlined /> Analyse Individuelle</span>,
      children: (
        <AnimatePresence mode="wait">
          {analyseData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key="result">
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <Card title={<span><FallOutlined /> Gaps de Compétences Prédits</span>} className="analyse-glass-card"
                    extra={<Tag color="blue">{analyseData.gaps.length} gaps</Tag>}>
                    <Table dataSource={analyseData.gaps} columns={gapColumns} rowKey="competenceCode" pagination={false} size="middle" />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title={<span><UserOutlined /> Profil</span>} className="analyse-glass-card">
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <Avatar size={72} icon={<UserOutlined />} style={{ backgroundColor: "#f1f5f9", color: "#B51200", marginBottom: 12 }} />
                      <Title level={4} style={{ margin: 0 }}>{analyseData.enseignantId}</Title>
                      <Tag color="cyan" style={{ marginTop: 8 }}>Horizon 6 mois</Tag>
                    </div>
                    <Divider />
                    <Statistic
                      title="Risque Global"
                      value={Math.round((analyseData.overallRiskScore || 0) * 100)}
                      suffix="%"
                      valueStyle={{ color: (analyseData.overallRiskScore || 0) > 0.7 ? "#ef4444" : "#10b981" }}
                    />
                  </Card>
                  <Card title={<span><BulbOutlined /> Insight IA</span>} style={{ marginTop: 20 }} className="analyse-glass-card">
                    <Alert message="Action Recommandée" type={analyseData.gaps.some(g => g.gravite === "elevee") ? "error" : "info"} showIcon
                      description={analyseData.gaps.some(g => g.gravite === "elevee")
                        ? "Gaps critiques détectés. Une mise à niveau urgente est recommandée."
                        : "Profil équilibré. Poursuivez les formations en cours."} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title={<span><RiseOutlined /> Parcours Recommandé</span>} className="analyse-glass-card">
                    {analyseData.recommandationsFormations.length > 0 ? (
                      <div className="reco-timeline">
                        {analyseData.recommandationsFormations.map((step, idx) => (
                          <div key={idx} className="reco-step">
                            <div className="reco-step-number">{step.ordre}</div>
                            <div className="reco-content">
                              <Row justify="space-between" align="middle">
                                <Col><div className="reco-title">{step.titre}</div>
                                  <Space wrap>
                                    {step.competencesCiblees.map(c => <Tag key={c} color="blue">{c}</Tag>)}
                                    <Tag icon={<HistoryOutlined />}>{step.dureeEstimee}</Tag>
                                  </Space>
                                </Col>
                                <Col><div style={{ textAlign: "right" }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>Probabilité réussite</Text>
                                  <Progress percent={Math.round(step.probabiliteReussite * 100)} size="small"
                                    strokeColor={step.probabiliteReussite > 0.8 ? "#10b981" : "#f59e0b"} />
                                </div></Col>
                              </Row>
                              {step.prerequisManquants?.length > 0 && (
                                <Alert type="warning" message={`Prérequis manquants: ${step.prerequisManquants.join(", ")}`}
                                  style={{ marginTop: 8, borderRadius: 6 }} showIcon />
                              )}
                              <div style={{ marginTop: 8, padding: 8, background: "#f8fafc", borderRadius: 6 }}>
                                <Text style={{ fontSize: 13 }}><BulbOutlined style={{ marginRight: 6 }} />{step.justification}</Text>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty description="Spécifiez une compétence cible pour générer un parcours." />
                    )}
                  </Card>
                </Col>
              </Row>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="empty">
              <div style={{ textAlign: "center", padding: "80px 0", background: "white", borderRadius: 20 }}>
                <Empty image={<RobotOutlined style={{ fontSize: 56, color: "#e2e8f0" }} />}
                  description={<div style={{ marginTop: 20 }}><Title level={4} type="secondary">Prêt pour l'analyse</Title>
                    <Text type="secondary">Utilisez les filtres ci-dessus pour lancer une analyse individuelle.</Text></div>} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ),
    },
  ];

  return (
    <div className="analyse-container">
      {/* Header */}
      <div className="analyse-header">
        <Row justify="space-between" align="middle" wrap>
          <Col>
            <Space align="start" size={16}>
              <div style={{ background: "linear-gradient(135deg, #B51200 0%, #D61600 100%)", padding: 12, borderRadius: 16,
                boxShadow: "0 8px 16px rgba(181,18,0,0.2)" }}>
                <RobotOutlined style={{ fontSize: 32, color: "white" }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Intelligence Prédictive</Title>
                <Text type="secondary">Anticipez les besoins en compétences et optimisez les parcours de formation</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              {isAdmin && (
                <Button icon={<ExperimentOutlined />} onClick={handleTrainModel} loading={loading}>Ré-entraîner le modèle</Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={loadDashboard} loading={dashLoading}>Rafraîchir</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {error && <Alert message="Erreur" description={error} type="error" showIcon closable style={{ marginBottom: 24, borderRadius: 12 }} onClose={() => setError(null)} />}

      {/* Search Bar */}
      <Card className="analyse-glass-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={9}>
            <div style={{ marginBottom: 6 }}><Text strong>Enseignant</Text></div>
            <Input size="large" placeholder="ID enseignant (ex: ENS001)" value={enseignantId}
              onChange={(e) => setEnseignantId(e.target.value)} prefix={<UserOutlined style={{ color: "#B51200" }} />}
              style={{ borderRadius: 10 }} onPressEnter={handleAnalyserEnseignant} />
          </Col>
          <Col xs={24} md={9}>
            <div style={{ marginBottom: 6 }}><Text strong>Compétence cible (optionnel)</Text></div>
            <Input size="large" placeholder="Ex: C42 (IA & Big Data)" value={competenceCible}
              onChange={(e) => setCompetenceCible(e.target.value)} prefix={<ProjectOutlined style={{ color: "#B51200" }} />}
              style={{ borderRadius: 10 }} onPressEnter={handleAnalyserEnseignant} />
          </Col>
          <Col xs={24} md={6}>
            <div style={{ height: 28 }} />
            <Button type="primary" size="large" block icon={<SearchOutlined />} onClick={handleAnalyserEnseignant}
              loading={loading} style={{ height: 48, borderRadius: 12, backgroundColor: "#1e293b", borderColor: "#1e293b" }}>
              Analyser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="analyse-tabs" />
    </div>
  );
}