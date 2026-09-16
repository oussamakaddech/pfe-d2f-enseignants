import { useState } from "react";
import { Empty } from "antd";

interface PolarItem {
  label: string;
  value: number;
  color?: string;
}

export default function PolarAreaChart({
  items,
  size = 220,
  innerRadius = 50,
}: {
  readonly items: PolarItem[];
  readonly size?: number;
  readonly innerRadius?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune donnée" />;
  }

  const palette = [
    "#6366f1", "#8b5cf6", "#0ea5e9", "#06b6d4", "#10b981",
    "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#b51200",
  ];

  const cx = size / 2;
  const cy = size / 2;
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const outerR = (size / 2) - 12;
  const total = items.reduce((s, i) => s + i.value, 0);

  let startAngle = -Math.PI / 2;

  const segments = items.map((item, idx) => {
    const fraction = total > 0 ? item.value / total : 0;
    const angle = fraction * 2 * Math.PI;
    const r = innerRadius + (outerR - innerRadius) * (item.value / maxVal);
    const endAngle = startAngle + angle;
    const midAngle = startAngle + angle / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const color = item.color ?? palette[idx % palette.length];
    const seg = { d, color, label: item.label, value: item.value, fraction, midAngle, r };
    startAngle = endAngle;
    return seg;
  });

  const active = hoveredIdx != null ? segments[hoveredIdx] : null;

  return (
    <div className="polar-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, idx) => (
          <path
            key={seg.label}
            d={seg.d}
            fill={seg.color}
            opacity={hoveredIdx != null && hoveredIdx !== idx ? 0.45 : 0.85}
            stroke="var(--rd-surface, #fff)"
            strokeWidth={2}
            style={{ transition: "opacity .2s, transform .2s", cursor: "pointer", transformOrigin: `${cx}px ${cy}px`, transform: hoveredIdx === idx ? "scale(1.04)" : "scale(1)" }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
        <circle cx={cx} cy={cy} r={innerRadius} fill="var(--rd-surface, #fff)" />
        {active ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--rd-text, #0f172a)">
              {active.value.toLocaleString("fr-FR")}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="var(--rd-text-3, #94a3b8)" fontWeight="600">
              {active.label}
            </text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--rd-text, #0f172a)">
              {total.toLocaleString("fr-FR")}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="var(--rd-text-3, #94a3b8)" fontWeight="600">
              total
            </text>
          </>
        )}
      </svg>
      <div className="polar-legend">
        {segments.map((seg, idx) => (
          <div
            key={seg.label}
            className={`polar-legend-item ${hoveredIdx != null && segments[hoveredIdx].label === seg.label ? "active" : ""}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span className="polar-dot" style={{ background: seg.color }} />
            <span className="polar-lbl">{seg.label}</span>
            <span className="polar-val">{seg.value}</span>
            <span className="polar-pct">{total > 0 ? Math.round(seg.fraction * 100) : 0}%</span>
          </div>
        ))}
      </div>
      <style>{`
        .polar-wrap{display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center}
        .polar-legend{display:flex;flex-direction:column;gap:5px;min-width:140px}
        .polar-legend-item{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s}
        .polar-legend-item:hover,.polar-legend-item.active{background:var(--rd-surface-2, #f6f8fb)}
        .polar-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0}
        .polar-lbl{flex:1;font-weight:600;color:var(--rd-text, #0f172a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .polar-val{font-weight:700;font-variant-numeric:tabular-nums;color:var(--rd-text-2, #475569)}
        .polar-pct{width:32px;text-align:right;color:var(--rd-text-3, #94a3b8);font-variant-numeric:tabular-nums}
      `}</style>
    </div>
  );
}
