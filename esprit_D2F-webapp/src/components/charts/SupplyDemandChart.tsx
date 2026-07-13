import { memo, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import {
  Empty, Spin, Tag, Segmented, Space, Typography, Row, Col,
} from "antd";
import {
  ArrowUpOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import { cardTooltip, subtleGrid, axisTicks } from "./chartTheme";
import type { SupplyDemandItem } from "@/models/analyse";

const { Text } = Typography;

interface SupplyDemandChartProps {
  readonly data: SupplyDemandItem[] | undefined;
  readonly loading: boolean;
  readonly height?: number;
}

const QUADRANT_CONFIG: Record<string, { color: string; label: string; tag: string }> = {
  INVESTIR: { color: "#ef4444", label: "Investir", tag: "red" },
  MAINTENIR: { color: "#10b981", label: "Maintenir", tag: "green" },
  SURPLUS: { color: "#6b7280", label: "Surplus", tag: "default" },
  SURVEILLER: { color: "#f59e0b", label: "Surveiller", tag: "orange" },
};

/**
 * Matrice Offre vs Demande par compétence.
 * Barres groupées : couverture (offre) vs score de demande.
 * Couleur selon le quadrant stratégique (INVESTIR / MAINTENIR / SURPLUS / SURVEILLER).
 */
const SupplyDemandChart = memo(function SupplyDemandChart({
  data, loading, height = 340,
}: SupplyDemandChartProps) {
  const [topN, setTopN] = useState<number>(10);

  const sorted = useMemo(() => {
    if (!data) return [];
    // Tri par score de demande décroissant (priorité d'action)
    return [...data].sort((a, b) => b.demand_score - a.demand_score).slice(0, topN);
  }, [data, topN]);

  const chartData = useMemo(() => {
    const labels = sorted.map((d) =>
      d.competence_nom.length > 20 ? `${d.competence_nom.slice(0, 18)}…` : d.competence_nom,
    );
    return {
      labels,
      datasets: [
        {
          label: "Demande (0-1)",
          data: sorted.map((d) => d.demand_score),
          backgroundColor: sorted.map((d) => QUADRANT_CONFIG[d.quadrant]?.color || "#3b82f6"),
          borderRadius: 4,
          maxBarThickness: 22,
        },
        {
          label: "Couverture (offre)",
          data: sorted.map((d) => d.supply_ratio),
          backgroundColor: sorted.map((d) =>
            d.supply_ratio >= 0.6 ? "#10b98155" : "#ef444455",
          ),
          borderRadius: 4,
          maxBarThickness: 22,
        },
      ],
    };
  }, [sorted]);

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 8 } },
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Inter", size: 12 }, color: "#6b7280", boxWidth: 14 },
        },
        tooltip: {
          ...(cardTooltip as object),
          callbacks: {
            label: (ctx) => {
              const idx = ctx.dataIndex;
              const item = sorted[idx];
              if (!item) return "";
              if (ctx.datasetIndex === 0) {
                return ` Demande: ${(item.demand_score * 100).toFixed(0)}% (${QUADRANT_CONFIG[item.quadrant]?.label || item.quadrant})`;
              }
              return ` Couverture: ${(item.supply_ratio * 100).toFixed(0)}% • ${item.nb_enseignants} ens. • ${item.nb_critiques} critiques`;
            },
          },
        },
      },
      scales: {
        x: { beginAtZero: true, max: 1, grid: subtleGrid, ticks: { ...axisTicks, callback: (v) => `${Number(v) * 100}%` } },
        y: { grid: { display: false }, ticks: { ...axisTicks, autoSkip: false } },
      },
    }),
    [sorted],
  );

  // Summary stats by quadrant
  const quadrantStats = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      counts[d.quadrant] = (counts[d.quadrant] || 0) + 1;
    });
    return Object.entries(QUADRANT_CONFIG).map(([key, cfg]) => ({
      key,
      ...cfg,
      count: counts[key] || 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <Empty description="Aucune donnée offre/demande disponible" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div>
      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        {quadrantStats.map((q) => (
          <Col key={q.key}>
            <Tag color={q.tag} style={{ fontSize: 12 }}>
              {q.label}: <Text strong>{q.count}</Text>
            </Tag>
          </Col>
        ))}
      </Row>

      <Space style={{ marginBottom: 8, width: "100%", justifyContent: "flex-end" }}>
        <Segmented
          size="small"
          value={topN}
          onChange={(v) => setTopN(v as number)}
          options={[
            { label: "Top 5", value: 5 },
            { label: "Top 10", value: 10 },
            { label: "Top 20", value: 20 },
          ]}
        />
      </Space>

      <div style={{ position: "relative", width: "100%", height }}>
        <Bar data={chartData} options={options} />
      </div>

      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          <AppstoreOutlined /> {data.length} compétence(s) analysée(s) —
          triées par score de demande décroissant.
          <ArrowUpOutlined style={{ color: "#ef4444", marginLeft: 8 }} /> demande élevée / couverture faible = priorité d'action.
        </Text>
      </div>
    </div>
  );
});

export default SupplyDemandChart;
