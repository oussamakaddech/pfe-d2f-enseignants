import { useState, useEffect, useContext } from "react";
import {
  Card, Input, Button, Table, Tag, Statistic, Row, Col, Alert, Spin, Progress,
  Typography, Tooltip, Space, Empty, Avatar, Divider, Select, Tabs, Badge, Descriptions,
} from "antd";
import {
  SearchOutlined, RobotOutlined, WarningOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, ThunderboltOutlined, UserOutlined, ProjectOutlined, BulbOutlined,
  HistoryOutlined, ReloadOutlined, ExperimentOutlined, SafetyCertificateOutlined,
  DashboardOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import useAppNotification from "../../hooks/useAppNotification";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../../context/AuthContext";
import AnalysePredictiveService from "../../services/AnalysePredictiveService";
import { D2FPageHeader, D2FSection, D2FDataCard } from "../../components/ui";
import { brand, neutral, radius, shadow } from "../../theme/tokens";
import "./AnalysePredictivePage.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const graviteColors: Record<string, string> = { elevee: "#ef4444", moyenne: "#f59e0b", faible: "#10b981" };
const riskColor = (s: number) => s >= 0.7 ? "#ef4444" : s >= 0.4 ? "#f59e0b" : "#10b981";
const normalizeRole = (v: string) => String(v || "").toLowerCase().replace(/^role_?/, "").replace(/[\s_-]+/g, "");

export default function AnalysePredictivePage() {
  const { message } = useAppNotification();
  const { user } = useContext(AuthContext) || { user: null };
  const role = normalizeRole(user?.role || "");
  const isAdmin = role === "admin";

  const [dashLoading, setDashLoading] = useState(false);
  const [declining, setDeclining] = useState<any[]>([]);
  const [inDemand, setInDemand] = useState<any[]>([]);
  const [riskIndicators, setRiskIndicators] = useState<any[]>([]);
  const [atRiskTeachers, setAtRiskTeachers] = useState<any>(null);
  const [riskThreshold, setRiskThreshold] = useState(0.7);

  const [enseignantId, setEnseignantId] = useState("");
  const [competenceCible, setCompetenceCible] = useState("");
  const [analyseData, setAnalyseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const atRiskCount = riskIndicators.filter((r) => r.attrition_risk_score >= riskThreshold).length;

  const riskColumns = [
    {
      title: "Enseignant", key: "name", render: (_: any, r: any) => (
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
      title: "Score Risque", dataIndex: "attrition_risk_score", width: 160, sorter: (a: any, b: any) => a.attrition_risk_score - b.attrition_risk_score,
      defaultSortOrder: "descend" as const,
      render: (v: number) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={Math.round(v * 100)} size="small" strokeColor={riskColor(v)} showInfo={false} />
          <Text strong style={{ color: riskColor(v) }}>{(v * 100).toFixed(0)}%</Text>
        </Space>
      ),
    },
    {
      title: "Signaux", dataIndex: "disengagement_signals", render: (signals: string[]) => (
        <Space wrap size={4}>
          {(signals || []).map((s, i) => <Tag key={i} color="volcano" style={{ fontSize: 11 }}>{s}</Tag>)}
          {(!signals || signals.length === 0) && <Tag color="green">Aucun signal</Tag>}
        </Space>
      ),
    },
    {
      title: "Stagnation", dataIndex: "competency_stagnation_rate", width: 100, align: "center" as const,
      render: (v: number) => <Text style={{ color: v > 0.5 ? "#ef4444" : "#64748b" }}>{(v * 100).toFixed(0)}%</Text>,
    },
    {
      title: "Formations", dataIndex: "training_velocity", width: 100, align: "center" as const,
      render: (v: number) => <Badge count={v || 0} showZero style={{ backgroundColor: v > 3 ? "#10b981" : v > 0 ? "#f59e0b" : "#ef4444" }} />,
    },
    {
      title: "Action", dataIndex: "recommendation", width: 160,
      render: (v: string) => <Tag color={v === "OK" ? "green" : v?.includes("entretien") ? "red" : "orange"}>{v}</Tag>,
    },
  ];

  const gapColumns = [
    {
      title: "Compétence", key: "label", render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.competenceLabel}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.competenceCode}</Text>
        </Space>
      ),
    },
    {
      title: "Actuel", dataIndex: "niveauActuel", width: 110,
      render: (v: number) => (<Space direction="vertical" size={0} style={{ width: "100%" }}>
        <Progress percent={(v / 5) * 100} size="small" showInfo={false} strokeColor="#94a3b8" />
        <Text style={{ fontSize: 12 }}>{v}/5</Text>
      </Space>),
    },
    {
      title: "Cible", dataIndex: "niveauCible", width: 110,
      render: (v: number) => (<Space direction="vertical" size={0} style={{ width: "100%" }}>
        <Progress percent={(v / 5) * 100} size="small" showInfo={false} strokeColor={brand[500]} />
        <Text style={{ fontSize: 12 }}>{v}/5</Text>
      </Space>),
    },
    {
      title: "Gap", dataIndex: "gap", width: 80, align: "center" as const,
      render: (v: number) => <Text strong style={{ color: v >= 1.5 ? "#ef4444" : "#1e293b", fontSize: 16 }}>{v?.toFixed?.(1)}</Text>,
    },
    {
      title: "Gravité", dataIndex: "gravite", width: 110,
      render: (v: string) => <Tag color={graviteColors[v]} style={{ borderRadius: 12, border: "none" }}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: "Analyse IA", dataIndex: "explication",
      render: (v: string) => (<Tooltip title={v}><Space><BulbOutlined style={{ color: "#f59e0b" }} /><Text type="secondary" ellipsis style={{ maxWidth: 180 }}>{v}</Text></Space></Tooltip>),
    },
  ];

  const tabItems = [
    {
      key: "dashboard", label: <span><DashboardOutlined /> Dashboard Prédictif</span>,
      children: (
        <Spin spinning={dashLoading}>
          <D2FSection
            title="Comprendre ce dashboard"
            icon={<InfoCircleOutlined />}
            iconColor={neutral[500]}
            style={{ marginBottom: 24 }}
          >
            <Text style={{ fontSize: 14, color: neutral[700] }}>
              Ce tableau de bord utilise l'intelligence artificielle pour <Text strong>anticiper les besoins en compétences</Text> et <Text strong>identifier les enseignants à risque</Text> de décrochage professionnel.
              Les scores de risque sont calculés sur la base de la stagnation des compétences, la vitesse de formation et les signaux de désengagement.
            </Text>
          </D2FSection>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <D2FDataCard
                icon={<FallOutlined />}
                iconColor="#ef4444"
                label="Compétences en Déclin"
                value={declining.length}
                accentColor="#ef4444"
                subtext={declining.length > 0 ? declining.slice(0, 3).map((c: any) => c.competency_name).join(", ") : "Aucune"}
              />
            </Col>
            <Col xs={24} sm={8}>
              <D2FDataCard
                icon={<RiseOutlined />}
                iconColor="#10b981"
                label="En Forte Demande"
                value={inDemand.length}
                accentColor="#10b981"
                subtext={inDemand.length > 0 ? inDemand.slice(0, 3).map((c: any) => c.competency_name).join(", ") : "Aucune"}
              />
            </Col>
            <Col xs={24} sm={8}>
              <D2FDataCard
                icon={<WarningOutlined />}
                iconColor="#f59e0b"
                label="Enseignants à Risque"
                value={atRiskCount}
                unit={`/ ${riskIndicators.length}`}
                accentColor="#f59e0b"
                subtext={riskIndicators.length ? `${Math.round((atRiskCount / riskIndicators.length) * 100)}% du total` : "Aucun"}
              />
            </Col>
          </Row>

          <D2FSection
            title="Indicateurs de Risque par Enseignant"
            icon={<TeamOutlined />}
            extra={
              <Space>
                <Select value={riskThreshold} onChange={setRiskThreshold} style={{ width: 140 }} size="small">
                  <Option value={0.5}>Seuil: 50%</Option>
                  <Option value={0.7}>Seuil: 70%</Option>
                  <Option value={0.8}>Seuil: 80%</Option>
                </Select>
                <Button size="small" icon={<ReloadOutlined />} onClick={loadDashboard}>Rafraîchir</Button>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Table
              dataSource={riskIndicators}
              columns={riskColumns}
              rowKey="teacher_id"
              pagination={{ pageSize: 8 }}
              size="middle"
              rowClassName={(r: any) => r.attrition_risk_score >= riskThreshold ? "risk-row-high" : ""}
            />
          </D2FSection>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={12}>
              <D2FSection title="Compétences en Déclin" icon={<FallOutlined />} iconColor="#ef4444">
                {declining.length > 0 ? (
                  <Table dataSource={declining} rowKey="competency_id" pagination={false} size="small" columns={[
                    { title: "Compétence", dataIndex: "competency_name", render: (v: string) => <Text strong>{v}</Text> },
                    { title: "Domaine", dataIndex: "domaine_name", render: (v: string) => <Tag>{v || "—"}</Tag> },
                    { title: "Demande 3M", dataIndex: "demand_3m", align: "center" },
                    { title: "Demande 12M", dataIndex: "demand_12m", align: "center" },
                  ]} />
                ) : <Empty description="Aucune compétence en déclin détectée" />}
              </D2FSection>
            </Col>
            <Col xs={24} lg={12}>
              <D2FSection title="Compétences en Forte Demande" icon={<RiseOutlined />} iconColor="#10b981">
                {inDemand.length > 0 ? (
                  <Table dataSource={inDemand} rowKey="competency_id" pagination={false} size="small" columns={[
                    { title: "Compétence", dataIndex: "competency_name", render: (v: string) => <Text strong>{v}</Text> },
                    { title: "Tendance", dataIndex: "trend", render: (v: string) => <Tag color={v === "increasing" ? "green" : "blue"}>{v === "increasing" ? "↑ Croissante" : "→ Stable"}</Tag> },
                    { title: "3M", dataIndex: "demand_3m", align: "center" },
                    { title: "12M", dataIndex: "demand_12m", align: "center" },
                  ]} />
                ) : <Empty description="Aucune donnée de demande" />}
              </D2FSection>
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
              <D2FSection
                title="Interprétation des résultats"
                icon={<InfoCircleOutlined />}
                iconColor={neutral[500]}
                style={{ marginBottom: 24 }}
              >
                <Text style={{ fontSize: 14, color: neutral[700] }}>
                  L'analyse individuelle prédit les <Text strong>gaps de compétences</Text> dans les 6 prochains mois pour l'enseignant sélectionné.
                  Le <Text strong>parcours recommandé</Text> est généré par IA pour combler ces gaps de manière optimale.
                </Text>
              </D2FSection>

              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <D2FSection
                    title="Gaps de Compétences Prédits"
                    icon={<FallOutlined />}
                    iconColor="#ef4444"
                    extra={<Tag color="blue">{analyseData.gaps.length} gaps</Tag>}
                  >
                    <Table dataSource={analyseData.gaps} columns={gapColumns} rowKey="competenceCode" pagination={false} size="middle" />
                  </D2FSection>
                </Col>
                <Col xs={24} lg={8}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: radius.lg, boxShadow: shadow.sm, textAlign: "center", padding: "24px 16px" }}
                  >
                    <Avatar size={72} icon={<UserOutlined />} style={{ backgroundColor: "#f1f5f9", color: brand[500], marginBottom: 12 }} />
                    <Title level={4} style={{ margin: 0 }}>{analyseData.enseignantId}</Title>
                    <Tag color="cyan" style={{ marginTop: 8, borderRadius: 9999 }}>Horizon 6 mois</Tag>
                    <Divider />
                    <Statistic
                      title="Risque Global"
                      value={Math.round((analyseData.overallRiskScore || 0) * 100)}
                      suffix="%"
                      valueStyle={{ color: (analyseData.overallRiskScore || 0) > 0.7 ? "#ef4444" : "#10b981" }}
                    />
                  </Card>
                  <D2FSection
                    title="Insight IA"
                    icon={<BulbOutlined />}
                    iconColor="#f59e0b"
                    style={{ marginTop: 20 }}
                  >
                    <Alert
                      message="Action Recommandée"
                      type={analyseData.gaps.some((g: any) => g.gravite === "elevee") ? "error" : "info"}
                      showIcon
                      description={analyseData.gaps.some((g: any) => g.gravite === "elevee")
                        ? "Gaps critiques détectés. Une mise à niveau urgente est recommandée."
                        : "Profil équilibré. Poursuivez les formations en cours."}
                    />
                  </D2FSection>
                </Col>
                <Col xs={24}>
                  <D2FSection title="Parcours Recommandé" icon={<RiseOutlined />} iconColor="#10b981">
                    {analyseData.recommandationsFormations.length > 0 ? (
                      <div className="reco-timeline">
                        {analyseData.recommandationsFormations.map((step: any, idx: number) => (
                          <div key={idx} className="reco-step">
                            <div className="reco-step-number">{step.ordre}</div>
                            <div className="reco-content">
                              <Row justify="space-between" align="middle">
                                <Col><div className="reco-title">{step.titre}</div>
                                  <Space wrap>
                                    {step.competencesCiblees.map((c: string) => <Tag key={c} color="blue">{c}</Tag>)}
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
                  </D2FSection>
                </Col>
              </Row>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="empty">
              <D2FSection title="Prêt pour l'analyse" icon={<RobotOutlined />} iconColor={neutral[400]}>
                <Empty
                  image={<RobotOutlined style={{ fontSize: 56, color: "#e2e8f0" }} />}
                  description={
                    <div style={{ marginTop: 20 }}>
                      <Title level={4} type="secondary">Analyse individuelle</Title>
                      <Text type="secondary">Utilisez les filtres ci-dessus pour lancer une analyse individuelle d'un enseignant.</Text>
                    </div>
                  }
                />
              </D2FSection>
            </motion.div>
          )}
        </AnimatePresence>
      ),
    },
  ];

  return (
    <>
      <D2FPageHeader
        icon={<RobotOutlined />}
        title="Intelligence Prédictive"
        subtitle="Anticipez les besoins en compétences et optimisez les parcours de formation"
        actions={
          <Space>
            {isAdmin && (
              <Button icon={<ExperimentOutlined />} onClick={handleTrainModel} loading={loading}>
                Ré-entraîner le modèle
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={loadDashboard} loading={dashLoading}>Rafraîchir</Button>
          </Space>
        }
      />

      {error && (
        <Alert message="Erreur" description={error} type="error" showIcon closable style={{ marginBottom: 24, borderRadius: radius.md }} onClose={() => setError(null)} />
      )}

      <D2FSection style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={9}>
            <div style={{ marginBottom: 6 }}><Text strong>Enseignant</Text></div>
            <Input size="large" placeholder="ID enseignant (ex: ENS001)" value={enseignantId}
              onChange={(e) => setEnseignantId(e.target.value)} prefix={<UserOutlined style={{ color: brand[500] }} />}
              style={{ borderRadius: radius.md }} onPressEnter={handleAnalyserEnseignant} />
          </Col>
          <Col xs={24} md={9}>
            <div style={{ marginBottom: 6 }}><Text strong>Compétence cible (optionnel)</Text></div>
            <Input size="large" placeholder="Ex: C42 (IA & Big Data)" value={competenceCible}
              onChange={(e) => setCompetenceCible(e.target.value)} prefix={<ProjectOutlined style={{ color: brand[500] }} />}
              style={{ borderRadius: radius.md }} onPressEnter={handleAnalyserEnseignant} />
          </Col>
          <Col xs={24} md={6}>
            <div style={{ height: 28 }} />
            <Button type="primary" size="large" block icon={<SearchOutlined />} onClick={handleAnalyserEnseignant}
              loading={loading} style={{ height: 44, borderRadius: radius.md }}>
              Analyser
            </Button>
          </Col>
        </Row>
      </D2FSection>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="analyse-tabs" />
    </>
  );
}
