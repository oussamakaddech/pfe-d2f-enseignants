import { Fragment, useRef, useState, type MouseEvent } from 'react';
import type { RiskTrendPoint } from '@/redesign/contract';
import { ChartSkeleton } from '../States';

const W = 600,
  H = 244,
  padX = 38,
  padY = 26;
const innerW = W - padX * 2,
  innerH = H - padY * 2;

function buildPath(
  values: number[],
  w: number,
  h: number,
  max: number,
  padX: number,
  padY: number,
): string {
  if (values.length === 0) return '';
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = padX + i * stepX;
      const y = padY + innerH - (max === 0 ? 0 : (v / max) * innerH);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function TrendChart({
  data,
  loading,
}: {
  readonly data: RiskTrendPoint[];
  readonly loading: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (loading && data.length === 0) return <ChartSkeleton height={244} />;
  if (data.length === 0) return <div className="rd-empty">Pas d'historique de risque</div>;

  const max = Math.max(4, ...data.map((d) => Math.max(d.critical, d.elevated)));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xOf = (i: number) => padX + i * stepX;
  const yOf = (v: number) => padY + innerH - (max === 0 ? 0 : (v / max) * innerH);

  const criticalPath = buildPath(
    data.map((d) => d.critical),
    W,
    H,
    max,
    padX,
    padY,
  );
  const elevatedPath = buildPath(
    data.map((d) => d.elevated),
    W,
    H,
    max,
    padX,
    padY,
  );
  const areaPath = `${criticalPath} L ${xOf(data.length - 1)} ${H - padY} L ${padX} ${H - padY} Z`;

  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let i = stepX === 0 ? 0 : Math.round((relX - padX) / stepX);
    i = Math.max(0, Math.min(data.length - 1, i));
    setHover(i);
  }

  return (
    <div className="rd-chart">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Tendance du risque"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rd-trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = yOf(t);
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={y}
                x2={W - padX}
                y2={y}
                stroke="var(--rd-border)"
                strokeWidth={1}
              />
              <text x={padX - 7} y={y + 3} textAnchor="end" className="rd-axis-label">
                {Math.round(t)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#rd-trend-area)" />
        <path
          d={elevatedPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path
          d={criticalPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <Fragment key={d.month}>
            <circle
              cx={xOf(i)}
              cy={yOf(d.critical)}
              r={hover === i ? 4.5 : 2.4}
              fill="#ef4444"
              className="rd-dot-hi"
            />
            <circle
              cx={xOf(i)}
              cy={yOf(d.elevated)}
              r={hover === i ? 4.5 : 2.4}
              fill="#f59e0b"
              className="rd-dot-hi"
            />
          </Fragment>
        ))}
        {hover != null && (
          <>
            <line
              className="rd-chart-hoverline"
              x1={xOf(hover)}
              y1={padY}
              x2={xOf(hover)}
              y2={H - padY}
            />
            <circle
              cx={xOf(hover)}
              cy={yOf(data[hover].critical)}
              r={5}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
            />
            <circle
              cx={xOf(hover)}
              cy={yOf(data[hover].elevated)}
              r={5}
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth={2}
            />
          </>
        )}
        {data.map((d, i) => (
          <text
            key={`t${d.month}`}
            x={xOf(i)}
            y={H - 5}
            textAnchor="middle"
            fontSize="10"
            fill="var(--rd-text-3)"
            style={{ display: i % labelEvery === 0 || i === data.length - 1 ? undefined : 'none' }}
          >
            {d.month}
          </text>
        ))}
      </svg>

      {hover != null && (
        <div className="rd-chart-tip" style={{ left: `${(xOf(hover) / W) * 100}%`, top: 4 }}>
          <div className="t-date">{data[hover].month}</div>
          <div className="t-row">
            <span className="t-k">
              <span className="rd-legend-swatch" style={{ background: '#ef4444' }} /> Critique
            </span>
            <span className="t-v">{data[hover].critical}</span>
          </div>
          <div className="t-row">
            <span className="t-k">
              <span className="rd-legend-swatch" style={{ background: '#f59e0b' }} /> Élevé
            </span>
            <span className="t-v">{data[hover].elevated}</span>
          </div>
        </div>
      )}

      <div className="rd-chart-legend">
        <span className="rd-legend-item">
          <span className="rd-legend-swatch" style={{ background: '#ef4444' }} /> Critique
        </span>
        <span className="rd-legend-item">
          <span className="rd-legend-swatch" style={{ background: '#f59e0b' }} /> Élevé
        </span>
      </div>
    </div>
  );
}
