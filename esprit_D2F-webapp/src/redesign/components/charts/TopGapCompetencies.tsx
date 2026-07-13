import { useMemo, useState } from "react";
import type { HeatmapCell } from "@/redesign/contract";
import { ChartSkeleton } from "../States";

interface CompetenceGap {
  competenceId: number;
  competenceName: string;
  avgGap: number;
  teachersCount: number;
}

/** Couleur selon la position RELATIVE de l'écart dans le jeu de données courant. */
function relativeColor(ratio: number): string {
  if (ratio >= 0.85) return "#ef4444"; // critique
  if (ratio >= 0.7) return "#f97316"; // fort
  if (ratio >= 0.5) return "#f59e0b"; // élevé
  if (ratio >= 0.25) return "#84cc16"; // modéré
  return "#10b981"; // faible
}

function severityLabel(ratio: number): string {
  if (ratio >= 0.85) return "Critique";
  if (ratio >= 0.7) return "Fort";
  if (ratio >= 0.5) return "Élevé";
  if (ratio >= 0.25) return "Modéré";
  return "Faible";
}

export default function TopGapCompetencies({
  cells,
  loading,
}: {
  cells: HeatmapCell[];
  loading: boolean;
}) {
  const [dept, setDept] = useState<string>("all");

  const depts = useMemo(
    () => Array.from(new Set(cells.map((c) => c.department))).sort(),
    [cells],
  );

  const rows = useMemo<CompetenceGap[]>(() => {
    const filtered = dept === "all" ? cells : cells.filter((c) => c.department === dept);
    const byComp = new Map<number, { name: string; sum: number; n: number; teachers: number }>();
    for (const c of filtered) {
      const cur = byComp.get(c.competenceId) ?? { name: c.competenceName, sum: 0, n: 0, teachers: 0 };
      cur.sum += c.avgGap;
      cur.n += 1;
      cur.teachers += c.teachersCount;
      byComp.set(c.competenceId, cur);
    }
    return Array.from(byComp.entries())
      .map(([id, v]) => ({
        competenceId: id,
        competenceName: v.name,
        avgGap: v.sum / Math.max(v.n, 1),
        teachersCount: v.teachers,
      }))
      .sort((a, b) => b.avgGap - a.avgGap);
  }, [cells, dept]);

  const maxGap = rows.reduce((m, r) => Math.max(m, r.avgGap), 0.0001);

  if (loading && cells.length === 0) return <ChartSkeleton height={240} />;
  if (cells.length === 0) return <div className="rd-empty">Aucun écart de compétence calculé</div>;

  return (
    <div className="rd-topgap">
      <div className="rd-topgap-filter">
        <label htmlFor="rd-topgap-dept">Département :</label>
        <select id="rd-topgap-dept" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">Tous les départements</option>
          {depts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="rd-topgap-list">
        {rows.map((r, i) => {
          const ratio = r.avgGap / maxGap;
          const color = relativeColor(ratio);
          return (
            <div key={r.competenceId} className="rd-topgap-row">
              <div className="rd-topgap-name" title={r.competenceName}>
                <span className={`rd-rank ${i === 0 ? "top" : ""}`}>{i + 1}</span>
                <span className="rd-topgap-name-text">{r.competenceName}</span>
              </div>
              <div className="rd-topgap-barwrap">
                <div
                  className="rd-topgap-bar"
                  style={{
                    width: `${Math.max(ratio * 100, 4)}%`,
                    background: `linear-gradient(90deg, color-mix(in srgb, ${color} 78%, #fff), ${color})`,
                  }}
                />
                <span className="rd-topgap-val" style={{ color }}>
                  {severityLabel(ratio)} · {r.avgGap.toFixed(2)}
                </span>
              </div>
              <div className="rd-topgap-count">
                <strong>{r.teachersCount}</strong> ens.
              </div>
            </div>
          );
        })}
      </div>

      <div className="rd-topgap-legend">
        <span>Écart faible</span>
        <span className="bar" />
        <span>Écart critique</span>
      </div>
    </div>
  );
}
