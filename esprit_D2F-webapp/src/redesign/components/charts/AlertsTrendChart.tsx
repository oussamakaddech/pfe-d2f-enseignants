import { useRef, useState, type MouseEvent } from "react";
import type { AlertTrendPoint } from "@/models/analyse/predictive";
import { ChartSkeleton } from "../States";

const W = 600, H = 232, padX = 38, padY = 22;
const innerW = W - padX * 2, innerH = H - padY * 2;

export default function AlertsTrendChart({ data, loading }: { data: AlertTrendPoint[]; loading: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (loading && data.length === 0) return <ChartSkeleton height={232} />;
  if (data.length === 0) return <div className="rd-empty">Pas d'historique d'alertes</div>;

  const max = Math.max(1, ...data.map((d) => Math.max(d.total, d.critiques)));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xOf = (i: number) => padX + i * stepX;
  const yOf = (v: number) => padY + innerH - (v / max) * innerH;

  const totalPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d.total).toFixed(1)}`).join(" ");
  const critPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d.critiques).toFixed(1)}`).join(" ");

  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let i = stepX === 0 ? 0 : Math.round((relX - padX) / stepX);
    i = Math.max(0, Math.min(data.length - 1, i));
    setHover(i);
  }

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  const fmtFull = (iso: string) => {
    const [y, m, d] = iso.split("-");
    const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    return `${d} ${months[Number(m) - 1]} ${y}`;
  };

  return (
    <div className="rd-chart">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Tendance des alertes sur 30 jours"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rd-alert-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
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
        <path d={`${totalPath} L ${xOf(data.length - 1)} ${H - padY} L ${padX} ${H - padY} Z`} fill="url(#rd-alert-area)" />
        <path d={critPath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={totalPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={xOf(i)} cy={yOf(d.total)} r={hover === i ? 4.5 : 2.4} fill="#3b82f6" className="rd-dot-hi" />
        ))}
        {hover != null && (
          <>
            <line className="rd-chart-hoverline" x1={xOf(hover)} y1={padY} x2={xOf(hover)} y2={H - padY} />
            <circle cx={xOf(hover)} cy={yOf(data[hover].total)} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
            <circle cx={xOf(hover)} cy={yOf(data[hover].critiques)} r={4} fill="#ef4444" stroke="#fff" strokeWidth={2} />
          </>
        )}
        {data.map((d, i) => (
          <text key={`t${i}`} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--rd-text-3)"
            style={{ display: i % labelEvery === 0 || i === data.length - 1 ? undefined : "none" }}>
            {fmtDate(d.date)}
          </text>
        ))}
      </svg>

      {hover != null && (
        <div className="rd-chart-tip" style={{ left: `${(xOf(hover) / W) * 100}%`, top: 4 }}>
          <div className="t-date">{fmtFull(data[hover].date)}</div>
          <div className="t-row">
            <span className="t-k"><span className="rd-legend-swatch" style={{ background: "#3b82f6" }} /> Total</span>
            <span className="t-v">{data[hover].total}</span>
          </div>
          <div className="t-row">
            <span className="t-k"><span className="rd-legend-swatch" style={{ background: "#ef4444" }} /> Critiques</span>
            <span className="t-v">{data[hover].critiques}</span>
          </div>
        </div>
      )}

      <div className="rd-chart-legend">
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#3b82f6" }} /> Total</span>
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#ef4444" }} /> Critiques</span>
      </div>
    </div>
  );
}
