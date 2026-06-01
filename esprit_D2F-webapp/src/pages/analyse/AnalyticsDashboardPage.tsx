import { Card, Row, Col, Statistic, Table, Tag, Space, Typography, Button, Spin, Alert, Badge, Empty, Progress } from "antd";
import {
  FallOutlined, RiseOutlined, WarningOutlined, ReloadOutlined,
  TeamOutlined, TrophyOutlined, BellOutlined, DashboardOutlined,
  HeatMapOutlined, LineChartOutlined, ExperimentOutlined, ApartmentOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useDashboard } from "@/hooks/analyse/useDashboard";
import RiskBadge from "@/components/charts/RiskBadge";
import PredictionScoreBar from "@/components/charts/PredictionScoreBar";
import GapHeatmap from "@/components/charts/GapHeatmap";
import TrendLineChart from "@/components/charts/TrendLineChart";
import type {
  CompetenceDeclin, CompetenceDemande, TeacherRiskProfile, TopFormation, AlerteResumee,
  TrainingEffectiveness, CouvertureDepartement,
} from "@/models/analyse";
import { AppPageHeader, shadow } from "@/components/common";
import "@/styles/pages/analytics-dashboard-page.css";

const { Text } = Typography;

function couvertureColor(taux: number): string {
  if (taux >= 75) return "#10b981";
  if (taux >= 50) return "#f59e0b";
  return "#ef4444";
}

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
      render: v => <Text className="color-danger fw-600">{v > 0 ? "+" : ""}{v?.toFixed(2)}</Text> },
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
          <Text className="text-xs">{Math.round(r.score_risque * 100)}%</Text>
        </Space>
      ),
    },
    { title: "Gaps critiques", dataIndex: "nb_gaps_critiques", align: "center", width: 120,
      render: v => <Tag color={v > 0 ? "error" : "success"}>{v}</Tag> },
    {
      title: "Tendance", dataIndex: "tendance", width: 140,
      render: v => {
        let color = "default";
        if (v === "PROGRESSION") color = "success";
        else if (v === "REGRESSION") color = "error";
        let icon = "→";
        if (v === "PROGRESSION") icon = "↑";
        else if (v === "REGRESSION") icon = "↓";
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
      render: v => <Text className="color-success fw-600">{Math.round(v * 100)}%</Text> },
  ];

  const alerteColumns: ColumnsType<AlerteResumee> = [
    { title: "Titre", dataIndex: "titre", render: v => <Text strong>{v}</Text> },
    { title: "Type", dataIndex: "type_alerte",
      render: v => <Tag color="purple" className="text-xs">{v.replaceAll("_", " ")}</Tag> },
    { title: "Sévérité", dataIndex: "severite", width: 100,
      render: v => <Tag color={SEVERITE_COLOR[v] ?? "default"}>{v}</Tag> },
    { title: "Date", dataIndex: "created_at", width: 160,
      render: v => <Text type="secondary" className="text-xs">{new Date(v).toLocaleString("fr-FR")}</Text> },
  ];

  const effColumns: ColumnsType<TrainingEffectiveness> = [
    { title: "Formation", dataIndex: "formation_titre", render: v => <Text strong>{v}</Text> },
    { title: "Gain niveau moy.", dataIndex: "avg_level_gain", align: "center", width: 140,
      render: v => {
        let color: string;
        if (v >= 1) {
          color = "success";
        } else if (v > 0) {
          color = "processing";
        } else {
          color = "default";
        }
        return <Tag color={color}>+{Number(v ?? 0).toFixed(2)}</Tag>;
      },
    },
    { title: "Taux complétion", dataIndex: "completion_rate", width: 160,
      render: v => <Progress percent={Math.round((v ?? 0) * 100)} size="small" strokeColor="#B51200" /> },
    { title: "Recommandée", dataIndex: "nb_recommandee", align: "center", width: 110,
      render: v => <Tag color="blue">{v}×</Tag> },
  ];

  const heatmap        = d?.department_gap_heatmap ?? [];
  const riskEvolution  = d?.monthly_risk_evolution ?? [];
  const effectiveness  = d?.training_effectiveness ?? [];
  const couverture     = d?.taux_couverture_departements ?? [];
  const modelPerf      = d?.model_performance;
  const modelAccuracy  = modelPerf?.gap_model_accuracy;

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
        <Alert message={error} type="error" showIcon closable className="mb-16 rounded-8" />
      )}

      <Spin spinning={loading}>
        {/* KPI row */}
        <Row gutter={[20, 20]} className="mb-24">
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
        <Row gutter={[20, 20]} className="mb-20">
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
        <Row gutter={[20, 20]} className="mb-20">
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

        {/* ── KPIs avancés ─────────────────────────────────────────── */}

        {/* Heatmap des gaps : Département × Compétence */}
        <Card
          title={<Space><HeatMapOutlined style={{ color: "#ef4444" }} /><Text strong>Heatmap des Gaps · Département × Compétence</Text></Space>}
          className="mt-20"
          size="small"
          extra={<Text type="secondary" className="text-xs">Gap moyen (0–5) — plus c'est rouge, plus l'écart collectif est fort</Text>}
        >
          <GapHeatmap data={heatmap} />
        </Card>

        {/* Évolution du risque + Performance du modèle */}
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col xs={24} lg={16}>
            <Card
              title={<Space><LineChartOutlined style={{ color: "#8b5cf6" }} /><Text strong>Évolution Mensuelle du Risque</Text></Space>}
              style={cardStyle}
              size="small"
            >
              <TrendLineChart data={riskEvolution} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<Space><ExperimentOutlined style={{ color: "#0ea5e9" }} /><Text strong>Performance du Modèle</Text></Space>}
              style={cardStyle}
              size="small"
            >
              <Space direction="vertical" size="large" className="w-full">
                <Statistic
                  title="Précision (R²) du modèle de gaps"
                  value={modelAccuracy ?? "—"}
                  precision={modelAccuracy == null ? undefined : 2}
                  valueStyle={{ color: modelAccuracy != null && modelAccuracy >= 0.7 ? "#10b981" : "#f59e0b" }}
                />
                <div>
                  <Text type="secondary" className="text-sm">Proba. de réussite moyenne (reco)</Text>
                  <div>
                    <Text strong className="text-lg">
                      {modelPerf?.recommendation_avg_proba == null
                        ? "—" : `${Math.round(modelPerf.recommendation_avg_proba * 100)}%`}
                    </Text>
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="text-sm">Dernier ré-entraînement</Text>
                  <div>
                    <Tag color={modelPerf?.last_retrain_status === "success" ? "green" : "default"}>
                      {modelPerf?.last_retrained
                        ? new Date(modelPerf.last_retrained).toLocaleString("fr-FR")
                        : "Jamais"}
                    </Tag>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Efficacité des formations + Couverture par département */}
        <Row gutter={[20, 20]} className="mt-20 mb-8">
          <Col xs={24} lg={14}>
            <Card
              title={<Space><TrophyOutlined style={{ color: "#B51200" }} /><Text strong>Efficacité des Formations</Text></Space>}
              style={cardStyle}
              size="small"
            >
              {effectiveness.length ? (
                <Table
                  dataSource={effectiveness}
                  columns={effColumns}
                  rowKey="formation_id"
                  pagination={{ pageSize: 5, size: "small" }}
                  size="small"
                />
              ) : (
                <Empty description="Aucune donnée d'efficacité" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><ApartmentOutlined style={{ color: "#10b981" }} /><Text strong>Couverture par Département</Text></Space>}
              style={cardStyle}
              size="small"
            >
              {couverture.length ? (
                <Space direction="vertical" size="middle" className="w-full">
                  {couverture.map((c: CouvertureDepartement) => (
                    <div key={c.departement}>
                      <Space className="d-flex-sb w-full">
                        <Text strong>{c.departement || "—"}</Text>
                        <Text type="secondary" className="text-xs">{c.nb_evalues} évalué(s)</Text>
                      </Space>
                      <Progress
                        percent={Math.round(c.taux_couverture)}
                        strokeColor={couvertureColor(c.taux_couverture)}
                        size="small"
                      />
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty description="Aucune donnée de couverture" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}




