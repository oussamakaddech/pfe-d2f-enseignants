import { useState } from 'react';
import { Empty } from 'antd';

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export default function HorizontalBarChart({
  items,
  maxValue,
  color = '#6366f1',
  height = 36,
  showValues = true,
  animated = true,
}: {
  readonly items: BarItem[];
  readonly maxValue?: number;
  readonly color?: string;
  readonly height?: number;
  readonly showValues?: boolean;
  readonly animated?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune donnée" />;
  }

  const max = maxValue ?? Math.max(1, ...items.map((i) => i.value));
  const palette = [
    '#6366f1',
    '#8b5cf6',
    '#a78bfa',
    '#0ea5e9',
    '#06b6d4',
    '#10b981',
    '#f59e0b',
    '#f97316',
    '#ef4444',
    '#ec4899',
  ];

  return (
    <div className="hbc">
      {items.map((item, idx) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        const barColor = item.color ?? palette[idx % palette.length];
        const isHovered = hoveredIdx === idx;

        return (
          <div
            key={`${item.label}-${idx}`}
            className="hbc-row"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="hbc-label" title={item.label}>
              <span className="hbc-dot" style={{ background: barColor }} />
              {item.label}
            </div>
            <div className="hbc-track">
              <div
                className="hbc-fill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                  height,
                  boxShadow: isHovered ? `0 0 12px ${barColor}40` : 'none',
                  transform: undefined,
                }}
              />
              {showValues && (
                <span
                  className="hbc-val"
                  style={{
                    opacity: isHovered ? 1 : 0.8,
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {item.value.toLocaleString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        .hbc{display:flex;flex-direction:column;gap:10px}
        .hbc-row{display:flex;align-items:center;gap:12px;padding:4px 0;transition:background .15s;border-radius:8px}
        .hbc-row:hover{background:var(--rd-surface-2, #f6f8fb);padding-left:6px;padding-right:6px}
        .hbc-label{min-width:140px;max-width:180px;font-size:12.5px;font-weight:600;color:var(--rd-text, #0f172a);display:flex;align-items:center;gap:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0}
        .hbc-dot{width:8px;height:8px;border-radius:3px;flex-shrink:0}
        .hbc-track{flex:1;display:flex;align-items:center;gap:10px;min-width:0}
        .hbc-fill{border-radius:999px;min-width:4px;transition:width .8s cubic-bezier(.22,1,.36,1),box-shadow .2s}
        .hbc-val{font-size:13px;font-weight:700;color:var(--rd-text-2, #475569);font-variant-numeric:tabular-nums;flex-shrink:0;transition:opacity .15s,transform .15s}
      `}</style>
    </div>
  );
}
