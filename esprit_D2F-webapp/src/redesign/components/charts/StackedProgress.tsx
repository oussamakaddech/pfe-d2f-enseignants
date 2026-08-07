import { useState } from 'react';
import { Empty } from 'antd';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface StackedItem {
  label: string;
  segments: Segment[];
  total?: number;
}

export default function StackedProgress({
  items,
  height = 28,
}: {
  readonly items: StackedItem[];
  readonly height?: number;
}) {
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null);

  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune donnée" />;
  }

  return (
    <div className="sp-wrap">
      {items.map((item, idx) => {
        const total = item.total ?? item.segments.reduce((s, seg) => s + seg.value, 0);
        if (total === 0) return null;

        return (
          <div
            key={`${item.label}-${idx}`}
            className="sp-row"
            onMouseEnter={() => undefined}
            onMouseLeave={() => {
              setHoveredSeg(null);
            }}
          >
            <div className="sp-head">
              <span className="sp-label">{item.label}</span>
              <span className="sp-total">{total.toLocaleString('fr-FR')}</span>
            </div>
            <div className="sp-track" style={{ height }}>
              {item.segments.map((seg) => {
                const pct = total > 0 ? (seg.value / total) * 100 : 0;
                const isSegHovered = hoveredSeg === `${idx}-${seg.label}`;
                return (
                  <div
                    key={seg.label}
                    className="sp-seg"
                    style={{
                      width: `${pct}%`,
                      background: seg.color,
                      opacity: isSegHovered ? 1 : 0.85,
                      filter: isSegHovered ? 'brightness(1.1)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredSeg(`${idx}-${seg.label}`)}
                    onMouseLeave={() => setHoveredSeg(null)}
                    title={`${seg.label}: ${seg.value} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
            <div className="sp-legend-row">
              {item.segments.map((seg) => {
                const pct = total > 0 ? (seg.value / total) * 100 : 0;
                return (
                  <span key={seg.label} className="sp-chip">
                    <span className="sp-chip-dot" style={{ background: seg.color }} />
                    {seg.label} {Math.round(pct)}%
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <style>{`
        .sp-wrap{display:flex;flex-direction:column;gap:16px}
        .sp-row{display:flex;flex-direction:column;gap:6px}
        .sp-head{display:flex;align-items:center;justify-content:space-between}
        .sp-label{font-size:13px;font-weight:600;color:var(--rd-text, #0f172a)}
        .sp-total{font-size:13px;font-weight:700;color:var(--rd-text-2, #475569);font-variant-numeric:tabular-nums}
        .sp-track{display:flex;border-radius:999px;overflow:hidden;background:var(--rd-surface-3, #eef2f7);gap:1px}
        .sp-seg{transition:width .7s cubic-bezier(.22,1,.36,1),opacity .15s,filter .15s;min-width:2px;cursor:pointer}
        .sp-legend-row{display:flex;flex-wrap:wrap;gap:8px}
        .sp-chip{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--rd-text-2, #475569)}
        .sp-chip-dot{width:7px;height:7px;border-radius:2px}
      `}</style>
    </div>
  );
}
