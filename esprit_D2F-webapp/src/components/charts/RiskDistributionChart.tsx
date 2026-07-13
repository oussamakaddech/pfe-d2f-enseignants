import { memo, useMemo } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import {
  Empty, Spin, Row, Col, Statistic, Tag, Typography, Progress, Space,
} from "antd";
import {
  PieChartOutlined, BarChartOutlined, TeamOutlined,
} from "@ant-design/icons";
import {
  cardTooltip, subtleGrid, axisTicks, bottomLegend,
  hexToRgba,
} from "./chartTheme";
import type { RiskDistribution } from "@/models/analyse";

const { Text } = Typography;

interface RiskDistributionChartProps {
  readonly data: RiskDistribution | undefined;
  readonly loading: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  CRITIQUE: "#ef4444",
  ELEVE: "#f97316",
  MODERE: "#f59e0b",
  FAIBLE: "#10b981",
};

const LEVEL_LABELS: Record<string, string> = {
  CRITIQUE: "Critique",
  ELEVE: "Élevé",
  MODERE: "Modéré",
  FAIBLE: "Faible",
};

const BUCKET_COLORS = ["#10b981", "#6ee7b7", "#f59e0b", "#f97316", "#ef4444"];

function bucketColor(index: number): string {
  return BUCKET_COLORS[index] || "#6b7280";
}

/**
 * Distribution du risque : histogramme par tranche (0.0-0.2 … 0.8-1.0)
 * + donut de répartition par niveau + top départements par risque moyen.
 */
const RiskDistributionChart = memo(function RiskDistributionChart({
  data, loading,
}: RiskDistributionChartProps) {
  // ── Histogram data ──
  const histogramData = useMemo(() => {
    if (!data) return null;
    return {
      labels: data.histogram.map((b) => b.range),
      datasets: [
        {
          label: "Enseignants",
          data: data.histogram.map((b) => b.count),
          backgroundColor: data.histogram.map((_, i) => hexToRgba(bucketColor(i), 0.75)),
          borderColor: data.histogram.map((_, i) => bucketColor(i)),
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 40,
        },
      ],
    };
  }, [data]);

  const histogramOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...(cardTooltip as object),
          callbacks: {
            title: (items) => `Tranche ${items[0]?.label || ""}`,
            label: (ctx) => {
              const pct = data?.total ? Math.round((ctx.parsed.y / data.total) * 100) : 0;
              return ` ${ctx.parsed.y} enseignant(s) (${pct}%)`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: axisTicks },
        y: { beginAtZero: true, grid: subtleGrid, ticks: { ...axisTicks, stepSize: 1 } },
      },
    }),
    [data],
  );

  // ── Donut data (by_level) ──
  const donutData = useMemo(() => {
    if (!data) return null;
    const levels = Object.entries(data.by_level);
    return {
      labels: levels.map(([k]) => LEVEL_LABELS[k] || k),
      datasets: [
        {
          data: levels.map(([, v]) => v),
          backgroundColor: levels.map(([k]) => LEVEL_COLORS[k] || "#6b7280"),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [data]);

  const donutOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { ...bottomLegend },
        tooltip: {
          ...(cardTooltip as object),
          callbacks: {
            label: (ctx) => {
              const total = data?.total || 1;
              const pct = Math.round((ctx.parsed / total) * 100);
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            },
          },
        },
      },
    }),
    [data],
  );

  // ── Top departments ──
  const topDepts = useMemo(() => {
    if (!data) return [];
    return data.by_department.slice(0, 5);
  }, [data]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return <Empty description="Aucune donnée de distribution de risque" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  // Critical ratio for the summary
  const criticalCount = data.by_level.CRITIQUE || 0;
  const eleveCount = data.by_level.ELEVE || 0;
  const atRiskCount = criticalCount + eleveCount;
  const atRiskRatio = data.total > 0 ? Math.round((atRiskCount / data.total) * 100) : 0;

  return (
    <Row gutter={[16, 16]}>
      {/* ── Summary stats ── */}
      <Col xs={24} lg={24}>
        <Row gutter={[16, 8]}>
          <Col xs={8}>
            <Statistic
              title="Total enseignants"
              value={data.total}
              prefix={<TeamOutlined style={{ color: "#b51200" }} />}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Enseignants à risque"
              value={atRiskCount}
              suffix={`(${atRiskRatio}%)`}
              valueStyle={{ color: (() => {
                if (atRiskRatio > 20) return "#ef4444";
                if (atRiskRatio > 10) return "#f59e0b";
                return "#10b981";
              })() }}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Critiques"
              value={criticalCount}
              valueStyle={{ color: criticalCount > 0 ? "#ef4444" : "#10b981" }}
            />
          </Col>
        </Row>
        {atRiskRatio > 20 && (
          <Tag color="red" style={{ marginTop: 8 }}>
            ⚠ Plus de 20% des enseignants présentent un risque élevé ou critique
          </Tag>
        )}
      </Col>

      {/* ── Histogram ── */}
      <Col xs={24} lg={14}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
          <BarChartOutlined style={{ color: "#b51200" }} />
          <Text strong>Histogramme par tranche de score</Text>
        </div>
        <div style={{ position: "relative", width: "100%", height: 240 }}>
          <Bar data={histogramData!} options={histogramOptions} />
        </div>
      </Col>

      {/* ── Donut ── */}
      <Col xs={24} lg={10}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
          <PieChartOutlined style={{ color: "#b51200" }} />
          <Text strong>Répartition par niveau</Text>
        </div>
        <div style={{ position: "relative", width: "100%", height: 240 }}>
          <Doughnut data={donutData!} options={donutOptions} />
        </div>
      </Col>

      {/* ── Top departments ── */}
      {topDepts.length > 0 && (
        <Col xs={24}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
            <TeamOutlined style={{ color: "#b51200" }} />
            <Text strong>Top départements par risque moyen</Text>
          </div>
          {topDepts.map((dept, idx) => (
            <div key={dept.departement} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <Space size={4}>
                  <Text strong style={{ fontSize: 12 }}>{idx + 1}. {dept.departement}</Text>
                  <Tag style={{ fontSize: 11 }}>{dept.nb_enseignants} ens.</Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {(dept.score_risque_moyen * 100).toFixed(1)}%
                </Text>
              </div>
              <Progress
                percent={Math.round(dept.score_risque_moyen * 100)}
                strokeColor={(() => {
                  if (dept.score_risque_moyen >= 0.7) return "#ef4444";
                  if (dept.score_risque_moyen >= 0.5) return "#f97316";
                  if (dept.score_risque_moyen >= 0.3) return "#f59e0b";
                  return "#10b981";
                })()}
                size="small"
                showInfo={false}
              />
            </div>
          ))}
        </Col>
      )}
    </Row>
  );
});

export default RiskDistributionChart;
