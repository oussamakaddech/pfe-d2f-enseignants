import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Empty, Tag } from "antd";
import type { RiskHistoryPoint } from "../types";
import { RISK_LEVEL_LABELS } from "../constants";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface RiskHistoryChartProps {
  points: RiskHistoryPoint[];
  loading?: boolean;
}

/** Courbe d'evolution du score de risque dans le temps (F3). */
export default function RiskHistoryChart({ points, loading }: RiskHistoryChartProps) {
  if (loading) return <div>Chargement…</div>;
  if (!points || points.length === 0) return <Empty description="Aucun historique disponible" />;

  const labels = points.map((p) => p.date);
  const data = points.map((p) => Math.round(p.score * 100));

  const first = points[0].score;
  const last = points[points.length - 1].score;
  const delta = Math.round((last - first) * 100);
  const tendance =
    delta <= -3 ? { label: "Régression", color: "red" }
    : delta >= 3 ? { label: "Amélioration", color: "green" }
    : { label: "Stagnation", color: "orange" };

  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <Tag color={tendance.color}>{tendance.label}</Tag>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Variation sur la periode : {delta > 0 ? "+" : ""}{delta} pts
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          (dernier niveau : {RISK_LEVEL_LABELS[points[points.length - 1].niveau] ?? points[points.length - 1].niveau})
        </span>
      </div>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Score de risque (%)",
              data,
              borderColor: "#c8102e",
              backgroundColor: "rgba(200,16,46,0.12)",
              fill: true,
              tension: 0.3,
              pointRadius: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          scales: {
            y: {
              min: 0,
              max: 100,
              title: { display: true, text: "Score de risque (%)" },
            },
          },
        }}
      />
    </div>
  );
}
