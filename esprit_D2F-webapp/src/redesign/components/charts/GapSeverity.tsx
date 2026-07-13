import { useMemo } from "react";
import type { GapHeatmapCell } from "@/models/analyse";
import { ChartSkeleton } from "../States";

const SEV = [
  { key: "critique", label: "Critique", color: "#ef4444" },
  { key: "eleve", label: "Élevé", color: "#f97316" },
  { key: "modere", label: "Modéré", color: "#f59e0b" },
  { key: "faible", label: "Faible", color: "#10b981" },
] as const;

function bucket(gap: number): (typeof SEV)[number]["key"] {
  if (gap >= 2) return "critique";
  if (gap >= 1) return "eleve";
  if (gap >= 0.5) return "modere";
  return "faible";
}

export default function GapSeverity({
  cells,
  loading,
}: {
  cells: GapHeatmapCell[];
  loading: boolean;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { critique: 0, eleve: 0, modere: 0, faible: 0 };
    for (const cell of cells) c[bucket(cell.avg_gap)] += 1;
    return c;
  }, [cells]);

  const total = cells.length;
  if (loading && total === 0) return <ChartSkeleton height={200} />;
  if (total === 0) return <div className="rd-empty">Aucun écart calculé</div>;

  const size = 150, stroke = 24, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const segs = SEV.map((s) => {
    const count = counts[s.key];
    const pct = total > 0 ? count / total : 0;
    const dash = pct * circ;
    const offset = -acc * circ + circ * 0.25;
    acc += pct;
    return { ...s, count, dash, offset };
  });

  return (
    <div className="rd-sev">
      <div className="rd-sev-donut-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Répartition des gaps par gravité">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rd-surface-3)" strokeWidth={stroke} />
          {segs.map((s) => (
            <circle
              key={s.key}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              transform={`rotate(${(s.offset * 180) / Math.PI} ${cx} ${cy})`}
            />
          ))}
        </svg>
        <div className="rd-dist-donut-center">
          <div className="rd-dist-donut-total">{total}</div>
          <div className="rd-dist-donut-label">écarts</div>
        </div>
      </div>
      <div className="rd-sev-legend">
        {segs.map((s) => (
          <div key={s.key} className="rd-sev-legend-item">
            <span className="rd-dist-legend-dot" style={{ background: s.color }} />
            <span className="rd-dist-legend-label">{s.label}</span>
            <span className="rd-dist-legend-count">{s.count}</span>
            <span className="rd-dist-legend-pct">{total ? Math.round((s.count / total) * 100) : 0} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}
