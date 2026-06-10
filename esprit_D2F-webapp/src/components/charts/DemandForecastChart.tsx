import { memo, useMemo } from "react";
import { Empty } from "antd";
import type { DemandForecast } from "@/models/analyse";

const HIST_COLOR = "#b51200"; // rouge marque
const FC_COLOR = "#00b4d8";   // accent bleu

interface DemandForecastChartProps {
  readonly data?: DemandForecast;
  readonly height?: number;
}

/** Série mensuelle (historique plein) + projection (pointillé) avec bande de confiance.
 *  SVG natif, sans dépendance externe (aligné sur TrendLineChart). */
const DemandForecastChart = memo(function DemandForecastChart({ data, height = 240 }: DemandForecastChartProps) {
  const view = useMemo(() => {
    const hist = data?.history ?? [];
    const fc = data?.forecast ?? [];
    if (hist.length === 0) return null;

    const all = [...hist, ...fc];
    const n = all.length;
    const H = hist.length;
    const width = Math.max(360, n * 56);
    const padX = 40;
    const padTop = 16;
    const padBottom = 28;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;
    const maxVal = Math.max(1, ...all.map((p) => Math.max(p.value, p.upper ?? 0)));
    const stepX = n > 1 ? innerW / (n - 1) : 0;
    const X = (i: number) => padX + i * stepX;
    const Y = (v: number) => padTop + innerH - (v / maxVal) * innerH;

    const histPts = hist.map((p, i) => `${X(i)},${Y(p.value)}`).join(" ");
    // Inclut le dernier point d'historique pour une jonction continue.
    const fcPts = [hist[H - 1], ...fc].map((p, i) => `${X(H - 1 + i)},${Y(p.value)}`).join(" ");

    let bandPts = "";
    if (fc.length > 0) {
      const upper = fc.map((p, i) => `${X(H + i)},${Y(p.upper ?? p.value)}`);
      const lower = fc.map((p, i) => `${X(H + i)},${Y(p.lower ?? p.value)}`).reverse();
      bandPts = [`${X(H - 1)},${Y(hist[H - 1].value)}`, ...upper, ...lower].join(" ");
    }

    const labels = all.map((p, i) => ({ x: X(i), label: p.month, show: n <= 9 || i % 2 === 0 }));
    return { width, histPts, fcPts, bandPts, all, H, X, Y, boundaryX: X(H - 1), padTop, innerH, labels };
  }, [data, height]);

  if (!view) {
    return <Empty description={data?.note ?? "Historique insuffisant pour une prévision"} />;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={view.width} height={height} role="img" aria-label="Prévision de la demande de formation">
        {view.bandPts && <polygon points={view.bandPts} fill="rgba(0, 180, 216, 0.12)" stroke="none" />}
        <line
          x1={view.boundaryX} y1={view.padTop} x2={view.boundaryX} y2={view.padTop + view.innerH}
          stroke="var(--border-color-strong)" strokeDasharray="3 3"
        />
        <polyline points={view.histPts} fill="none" stroke={HIST_COLOR} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={view.fcPts} fill="none" stroke={FC_COLOR} strokeWidth={2.5} strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" />
        {view.all.map((p, i) => (
          <circle key={`${p.month}-${i}`} cx={view.X(i)} cy={view.Y(p.value)} r={3} fill={i < view.H ? HIST_COLOR : FC_COLOR} />
        ))}
        {view.labels.map((l, i) => l.show && (
          <text key={`${l.label}-${i}`} x={l.x} y={height - 8} fontSize={10} fill="var(--neutral-500)" textAnchor="middle">{l.label}</text>
        ))}
      </svg>
      <div className="analyse-forecast-legend">
        <span><i style={{ background: HIST_COLOR }} />Historique</span>
        <span><i style={{ background: FC_COLOR }} />Projection</span>
        <span><i style={{ background: "rgba(0, 180, 216, 0.25)" }} />Intervalle de confiance</span>
      </div>
    </div>
  );
});

export default DemandForecastChart;
