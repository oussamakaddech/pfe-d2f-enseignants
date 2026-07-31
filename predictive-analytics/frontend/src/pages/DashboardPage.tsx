import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  useDashboardAtRisk,
  useDashboardHeatmap,
  useDashboardKpis,
  useDashboardTrainingDemand,
} from "../hooks/useAnalytics";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { KpiCard } from "../components/KpiCard";
import { SEVERITY_COLOR, formatPercent, formatScore, riskLevelLabel } from "../lib/format";
import type { RiskRow, TrainingDemandRow } from "../api/types";

ChartJS.register(LinearScale, CategoryScale, BarElement, ChartTooltip, Legend);

const riskColumns: ColumnsType<RiskRow> = [
  { title: "Enseignant", dataIndex: "teacher_id", render: (v: string) => <strong>{v}</strong> },
  { title: "Département", dataIndex: "department_code", width: 120 },
  {
    title: "Score de risque",
    dataIndex: "risk_score",
    width: 200,
    render: (value: number, row) => (
      <Tooltip title={riskLevelLabel(row.risk_level)}>
        <Progress percent={Math.round(value * 100)} size="small" strokeColor={SEVERITY_COLOR[row.risk_level as keyof typeof SEVERITY_COLOR] ?? "#8c8c8c"} />
      </Tooltip>
    ),
  },
  { title: "Gap principal", dataIndex: "top_gap", ellipsis: true },
  { title: "Nb gaps", dataIndex: "gap_count", width: 90 },
];

const demandColumns: ColumnsType<TrainingDemandRow> = [
  { title: "Formation", dataIndex: "title", render: (v: string, row) => <span><strong>{v}</strong> <Tag>{row.training_id}</Tag></span> },
  { title: "Demande", dataIndex: "demand_count", width: 110 },
  { title: "Pertinence moy.", dataIndex: "avg_relevance", width: 130, render: (v: number) => formatScore(v) },
  { title: "Domaines cibles", dataIndex: "target_domains", render: (v: string[]) => v.map((d) => <Tag key={d}>{d}</Tag>) },
];

const SEVERITY_ORDER: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

export function DashboardPage() {
  const kpis = useDashboardKpis();
  const atRisk = useDashboardAtRisk();
  const heatmap = useDashboardHeatmap();
  const demand = useDashboardTrainingDemand();

  if (kpis.error) return <ApiErrorBanner error={kpis.error} />;

  const cells = heatmap.data?.cells ?? [];
  const domains = [...new Set(cells.map((c) => c.domain_id))];
  const departments = [...new Set(cells.map((c) => c.department_code))].sort();

  const heatmapData = {
    labels: departments,
    datasets: domains.map((domain, index) => ({
      label: domain,
      data: departments.map((dept) => {
        const cell = cells.find((c) => c.department_code === dept && c.domain_id === domain);
        return cell ? Math.round(cell.weighted_severity * 10) / 10 : 0;
      }),
      backgroundColor: `hsl(${(index * 60) % 360} 65% 55%)`,
    })),
  };

  const mostSevereDomain = (dept: string): string => {
    const deptCells = cells.filter((c) => c.department_code === dept);
    if (!deptCells.length) return "—";
    return deptCells.reduce((a, b) =>
      SEVERITY_ORDER[b.max_severity] > SEVERITY_ORDER[a.max_severity] ? b : a,
    ).domain_id;
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4}>Pilotage prédictif — vue globale</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Enseignants (référentiel)" value={kpis.data?.total_teachers ?? 0} /></Col>
        <Col xs={12} md={6}><KpiCard title="Avec données d'évaluation" value={kpis.data?.teachers_with_data ?? 0} /></Col>
        <Col xs={12} md={6}><KpiCard title="À risque" value={kpis.data?.teachers_at_risk ?? 0} color={kpis.data?.teachers_at_risk ? "#f5222d" : undefined} /></Col>
        <Col xs={12} md={6}><KpiCard title="Risque moyen" value={formatScore((kpis.data?.avg_risk_score ?? 0) * 100, 0) as unknown as number} suffix="%" /></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Gaps ouverts" value={kpis.data?.total_open_gaps ?? 0} /></Col>
        <Col xs={12} md={6}><KpiCard title="Gaps critiques" value={kpis.data?.critical_gaps ?? 0} color={(kpis.data?.critical_gaps ?? 0) > 0 ? "#f5222d" : undefined} /></Col>
        <Col xs={12} md={6}><KpiCard title="Besoin formation ouverts" value={kpis.data?.open_needs ?? 0} /></Col>
        <Col xs={12} md={6}><KpiCard title="Taux de complétion" value={formatPercent(kpis.data?.completion_rate)} /></Col>
      </Row>

      {atRisk.data && atRisk.data.rows.length > 0 && (
        <Card title="Enseignants à risque de stagnation" size="small">
          <Table<RiskRow> size="small" rowKey="teacher_id" columns={riskColumns} dataSource={atRisk.data.rows} pagination={{ pageSize: 5, hideOnSinglePage: true }} />
        </Card>
      )}

      {demand.data && demand.data.rows.length > 0 && (
        <Card title="Demande de formation (agrégée)" size="small">
          <Table<TrainingDemandRow> size="small" rowKey="training_id" columns={demandColumns} dataSource={demand.data.rows} pagination={false} />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Intensité des gaps par domaine et département" size="small">
            {domains.length > 0 ? (
              <Bar
                data={heatmapData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: "bottom" } },
                  scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: "Sévérité pondérée" } } },
                }}
              />
            ) : (
              <Alert type="info" showIcon message="Aucune donnée de heatmap disponible" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Domaine le plus critique par département" size="small">
            <Table
              size="small"
              rowKey="department"
              pagination={false}
              dataSource={departments.map((dept) => ({
                department: dept,
                top: mostSevereDomain(dept),
              }))}
              columns={[
                { title: "Département", dataIndex: "department" },
                { title: "Domaine critique", dataIndex: "top" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
