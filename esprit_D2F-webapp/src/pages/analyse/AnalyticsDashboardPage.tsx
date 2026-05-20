import { Card, Row, Col, Statistic, Table, Tag, Space, Typography, Button, Spin, Alert, Badge, Empty } from "antd";
import {
  FallOutlined, RiseOutlined, WarningOutlined, ReloadOutlined,
  TeamOutlined, TrophyOutlined, BellOutlined, DashboardOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useDashboard } from "@/hooks/analyse/useDashboard";
import RiskBadge from "@/components/charts/RiskBadge";
import PredictionScoreBar from "@/components/charts/PredictionScoreBar";
import type {
  CompetenceDeclin, CompetenceDemande, TeacherRiskProfile, TopFormation, AlerteResumee,
} from "@/models/analyse";
import { AppPageHeader, shadow } from "@/components/common";
import "@/styles/pages/analytics-dashboard-page.css";

const { Text } = Typography;

const cardStyle = {
  background: "#fff",
  boxShadow: shadow.sm,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.07)",
};

const kpiCardStyle = (accent: string) => ({
  ...cardStyle,
  borderTop: `3px solid ${accent}`,
});

const SEVERITE_COLOR: Record<string, string> = {
  CRITICAL: "red", WARNING: "orange", INFO: "blue",
};

export default function AnalyticsDashboardPage() {
  const { loading, dashboard: d, atRisk, error, lastUpdate, refetch } = useDashboard();

  const declinColumns: ColumnsType<CompetenceDeclin> = [
    { title: "Compétence", dataIndex: "competence_nom", render: v => <Text strong>{v}</Text> },
    { title: "Domaine", dataIndex: "domaine_nom", render: v => <Tag>{v || "—"}</Tag> },
    { title: "Actuel", dataIndex: "niveau_actuel", align: "center", width: 80,
      render: v => <Text>{v}/5</Text> },
    { title: "Précédent", dataIndex: "niveau_ancien", align: "center", width: 90,
      render: v => <Text type="secondary">{v}/5</Text> },
    { title: "Delta", dataIndex: "delta", align: "center", width: 90,
      render: v => <Text style={{ color: "#ef4444", fontWeight: 600 }}>{v > 0 ? "+" : ""}{v?.toFixed(2)}</Text> },
  ];

  const demandeColumns: ColumnsType<CompetenceDemande> = [
    { title: "Compétence", dataIndex: "competence_nom", render: v => <Text strong>{v}</Text> },
    { title: "Domaine", dataIndex: "domaine_nom", render: v => <Tag>{v || "—"}</Tag> },
    { title: "Gaps ouverts", dataIndex: "nb_gaps", align: "center", width: 120,
      render: v => <Tag color="volcano">{v}</Tag> },
    { title: "Critiques", dataIndex: "nb_critiques", align: "center", width: 90,
      render: v => <Tag color={v > 0 ? "error" : "default"}>{v}</Tag> },
    { title: "Score demande", dataIndex: "score_demande", width: 180,
      render: v => <PredictionScoreBar value={v} size="small" showPct /> },
  ];

  const riskColumns: ColumnsType<TeacherRiskProfile> = [
    { title: "Enseignant", dataIndex: "enseignant_id", render: v => <Text strong>{v}</Text> },
    {
      title: "Risque", dataIndex: "niveau_risque",
      render: (v, r) => (
        <Space>
          <RiskBadge type="risque" value={v} />
          <Text style={{ fontSize: 11 }}>{Math.round(r.score_risque * 100)}%</Text>
        </Space>
      ),
    },
    { title: "Gaps critiques", dataIndex: "nb_gaps_critiques", align: "center", width: 120,
      render: v => <Tag color={v > 0 ? "error" : "success"}>{v}</Tag> },
    {
      title: "Tendance", dataIndex: "tendance", width: 140,
      render: v => {
        const color = v === "PROGRESSION" ? "success" : v === "REGRESSION" ? "error" : "default";
        const icon = v === "PROGRESSION" ? "↑" : v === "REGRESSION" ? "↓" : "→";
        return <Tag color={color}>{icon} {v}</Tag>;
      },
    },
  ];

  const topFormColumns: ColumnsType<TopFormation> = [
    { title: "Formation", dataIndex: "formation_titre", render: v => <Text strong>{v}</Text> },
    { title: "Reco.", dataIndex: "nb_recommandations", align: "center", width: 80,
      render: v => <Tag color="blue">{v}</Tag> },
    { title: "Score moyen", dataIndex: "score_moyen", width: 160,
      render: v => <PredictionScoreBar value={v} size="small" showPct /> },
    { title: "Réussite moy.", dataIndex: "proba_reussite_moy", align: "center", width: 120,
      render: v => <Text style={{ color: "#10b981", fontWeight: 600 }}>{Math.round(v * 100)}%</Text> },
  ];

  const alerteColumns: ColumnsType<AlerteResumee> = [
    { title: "Titre", dataIndex: "titre", render: v => <Text strong>{v}</Text> },
    { title: "Type", dataIndex: "type_alerte",
      render: v => <Tag color="purple" style={{ fontSize: 11 }}>{v.replace(/_/g, " ")}</Tag> },
    { title: "Sévérité", dataIndex: "severite", width: 100,
      render: v => <Tag color={SEVERITE_COLOR[v] ?? "default"}>{v}</Tag> },
    { title: "Date", dataIndex: "created_at", width: 160,
      render: v => <Text type="secondary" style={{ fontSize: 11 }}>{new Date(v).toLocaleString("fr-FR")}</Text> },
  ];

  return (
    <div>
      <AppPageHeader
        icon={<DashboardOutlined />}
        title="Tableau de Bord Analytique"
        subtitle={`Vue d'ensemble prédictive — Dernière mise à jour : ${lastUpdate ?? "—"}`}
        actions={
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={loading}>Rafraîchir</Button>
        }
      />

      {error && (
        <Alert message={error} type="error" showIcon closable style={{ marginBottom: 16, borderRadius: 8 }} />
      )}

      <Spin spinning={loading}>
        {/* KPI row */}
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card className="d2f-hover-lift" style={kpiCardStyle("#ef4444")}>
              <Statistic
                title="Compétences en déclin"
                value={d?.competences_en_declin?.length ?? 0}
                prefix={<FallOutlined style={{ color: "#ef4444" }} />}
                valueStyle={{ color: "#ef4444" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="d2f-hover-lift" style={kpiCardStyle("#10b981")}>
              <Statistic
                title="Compétences en demande"
                value={d?.competences_en_demande?.length ?? 0}
                prefix={<RiseOutlined style={{ color: "#10b981" }} />}
                valueStyle={{ color: "#10b981" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="d2f-hover-lift" style={kpiCardStyle("#f59e0b")}>
              <Statistic
                title="Enseignants à risque"
                value={atRisk.length}
                prefix={<WarningOutlined style={{ color: "#f59e0b" }} />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="d2f-hover-lift" style={kpiCardStyle("#8b5cf6")}>
              <Statistic
                title="Alertes récentes"
                value={d?.alertes_recentes?.length ?? 0}
                prefix={<BellOutlined style={{ color: "#8b5cf6" }} />}
                valueStyle={{ color: "#8b5cf6" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Tables row 1 */}
        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><FallOutlined style={{ color: "#ef4444" }} /><Text strong>Compétences en Déclin</Text></Space>}
              style={cardStyle}
              size="small"
            >
              {d?.competences_en_declin?.length ? (
                <Table
                  dataSource={d.competences_en_declin}
                  columns={declinColumns}
                  rowKey="competence_id"
                  pagination={{ pageSize: 5, size: "small" }}
                  size="small"
                />
              ) : (
                <Empty description="Aucune compétence en déclin" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><RiseOutlined style={{ color: "#10b981" }} /><Text strong>Compétences en Demande</Text></Space>}
              style={cardStyle}
              size="small"
            >
              {d?.competences_en_demande?.length ? (
                <Table
                  dataSource={d.competences_en_demande}
                  columns={demandeColumns}
                  rowKey="competence_id"
                  pagination={{ pageSize: 5, size: "small" }}
                  size="small"
                />
              ) : (
                <Empty description="Aucune donnée disponible" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        {/* Tables row 2 */}
        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={
                <Space>
                  <TeamOutlined style={{ color: "#f59e0b" }} />
                  <Text strong>Enseignants à Risque</Text>
                  <Badge count={atRisk.length} />
                </Space>
              }
              style={cardStyle}
              size="small"
            >
              {atRisk.length ? (
                <Table
                  dataSource={atRisk}
                  columns={riskColumns}
                  rowKey="enseignant_id"
                  pagination={{ pageSize: 5, size: "small" }}
                  size="small"
                />
              ) : (
                <Empty description="Aucun enseignant à risque élevé" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><TrophyOutlined style={{ color: "#B51200" }} /><Text strong>Top Formations Recommandées</Text></Space>}
              style={cardStyle}
              size="small"
            >
              {d?.top_formations_recommandees?.length ? (
                <Table
                  dataSource={d.top_formations_recommandees}
                  columns={topFormColumns}
                  rowKey="formation_id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty description="Aucune donnée disponible" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        {/* Alertes recentes */}
        <Card
          title={<Space><BellOutlined style={{ color: "#8b5cf6" }} /><Text strong>Alertes Récentes</Text></Space>}
          style={cardStyle}
          size="small"
        >
          {d?.alertes_recentes?.length ? (
            <Table
              dataSource={d.alertes_recentes}
              columns={alerteColumns}
              rowKey="id"
              pagination={{ pageSize: 5, size: "small" }}
              size="small"
            />
          ) : (
            <Empty description="Aucune alerte récente" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </Spin>
    </div>
  );
}




