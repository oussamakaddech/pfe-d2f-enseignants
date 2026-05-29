import { memo, useMemo } from "react";
import { Empty } from "antd";
import type { RiskEvolutionPoint } from "@/models/analyse";

interface TrendLineChartProps {
  readonly data: readonly RiskEvolutionPoint[];
  readonly height?: number;
}

const COLORS = { critical: "#ef4444", high: "#f59e0b" } as const;

/** Mini graphe en lignes (SVG natif, sans dépendance externe). */
const TrendLineChart = memo(function TrendLineChart({ data, height = 220 }: TrendLineChartProps) {
  const view = useMemo(() => {
    const width = Math.max(320, data.length * 64);
    const padX = 36;
    const padY = 20;
    const maxVal = Math.max(1, ...data.map((d) => Math.max(d.critical, d.high)));
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    const toXY = (i: number, v: number) => ({
      x: padX + i * stepX,
      y: padY + innerH - (v / maxVal) * innerH,
    });

    const buildPath = (key: "critical" | "high") =>
      data
        .map((d, i) => {
          const { x, y } = toXY(i, d[key]);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return { width, padX, padY, innerH, stepX, maxVal, toXY, buildPath };
  }, [data, height]);

  if (!data.length) {
    return <Empty description="Pas d'historique de risque disponible" />;
  }

  const gridLines = [0, 0.5, 1].map((r) => view.padY + view.innerH * (1 - r));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={view.width} height={height} role="img" aria-label="Évolution mensuelle du risque">
        {/* Lignes de grille horizontales */}
        {gridLines.map((y, i) => (
          <line key={i} x1={view.padX} y1={y} x2={view.width - view.padX} y2={y}
            stroke="#e5e7eb" strokeWidth={1} strokeDasharray={i === gridLines.length - 1 ? "0" : "3 3"} />
        ))}
        {(["high", "critical"] as const).map((key) => (
          <g key={key}>
            <path d={view.buildPath(key)} fill="none" stroke={COLORS[key]} strokeWidth={2.5} />
            {data.map((d, i) => {
              const { x, y } = view.toXY(i, d[key]);
              return <circle key={i} cx={x} cy={y} r={3.5} fill={COLORS[key]} />;
            })}
          </g>
        ))}
        {/* Labels des mois */}
        {data.map((d, i) => {
          const x = view.padX + i * view.stepX;
          return (
            <text key={d.month} x={x} y={height - 4} textAnchor="middle" fontSize={11} fill="#64748b">
              {d.month}
            </text>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 13 }}>
        <LegendDot color={COLORS.critical} label="Critique" />
        <LegendDot color={COLORS.high} label="Élevé" />
      </div>
    </div>
  );
});

function LegendDot({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

export default TrendLineChart;
