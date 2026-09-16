import { useMemo } from "react";
import type { GapHeatmapCell } from "@/models/analyse";
import { ChartSkeleton } from "../States";

export default function ConsolidatedNeeds({
  cells,
  loading,
}: {
  readonly cells: GapHeatmapCell[];
  readonly loading: boolean;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { gapSum: number; cells: number; teachers: number; worst: number }>();
    for (const c of cells) {
      const cur = map.get(c.departement) ?? { gapSum: 0, cells: 0, teachers: 0, worst: 0 };
      cur.gapSum += c.avg_gap;
      cur.cells += 1;
      cur.teachers = Math.max(cur.teachers, c.enseignants_count);
      cur.worst = Math.max(cur.worst, c.avg_gap);
      map.set(c.departement, cur);
    }
    return Array.from(map.entries())
      .map(([dept, v]) => ({ dept, avg: v.gapSum / v.cells, teachers: v.teachers, cells: v.cells, worst: v.worst }))
      .sort((a, b) => b.avg - a.avg);
  }, [cells]);

  if (loading && cells.length === 0) return <ChartSkeleton height={200} />;
  if (rows.length === 0) return <div className="rd-empty">Aucun besoin consolidé</div>;

  const maxAvg = Math.max(0.5, ...rows.map((r) => r.avg));

  return (
    <div className="rd-needs">
      {rows.map((r) => {
        const pct = (r.avg / maxAvg) * 100;
        let color: string;
        if (r.worst >= 2) color = "var(--rd-error)";
        else if (r.worst >= 1) color = "var(--rd-warning)";
        else color = "var(--rd-info)";
        let action: string;
        if (r.worst >= 2) action = "Plan de formation prioritaire";
        else if (r.worst >= 1) action = "Renfort ciblé";
        else action = "Surveillance";
        return (
          <div key={r.dept} className="rd-needs-row">
            <div className="rd-needs-top">
              <span className="rd-needs-dept">{r.dept}</span>
              <span className="rd-needs-action" style={{ color }}>{action}</span>
            </div>
            <div className="rd-needs-bar">
              <span style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
            </div>
            <div className="rd-needs-meta">
              <span>Écart moyen {r.avg.toFixed(2)}</span>
              <span>{r.teachers} ens. concernés</span>
              <span>{r.cells} compétences</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
