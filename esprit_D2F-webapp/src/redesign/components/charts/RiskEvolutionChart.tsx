import { useRef, useState, type MouseEvent } from "react";
import type { RiskEvolutionPoint } from "@/models/analyse";
import { ChartSkeleton } from "../States";

const W = 600, H = 230, padX = 40, padY = 22;
const innerW = W - padX * 2, innerH = H - padY * 2;

export default function RiskEvolutionChart({
  points,
  loading,
}: {
  points: RiskEvolutionPoint[];
  loading: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (loading && points.length === 0) return <ChartSkeleton height={230} />;
  if (points.length === 0) return <div className="rd-empty">Aucune donnée d'évolution</div>;

  const max = Math.max(1, ...points.map((p) => Math.max(p.critical, p.high)));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const xOf = (i: number) => padX + i * stepX;
  const yOf = (v: number) => padY + innerH - (v / max) * innerH;

  const seriesPath = (key: "critical" | "high") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(p[key]).toFixed(1)}`).join(" ");
  const areaPath = (key: "critical" | "high") =>
    `${seriesPath(key)} L ${xOf(points.length - 1)} ${H - padY} L ${xOf(0)} ${H - padY} Z`;

  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let i = stepX === 0 ? 0 : Math.round((relX - padX) / stepX);
    i = Math.max(0, Math.min(points.length - 1, i));
    setHover(i);
  }

  return (
    <div className="rd-chart">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Évolution mensuelle du risque"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rd-evo-crit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rd-evo-high" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const y = yOf(t);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="var(--rd-border)" strokeWidth={1} />
              <text x={padX - 7} y={y + 3} textAnchor="end" className="rd-axis-label">{Math.round(t)}</text>
            </g>
          );
        })}
        <path d={areaPath("critical")} fill="url(#rd-evo-crit)" />
        <path d={areaPath("high")} fill="url(#rd-evo-high)" />
        <path d={seriesPath("critical")} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={seriesPath("high")} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xOf(i)} cy={yOf(p.critical)} r={3} fill="#ef4444" />
            <circle cx={xOf(i)} cy={yOf(p.high)} r={3} fill="#f97316" />
          </g>
        ))}
        {hover != null && (
          <>
            <line className="rd-chart-hoverline" x1={xOf(hover)} y1={padY} x2={xOf(hover)} y2={H - padY} />
            <circle cx={xOf(hover)} cy={yOf(points[hover].critical)} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
            <circle cx={xOf(hover)} cy={yOf(points[hover].high)} r={5} fill="#f97316" stroke="#fff" strokeWidth={2} />
          </>
        )}
        {points.map((p, i) => (
          <text key={`t${i}`} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--rd-text-3)"
            style={{ display: i % labelEvery === 0 || i === points.length - 1 ? undefined : "none" }}>
            {p.month}
          </text>
        ))}
      </svg>

      {hover != null && (
        <div className="rd-chart-tip" style={{ left: `${(xOf(hover) / W) * 100}%`, top: 4 }}>
          <div className="t-date">{points[hover].month}</div>
          <div className="t-row"><span className="t-k"><span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444", display: "inline-block" }} /> Critiques</span><span className="t-v">{points[hover].critical}</span></div>
          <div className="t-row"><span className="t-k"><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f97316", display: "inline-block" }} /> Élevés</span><span className="t-v">{points[hover].high}</span></div>
        </div>
      )}

      <div className="rd-chart-legend">
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#ef4444" }} /> Risque critique</span>
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#f97316" }} /> Risque élevé</span>
      </div>
    </div>
  );
}
