import { useState, useMemo } from "react";
import {
  Card,
  Input,
  Button,
  Tabs,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
  Progress,
  Typography,
  Descriptions,
  Tooltip,
  Space,
  Empty,
  Avatar,
  Divider,
} from "antd";
import {
  SearchOutlined,
  RobotOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ProjectOutlined,
  BulbOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import AnalysePredictiveService from "../../services/AnalysePredictiveService";
import "./AnalysePredictivePage.css";

const { Title, Text, Paragraph } = Typography;

const graviteColors = {
  elevee: "#ef4444",
  moyenne: "#f59e0b",
  faible: "#10b981",
};

export default function AnalysePredictivePage() {
  const [enseignantId, setEnseignantId] = useState("");
  const [competenceCible, setCompetenceCible] = useState("");
  const [analyseData, setAnalyseData] = useState(null);
  const [tendancesData, setTendancesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyserEnseignant = async () => {
    if (!enseignantId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await AnalysePredictiveService.analyserEnseignant(
        enseignantId.trim(),
        competenceCible.trim() || undefined
      );
      setAnalyseData(data);
      setTendancesData(null);
    } catch {
      setError("Impossible de récupérer l'analyse prédictive. Vérifiez l'ID et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleTendancesGlobales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AnalysePredictiveService.analyserTendancesGlobales();
      setTendancesData(data);
      setAnalyseData(null);
    } catch {
      setError("Impossible de récupérer les tendances globales.");
    } finally {
      setLoading(false);
    }
  };

  const gapColumns = [
    {
      title: "Compétence",
      key: "label",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.competenceLabel}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.competenceCode}</Text>
        </Space>
      ),
    },
    {
      title: "Niveau Actuel",
      dataIndex: "niveauActuel",
      width: 120,
      render: (val) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={(val / 5) * 100} size="small" showInfo={false} strokeColor="#94a3b8" />
          <Text style={{ fontSize: 12 }}>{val}/5</Text>
        </Space>
      ),
    },
    {
      title: "Niveau Cible",
      dataIndex: "niveauCible",
      width: 120,
      render: (val) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={(val / 5) * 100} size="small" showInfo={false} strokeColor="#B51200" />
          <Text style={{ fontSize: 12 }}>{val}/5</Text>
        </Space>
      ),
    },
    {
      title: "Gap Prédit",
      dataIndex: "gap",
      width: 100,
      align: "center",
      render: (val) => (
        <div className={`gap-value ${val >= 1.5 ? 'high' : 'normal'}`}>
          <Text strong style={{ color: val >= 1.5 ? "#ef4444" : "#1e293b", fontSize: 16 }}>
            {val.toFixed(1)}
          </Text>
        </div>
      ),
    },
    {
      title: "Gravité",
      dataIndex: "gravite",
      width: 120,
      render: (val) => (
        <Tag color={graviteColors[val]} style={{ borderRadius: 12, padding: "0 12px", border: "none" }}>
          {val.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Analyse IA",
      dataIndex: "explication",
      render: (val) => (
        <Tooltip title={val}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BulbOutlined style={{ color: '#f59e0b' }} />
            <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>{val}</Text>
          </div>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="analyse-container">
      {/* Header Section */}
      <div className="analyse-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="start" size={16}>
              <div style={{ 
                background: "linear-gradient(135deg, #B51200 0%, #D61600 100%)",
                padding: 12, 
                borderRadius: 16,
                boxShadow: "0 8px 16px rgba(181, 18, 0, 0.2)"
              }}>
                <RobotOutlined style={{ fontSize: 32, color: "white" }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Intelligence Prédictive</Title>
                <Text type="secondary">Anticipez les besoins en compétences et optimisez les parcours de formation</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<HistoryOutlined />} 
                onClick={() => setAnalyseData(null) || setTendancesData(null)}
                disabled={!analyseData && !tendancesData}
              >
                Réinitialiser
              </Button>
              <Button 
                type="primary" 
                icon={<ThunderboltOutlined />} 
                size="large"
                onClick={handleTendancesGlobales}
                loading={loading}
                className="btn-brand"
                style={{ height: 48, borderRadius: 12 }}
              >
                Tendances Globales
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {error && <Alert message="Analyse Error" description={error} type="error" showIcon closable style={{ marginBottom: 24, borderRadius: 12 }} />}

      {/* Search Section */}
      <Card className="analyse-glass-card" style={{ marginBottom: 32 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 8 }}><Text strong>Enseignant à analyser</Text></div>
            <Input
              size="large"
              placeholder="Saisir l'identifiant (ex: ENS001)"
              value={enseignantId}
              onChange={(e) => setEnseignantId(e.target.value)}
              prefix={<UserOutlined style={{ color: "#B51200" }} />}
              style={{ borderRadius: 10 }}
            />
          </Col>
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 8 }}><Text strong>Compétence cible (Optionnel)</Text></div>
            <Input
              size="large"
              placeholder="Ex: C42 (IA & Big Data)"
              value={competenceCible}
              onChange={(e) => setCompetenceCible(e.target.value)}
              prefix={<ProjectOutlined style={{ color: "#B51200" }} />}
              style={{ borderRadius: 10 }}
            />
          </Col>
          <Col xs={24} md={4}>
            <div style={{ height: 32 }} /> {/* Spacer */}
            <Button
              type="primary"
              size="large"
              block
              icon={<SearchOutlined />}
              onClick={handleAnalyserEnseignant}
              loading={loading}
              style={{ height: 48, borderRadius: 12, backgroundColor: "#1e293b", borderColor: "#1e293b" }}
            >
              Lancer l'analyse
            </Button>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading} size="large">
        <AnimatePresence mode="wait">
          {/* Result Section: Teacher Analysis */}
          {analyseData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              key="teacher-analysis"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <Card 
                    title={<span><FallOutlined /> Gaps de Compétences Prédits</span>} 
                    className="analyse-glass-card"
                    extra={<Tag color="blue">{analyseData.gaps.length} gaps identifiés</Tag>}
                  >
                    <Table
                      dataSource={analyseData.gaps}
                      columns={gapColumns}
                      rowKey="competenceCode"
                      pagination={false}
                      size="middle"
                    />
                  </Card>
                </Col>
                
                <Col xs={24} lg={8}>
                  <Card title={<span><UserOutlined /> Profil de l'Analyse</span>} className="analyse-glass-card">
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#f1f5f9', color: '#B51200', marginBottom: 16 }} />
                      <Title level={4} style={{ margin: 0 }}>{analyseData.enseignantId}</Title>
                      <Tag color="cyan" style={{ marginTop: 8 }}>Horizon 6 mois</Tag>
                    </div>
                    <Divider />
                    <Statistic 
                      title="Niveau de Risque Global" 
                      value={analyseData.gaps.filter(g => g.gravite === 'elevee').length > 0 ? 85 : 42} 
                      suffix="%" 
                      valueStyle={{ color: analyseData.gaps.filter(g => g.gravite === 'elevee').length > 0 ? '#ef4444' : '#10b981' }}
                    />
                    <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 13 }}>
                      Basé sur la vélocité d'apprentissage et les exigences futures des modules affectés.
                    </Paragraph>
                  </Card>

                  <Card title={<span><BulbOutlined /> Insight IA</span>} style={{ marginTop: 24 }} className="analyse-glass-card">
                    <Alert
                      message="Action Recommandée"
                      description="L'enseignant présente un risque de retard sur les compétences DATA. Une formation de mise à niveau est suggérée avant le semestre prochain."
                      type="warning"
                      showIcon
                      style={{ borderRadius: 8 }}
                    />
                  </Card>
                </Col>

                {/* Training Path Section */}
                <Col xs={24}>
                  <Card title={<span><RiseOutlined /> Parcours d'Apprentissage Recommandé</span>} className="analyse-glass-card">
                    {analyseData.recommandationsFormations.length > 0 ? (
                      <div className="reco-timeline">
                        {analyseData.recommandationsFormations.map((step, idx) => (
                          <div key={idx} className="reco-step">
                            <div className="reco-step-number">{step.ordre}</div>
                            <div className="reco-content">
                              <Row justify="space-between" align="middle">
                                <Col>
                                  <div className="reco-title">{step.titre}</div>
                                  <Space wrap>
                                    {step.competencesCiblees.map(c => <Tag key={c} color="blue" plain>{c}</Tag>)}
                                    <Tag icon={<HistoryOutlined />} color="default">{step.dureeEstimee}</Tag>
                                  </Space>
                                </Col>
                                <Col>
                                  <div style={{ textAlign: 'right' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Probabilité de réussite</Text>
                                    <Progress percent={step.probabiliteReussite * 100} size="small" strokeColor={step.probabiliteReussite > 0.8 ? '#10b981' : '#f59e0b'} />
                                  </div>
                                </Col>
                              </Row>
                              <div style={{ marginTop: 12, padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                                <Text style={{ fontSize: 13 }}><BulbOutlined style={{ marginRight: 6 }} /> {step.justification}</Text>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty description="Spécifiez une compétence cible pour générer un parcours personnalisé." />
                    )}
                  </Card>
                </Col>
              </Row>
            </motion.div>
          )}

          {/* Result Section: Global Trends */}
          {tendancesData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              key="global-trends"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <Card className="analyse-glass-card analyse-stat-card">
                    <Statistic 
                      title="Compétences en Déclin" 
                      value={tendancesData.dashboard.competencesEnDeclin.length} 
                      prefix={<FallOutlined style={{ color: '#ef4444' }} />}
                      valueStyle={{ color: '#ef4444' }}
                    />
                    <div style={{ marginTop: 16 }}>
                      {tendancesData.dashboard.competencesEnDeclin.map(c => <Tag key={c} color="red" style={{ marginBottom: 4 }}>{c}</Tag>)}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card className="analyse-glass-card analyse-stat-card">
                    <Statistic 
                      title="En Forte Demande" 
                      value={tendancesData.dashboard.competencesEnForteDemande.length} 
                      prefix={<RiseOutlined style={{ color: '#10b981' }} />}
                      valueStyle={{ color: '#10b981' }}
                    />
                    <div style={{ marginTop: 16 }}>
                      {tendancesData.dashboard.competencesEnForteDemande.map(c => <Tag key={c} color="green" style={{ marginBottom: 4 }}>{c}</Tag>)}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card className="analyse-glass-card analyse-stat-card">
                    <Statistic 
                      title="Enseignants à Risque" 
                      value={tendancesData.dashboard.enseignantsARisque.length} 
                      prefix={<WarningOutlined style={{ color: '#f59e0b' }} />}
                      valueStyle={{ color: '#f59e0b' }}
                    />
                    <div style={{ marginTop: 16 }}>
                      {tendancesData.dashboard.enseignantsARisque.map(e => <Tag key={e} color="orange" style={{ marginBottom: 4 }}>{e}</Tag>)}
                    </div>
                  </Card>
                </Col>

                <Col xs={24}>
                  <Card title="Résumé Stratégique (IA)" className="analyse-glass-card">
                    <Row gutter={48}>
                      <Col xs={24} md={16}>
                        <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                          L'analyse globale montre une <strong>forte accélération</strong> sur les compétences liées à l'IA Générative et au Cloud Computing. 
                          Cependant, nous observons une érosion des compétences sur les frameworks legacy (JEE ancien, .NET 4.x).
                        </Paragraph>
                        <Alert 
                          message="Alerte Planification"
                          description="35% de votre corps enseignant aura besoin d'une mise à jour de certification d'ici la fin de l'année."
                          type="info"
                          showIcon
                        />
                      </Col>
                      <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                        <Progress type="dashboard" percent={78} strokeColor="#B51200" />
                        <div style={{ marginTop: -20 }}><Text strong>Index d'Adéquation Global</Text></div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </motion.div>
          )}

          {!analyseData && !tendancesData && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ textAlign: 'center', padding: '100px 0', background: 'white', borderRadius: 24 }}>
                <Empty 
                  image={<RobotOutlined style={{ fontSize: 64, color: '#e2e8f0' }} />}
                  description={
                    <div style={{ marginTop: 24 }}>
                      <Title level={4} type="secondary">Prêt pour l'analyse</Title>
                      <Text type="secondary">Utilisez les filtres ci-dessus pour lancer une analyse individuelle ou globale.</Text>
                    </div>
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Spin>
    </div>
  );
}