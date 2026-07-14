import { useState } from "react";
import { Empty } from "antd";

interface MatrixItem {
  id: string | number;
  label: string;
  urgency: number;     // 1-5
  impact: number;      // 1-5
  count?: number;      // bubble size
  color?: string;
}

const URGENCY_LABELS = ["", "Très faible", "Faible", "Moyenne", "Haute", "Critique"];
const IMPACT_LABELS = ["", "Très faible", "Faible", "Moyen", "Important", "Stratégique"];

const quadrantColors: Record<string, { bg: string; border: string; label: string }> = {
  "high-high": { bg: "rgba(239,68,68,0.08)", border: "#ef4444", label: "Action immédiate" },
  "high-low":  { bg: "rgba(245,158,11,0.08)", border: "#f59e0b", label: "Planifier" },
  "low-high":  { bg: "rgba(59,130,246,0.08)", border: "#3b82f6", label: "Surveiller" },
  "low-low":   { bg: "rgba(16,185,129,0.08)", border: "#10b981", label: "Réalisable" },
};

function getQuadrant(urgency: number, impact: number): string {
  if (urgency >= 3 && impact >= 3) return "high-high";
  if (urgency >= 3 && impact < 3) return "high-low";
  if (urgency < 3 && impact >= 3) return "low-high";
  return "low-low";
}

export default function PriorityMatrix({ items }: { items: MatrixItem[] }) {
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun besoin à prioriser" />;
  }

  const W = 400, H = 340, PAD = 48, PAD_R = 16, PAD_B = 40;
  const plotW = W - PAD - PAD_R;
  const plotH = H - PAD - PAD_B;
  const cellW = plotW / 5;
  const cellH = plotH / 5;

  const maxCount = Math.max(1, ...items.map((i) => i.count ?? 1));

  const gridLines = [1, 2, 3, 4, 5];

  return (
    <div className="pm-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Quadrant backgrounds */}
        <rect x={PAD} y={PAD} width={cellW * 2} height={cellH * 2} fill={quadrantColors["low-low"].bg} rx={6} />
        <rect x={PAD + cellW * 2} y={PAD} width={cellW * 3} height={cellH * 2} fill={quadrantColors["low-high"].bg} rx={6} />
        <rect x={PAD} y={PAD + cellH * 2} width={cellW * 2} height={cellH * 3} fill={quadrantColors["high-low"].bg} rx={6} />
        <rect x={PAD + cellW * 2} y={PAD + cellH * 2} width={cellW * 3} height={cellH * 3} fill={quadrantColors["high-high"].bg} rx={6} />

        {/* Grid lines */}
        {gridLines.map((v) => (
          <g key={`g${v}`}>
            <line x1={PAD} y1={PAD + plotH - (v / 5) * plotH} x2={PAD + plotW} y2={PAD + plotH - (v / 5) * plotH} stroke="var(--rd-border, rgba(15,23,42,0.08))" strokeWidth={1} />
            <line x1={PAD + (v / 5) * plotW} y1={PAD} x2={PAD + (v / 5) * plotW} y2={PAD + plotH} stroke="var(--rd-border, rgba(15,23,42,0.08))" strokeWidth={1} />
          </g>
        ))}

        {/* Axes labels */}
        {gridLines.map((v) => (
          <g key={`ax${v}`}>
            <text x={PAD - 8} y={PAD + plotH - ((v - 0.5) / 5) * plotH + 4} textAnchor="end" fontSize="9" fill="var(--rd-text-3, #94a3b8)">{v}</text>
            <text x={PAD + ((v - 0.5) / 5) * plotW} y={PAD + plotH + 16} textAnchor="middle" fontSize="9" fill="var(--rd-text-3, #94a3b8)">{v}</text>
          </g>
        ))}

        {/* Axis titles */}
        <text x={PAD + plotW / 2} y={H - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--rd-text-2, #475569)">URGENCE →</text>
        <text x={8} y={PAD + plotH / 2} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--rd-text-2, #475569)" transform={`rotate(-90, 8, ${PAD + plotH / 2})`}>IMPACT →</text>

        {/* Items */}
        {items.map((item) => {
          const x = PAD + ((item.urgency - 0.5) / 5) * plotW;
          const y = PAD + plotH - ((item.impact - 0.5) / 5) * plotH;
          const r = 10 + ((item.count ?? 1) / maxCount) * 18;
          const isHovered = hoveredId === item.id;
          const q = getQuadrant(item.urgency, item.impact);
          const color = item.color ?? quadrantColors[q].border;

          return (
            <g
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x} cy={y} r={isHovered ? r + 4 : r}
                fill={color} opacity={isHovered ? 0.9 : 0.65}
                stroke={color} strokeWidth={isHovered ? 3 : 1.5}
                style={{ transition: "r .15s, opacity .15s" }}
              />
              <text x={x} y={y + 1} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" style={{ pointerEvents: "none" }}>
                {item.count ?? ""}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredId != null && (() => {
          const item = items.find((i) => i.id === hoveredId);
          if (!item) return null;
          const x = PAD + ((item.urgency - 0.5) / 5) * plotW;
          const y = PAD + plotH - ((item.impact - 0.5) / 5) * plotH;
          const r = 10 + ((item.count ?? 1) / maxCount) * 18;
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect x={x - 60} y={y - r - 36} width={120} height={28} rx={6} fill="var(--rd-text, #0f172a)" />
              <text x={x} y={y - r - 18} textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">
                {item.label}
              </text>
              <text x={x} y={y - r - 7} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)">
                U:{URGENCY_LABELS[item.urgency]} · I:{IMPACT_LABELS[item.impact]}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="pm-legend">
        {Object.entries(quadrantColors).map(([key, q]) => (
          <div key={key} className="pm-legend-item">
            <span className="pm-legend-dot" style={{ background: q.border }} />
            <span>{q.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .pm-wrap{display:flex;flex-direction:column;gap:12px}
        .pm-legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
        .pm-legend-item{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--rd-text-2, #475569)}
        .pm-legend-dot{width:8px;height:8px;border-radius:50%}
      `}</style>
    </div>
  );
}
