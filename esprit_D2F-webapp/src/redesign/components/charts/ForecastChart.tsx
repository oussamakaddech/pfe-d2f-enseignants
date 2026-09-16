import { useRef, useState, type MouseEvent } from "react";
import type { ForecastView } from "@/redesign/contract";
import { ChartSkeleton } from "../States";

const W = 600, H = 244, padX = 38, padY = 24;
const innerW = W - padX * 2, innerH = H - padY * 2;

export default function ForecastChart({ view, loading }: { readonly view: ForecastView | null; readonly loading: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (loading && !view) return <ChartSkeleton height={244} />;
  if (!view || view.series.length === 0) return <div className="rd-empty">Aucune prévision disponible</div>;

  const series = view.series;
  const max = Math.max(1, ...series.map((p) => Math.max(p.value, p.upper ?? p.value)));
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const xOf = (i: number) => padX + i * stepX;
  const yOf = (v: number) => padY + innerH - (v / max) * innerH;

  const history = series.filter((p) => !p.isProjection);
  const projection = series.filter((p) => p.isProjection);
  const histPath = history.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(p.value).toFixed(1)}`).join(" ");
  const areaPath =
    history.length > 1
      ? `${histPath} L ${xOf(history.length - 1)} ${H - padY} L ${xOf(0)} ${H - padY} Z`
      : "";

  const projStart = history.length - 1;
  const projPts = [history.at(-1), ...projection].filter((p): p is (typeof projection)[number] => p != null);
  const projPath = projPts.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(projStart + i)} ${yOf(p.value).toFixed(1)}`).join(" ");

  const bandTop = projection.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(history.length + i)} ${yOf(p.upper ?? p.value).toFixed(1)}`).join(" ");
  const bandBottom = [...projection].reverse().map((p, idx) => {
    const i = projection.length - 1 - idx;
    return `L ${xOf(history.length + i)} ${yOf(p.lower ?? p.value).toFixed(1)}`;
  }).join(" ");
  const bandPath = projection.length ? `${bandTop} ${bandBottom} Z` : "";

  const splitX = xOf(history.length - 1);
  const ticks = [0, max / 2, max];

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let i = stepX === 0 ? 0 : Math.round((relX - padX) / stepX);
    i = Math.max(0, Math.min(series.length - 1, i));
    setHover(i);
  }

  const labelEvery = Math.max(1, Math.ceil(series.length / 8));

  return (
    <div className="rd-chart">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Prévision de la demande"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rd-fc-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rd-fc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b51200" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#b51200" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = yOf(t);
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="var(--rd-border)" strokeWidth={1} />
              <text x={padX - 7} y={y + 3} textAnchor="end" className="rd-axis-label">{Math.round(t)}</text>
            </g>
          );
        })}
        {bandPath && <path d={bandPath} fill="url(#rd-fc-band)" />}
        {areaPath && <path d={areaPath} fill="url(#rd-fc-area)" className="rd-fc-area" />}
        <line x1={splitX} y1={padY} x2={splitX} y2={H - padY} stroke="var(--rd-text-3)" strokeDasharray="4 4" strokeWidth={1} />
        <path d={histPath} fill="none" stroke="#b51200" strokeWidth={2.5} strokeLinejoin="round" pathLength={1} className="rd-fc-line" />
        <path d={projPath} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 5" strokeLinejoin="round" pathLength={1} className="rd-fc-line-proj" />
        {series.map((p, i) => (
          <circle key={p.period} cx={xOf(i)} cy={yOf(p.value)} r={p.isProjection ? 3 : 3.5} fill={p.isProjection ? "#7c3aed" : "#b51200"} />
        ))}
        {hover != null && (
          <>
            <line className="rd-chart-hoverline" x1={xOf(hover)} y1={padY} x2={xOf(hover)} y2={H - padY} />
            <circle cx={xOf(hover)} cy={yOf(series[hover].value)} r={5} fill={series[hover].isProjection ? "#7c3aed" : "#b51200"} stroke="#fff" strokeWidth={2} />
          </>
        )}
        {series.map((p, i) => (
          <text key={`t${p.period}`} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--rd-text-3)"
            style={{ display: i % labelEvery === 0 || i === series.length - 1 ? undefined : "none" }}>
            {p.period}
          </text>
        ))}
      </svg>

      {hover != null && (
        <div className="rd-chart-tip" style={{ left: `${(xOf(hover) / W) * 100}%`, top: 4 }}>
          <div className="t-date">{series[hover].period}{series[hover].isProjection ? " · projection" : ""}</div>
          <div className="t-row">
            <span className="t-k">Valeur</span>
            <span className="t-v">{Math.round(series[hover].value)}</span>
          </div>
          {series[hover].isProjection && (series[hover].lower != null || series[hover].upper != null) && (
            <div className="t-row">
              <span className="t-k">Intervalle</span>
              <span className="t-v">{Math.round(series[hover].lower ?? series[hover].value)}–{Math.round(series[hover].upper ?? series[hover].value)}</span>
            </div>
          )}
        </div>
      )}

      <div className="rd-chart-legend">
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#b51200" }} /> Historique</span>
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#7c3aed" }} /> Projection{projection.length > 0 ? ` (${projection.length} mois)` : ""}</span>
        <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "rgba(124,58,237,0.25)" }} /> Intervalle de confiance</span>
      </div>
      {view.note && <div className="rd-muted" style={{ fontSize: 11.5, marginTop: 6 }}>{view.note}</div>}
    </div>
  );
}
