import { useState } from "react";
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
} from "antd";
import {
  SearchOutlined,
  RobotOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import AnalysePredictiveService from "../../services/AnalysePredictiveService";

const { Title, Text } = Typography;

// Couleurs de gravité
const graviteColors = {
  elevee: "red",
  moyenne: "orange",
  faible: "green",
};
const prioriteColors = {
  haute: "red",
  moyenne: "orange",
  faible: "green",
};

export default function AnalysePredictivePage() {
  const [enseignantId, setEnseignantId] = useState("");
  const [analyseData, setAnalyseData] = useState(null);
  const [tendancesData, setTendancesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Analyser un enseignant
  const handleAnalyserEnseignant = async () => {
    if (!enseignantId.trim()) return;
    setLoading(true);
    setError(null);
    setAnalyseData(null);
    try {
      const data = await AnalysePredictiveService.analyserEnseignant(enseignantId.trim());
      setAnalyseData(data);
    } catch {
      setError("Impossible de récupérer l'analyse prédictive. Vérifiez l'ID et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  // Tendances globales
  const handleTendancesGlobales = async () => {
    setLoading(true);
    setError(null);
    setTendancesData(null);
    try {
      const data = await AnalysePredictiveService.analyserTendancesGlobales();
      setTendancesData(data);
    } catch {
      setError("Impossible de récupérer les tendances globales.");
    } finally {
      setLoading(false);
    }
  };

  // Colonnes pour la table des gaps
  const gapColumns = [
    {
      title: "Code",
      dataIndex: "competenceCode",
      key: "code",
      width: 120,
    },
    {
      title: "Compétence",
      dataIndex: "competenceLabel",
      key: "label",
    },
    {
      title: "Actuel",
      dataIndex: "niveauActuel",
      key: "actuel",
      width: 90,
      render: (val) => <Progress percent={Math.round((val / 5) * 100)} size="small" />,
    },
    {
      title: "Cible",
      dataIndex: "niveauCible",
      key: "cible",
      width: 90,
      render: (val) => <Progress percent={Math.round((val / 5) * 100)} size="small" strokeColor="#B51200" />,
    },
    {
      title: "Gap",
      dataIndex: "gap",
      key: "gap",
      width: 70,
      render: (val) => <Text strong style={{ color: val >= 2 ? "#f5222d" : val >= 1 ? "#fa8c16" : "#52c41a" }}>{val.toFixed(1)}</Text>,
    },
    {
      title: "Gravité",
      dataIndex: "gravite",
      key: "gravite",
      width: 100,
      render: (val) => <Tag color={graviteColors[val]}>{val.toUpperCase()}</Tag>,
    },
    {
      title: "Explication",
      dataIndex: "explication",
      key: "explication",
      ellipsis: { showTitle: false },
      render: (val) => (
        <Tooltip placement="topLeft" title={val}>
          {val}
        </Tooltip>
      ),
    },
  ];

  // Colonnes pour les recommandations
  const recoColumns = [
    {
      title: "#",
      dataIndex: "ordre",
      key: "ordre",
      width: 50,
    },
    {
      title: "Formation",
      dataIndex: "titre",
      key: "titre",
    },
    {
      title: "Durée",
      dataIndex: "dureeEstimee",
      key: "duree",
      width: 100,
    },
    {
      title: "Prérequis manquants",
      dataIndex: "prerequisManquants",
      key: "prerequis",
      width: 160,
      render: (val) =>
        val && val.length > 0 ? (
          val.map((p, i) => <Tag key={i} color="volcano">{p}</Tag>)
        ) : (
          <Tag color="green">Aucun</Tag>
        ),
    },
    {
      title: "Prob. réussite",
      dataIndex: "probabiliteReussite",
      key: "proba",
      width: 140,
      render: (val) => (
        <Progress
          percent={Math.round(val * 100)}
          size="small"
          strokeColor={val >= 0.7 ? "#52c41a" : val >= 0.5 ? "#fa8c16" : "#f5222d"}
        />
      ),
    },
    {
      title: "Justification",
      dataIndex: "justification",
      key: "justification",
      ellipsis: { showTitle: false },
      render: (val) => (
        <Tooltip placement="topLeft" title={val}>
          {val}
        </Tooltip>
      ),
    },
  ];

  // Colonnes pour les besoins détectés
  const besoinsColumns = [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (val) => (
        <Tag color={val === "collectif" ? "blue" : "purple"} icon={val === "collectif" ? <TeamOutlined /> : <UserOutlined />}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Compétence",
      dataIndex: "competenceCode",
      key: "competenceCode",
    },
    {
      title: "Priorité",
      dataIndex: "priorite",
      key: "priorite",
      width: 100,
      render: (val) => <Tag color={prioriteColors[val]}>{val.toUpperCase()}</Tag>,
    },
    {
      title: "Raison",
      dataIndex: "raison",
      key: "raison",
      ellipsis: { showTitle: false },
      render: (val) => (
        <Tooltip placement="topLeft" title={val}>
          {val}
        </Tooltip>
      ),
    },
  ];

  // Remplacer UserOutlined import manquant
  const UserOutlined = TeamOutlined;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <RobotOutlined style={{ marginRight: 8, color: "#B51200" }} />
        Analyse Prédictive
      </Title>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={12}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                size="large"
                placeholder="ID de l'enseignant (ex: E001)"
                value={enseignantId}
                onChange={(e) => setEnseignantId(e.target.value)}
                onPressEnter={handleAnalyserEnseignant}
                prefix={<SearchOutlined />}
              />
              <Button
                type="primary"
                size="large"
                onClick={handleAnalyserEnseignant}
                loading={loading}
                style={{ backgroundColor: "#B51200", borderColor: "#B51200" }}
              >
                Analyser
              </Button>
            </Space.Compact>
          </Col>
          <Col xs={24} md={6}>
            <Button
              size="large"
              onClick={handleTendancesGlobales}
              loading={loading}
              icon={<ThunderboltOutlined />}
              style={{ width: "100%" }}
            >
              Tendances Globales
            </Button>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {/* ===== ANALYSE PAR ENSEIGNANT ===== */}
        {analyseData && (
          <Tabs
            defaultActiveKey="gaps"
            type="card"
            items={[
              {
                key: "gaps",
                label: (
                  <span>
                    <FallOutlined /> Gaps de Compétences
                  </span>
                ),
                children: (
                  <Card>
                    <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Enseignant">{analyseData.enseignantId}</Descriptions.Item>
                      <Descriptions.Item label="Compétence analysée">{analyseData.competenceAnalysee}</Descriptions.Item>
                      <Descriptions.Item label="Nombre de gaps">
                        <Tag color="red">{analyseData.gaps?.length || 0}</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                    <Table
                      dataSource={analyseData.gaps || []}
                      columns={gapColumns}
                      rowKey="competenceCode"
                      pagination={{ pageSize: 5 }}
                      scroll={{ x: 900 }}
                      size="small"
                    />
                  </Card>
                ),
              },
              {
                key: "recommandations",
                label: (
                  <span>
                    <RiseOutlined /> Recommandations
                  </span>
                ),
                children: (
                  <Card>
                    <Table
                      dataSource={analyseData.recommandationsFormations || []}
                      columns={recoColumns}
                      rowKey="formationId"
                      pagination={{ pageSize: 5 }}
                      scroll={{ x: 900 }}
                      size="small"
                    />
                  </Card>
                ),
              },
              {
                key: "besoins",
                label: (
                  <span>
                    <WarningOutlined /> Besoins Détectés
                  </span>
                ),
                children: (
                  <Card>
                    <Table
                      dataSource={analyseData.besoinsDetectes || []}
                      columns={besoinsColumns}
                      rowKey="competenceCode"
                      pagination={{ pageSize: 5 }}
                      scroll={{ x: 700 }}
                      size="small"
                    />
                  </Card>
                ),
              },
              {
                key: "dashboard",
                label: (
                  <span>
                    <ThunderboltOutlined /> Dashboard Prédictif
                  </span>
                ),
                children: (
                  <Card>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card size="small" title="Compétences en Déclin" bordered={false}>
                          {(analyseData.dashboard?.competencesEnDeclin || []).length > 0 ? (
                            analyseData.dashboard.competencesEnDeclin.map((c, i) => (
                              <Tag key={i} color="red" style={{ marginBottom: 4 }}>
                                <FallOutlined /> {c}
                              </Tag>
                            ))
                          ) : (
                            <Text type="secondary">Aucune compétence en déclin détectée</Text>
                          )}
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card size="small" title="Compétences en Forte Demande" bordered={false}>
                          {(analyseData.dashboard?.competencesEnForteDemande || []).length > 0 ? (
                            analyseData.dashboard.competencesEnForteDemande.map((c, i) => (
                              <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                                <RiseOutlined /> {c}
                              </Tag>
                            ))
                          ) : (
                            <Text type="secondary">Aucune compétence en forte demande</Text>
                          )}
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card size="small" title="Enseignants à Risque" bordered={false}>
                          {(analyseData.dashboard?.enseignantsARisque || []).length > 0 ? (
                            analyseData.dashboard.enseignantsARisque.map((e, i) => (
                              <Tag key={i} color="volcano" style={{ marginBottom: 4 }}>
                                <WarningOutlined /> {e}
                              </Tag>
                            ))
                          ) : (
                            <Text type="secondary">Aucun enseignant à risque identifié</Text>
                          )}
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                ),
              },
              {
                key: "json",
                label: "JSON",
                children: (
                  <Card>
                    <pre style={{ maxHeight: 500, overflow: "auto", background: "#f5f5f5", padding: 16, borderRadius: 8 }}>
                      {JSON.stringify(analyseData, null, 2)}
                    </pre>
                  </Card>
                ),
              },
            ]}
          />
        )}

        {/* ===== TENDANCES GLOBALES ===== */}
        {tendancesData && (
          <Card>
            <Title level={4}>Tendances Globales</Title>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={8}>
                <Statistic
                  title="Total Évaluations"
                  value={tendancesData.statistiques?.totalEvaluations || 0}
                  suffix="évaluations"
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Note Moyenne"
                  value={tendancesData.statistiques?.noteMoyenne || 0}
                  precision={2}
                  suffix="/ 5"
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Formations Évaluées"
                  value={tendancesData.statistiques?.formationsEvaluees || 0}
                  suffix="formations"
                />
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card size="small" title="Compétences en Déclin" bordered>
                  {(tendancesData.dashboard?.competencesEnDeclin || []).length > 0 ? (
                    tendancesData.dashboard.competencesEnDeclin.map((c, i) => (
                      <Tag key={i} color="red" style={{ marginBottom: 4 }}>
                        <FallOutlined /> {c}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary">Aucune</Text>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" title="Compétences en Forte Demande" bordered>
                  {(tendancesData.dashboard?.competencesEnForteDemande || []).length > 0 ? (
                    tendancesData.dashboard.competencesEnForteDemande.map((c, i) => (
                      <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                        <RiseOutlined /> {c}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary">Aucune</Text>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" title="Enseignants à Risque" bordered>
                  {(tendancesData.dashboard?.enseignantsARisque || []).length > 0 ? (
                    tendancesData.dashboard.enseignantsARisque.map((e, i) => (
                      <Tag key={i} color="volcano" style={{ marginBottom: 4 }}>
                        <WarningOutlined /> {e}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary">Aucun</Text>
                  )}
                </Card>
              </Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              <Title level={5}>Données JSON brutes</Title>
              <pre style={{ maxHeight: 300, overflow: "auto", background: "#f5f5f5", padding: 16, borderRadius: 8 }}>
                {JSON.stringify(tendancesData, null, 2)}
              </pre>
            </Card>
          </Card>
        )}
      </Spin>
    </div>
  );
}