import { useMemo } from 'react';
import type { GapHeatmapCell } from '@/models/analyse';
import { ChartSkeleton } from '../States';

/** Couleur d'un écart selon sa sévérité absolue (0 à ~3 points). */
export function gapSeverityColor(gap: number): string {
  if (gap >= 2) return '#ef4444'; // critique
  if (gap >= 1) return '#f97316'; // élevé
  if (gap >= 0.5) return '#f59e0b'; // modéré
  if (gap >= 0.2) return '#84cc16'; // faible
  return '#10b981'; // négligeable
}

export function gapSeverityLabel(gap: number): string {
  if (gap >= 2) return 'Critique';
  if (gap >= 1) return 'Élevé';
  if (gap >= 0.5) return 'Modéré';
  if (gap >= 0.2) return 'Faible';
  return 'Faible';
}

export default function Heatmap({
  cells,
  loading,
  highlightDept,
  onSelectDept,
}: {
  readonly cells: GapHeatmapCell[];
  readonly loading: boolean;
  readonly highlightDept?: string | null;
  readonly onSelectDept?: (dept: string | null) => void;
}) {
  const { depts, comps, matrix } = useMemo(() => {
    const compMap = new Map<number, string>();
    const deptSet = new Set<string>();
    for (const c of cells) {
      compMap.set(c.competence_id, c.competence_nom);
      deptSet.add(c.departement);
    }
    const comps = Array.from(compMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    const depts = Array.from(deptSet).sort((a, b) => a.localeCompare(b));
    const matrix = new Map<string, GapHeatmapCell>();
    for (const c of cells) matrix.set(`${c.departement}__${c.competence_id}`, c);
    return { depts, comps, matrix };
  }, [cells]);

  if (loading && cells.length === 0) return <ChartSkeleton height={260} />;
  if (cells.length === 0) return <div className="rd-empty">Aucun écart de compétence calculé</div>;

  const maxGap = Math.max(0.5, ...cells.map((c) => c.avg_gap));

  return (
    <div className="rd-heatmap-wrap">
      <div className="rd-heat-scroll">
        <div
          className="rd-heat-grid"
          style={{
            gridTemplateColumns: `minmax(140px, 1.2fr) repeat(${comps.length}, minmax(54px, 1fr))`,
          }}
        >
          <div className="rd-heat-corner">Dép. \\ Comp.</div>
          {comps.map(([id, nom]) => (
            <div key={id} className="rd-heat-head" title={nom}>
              {nom}
            </div>
          ))}
          {depts.map((d) => (
            <FragmentRow
              key={d}
              dept={d}
              comps={comps}
              matrix={matrix}
              maxGap={maxGap}
              dimmed={highlightDept != null && highlightDept !== d}
              onSelectDept={onSelectDept}
            />
          ))}
        </div>
      </div>
      <div className="rd-heat-scale">
        <span>Écart faible</span>
        <span className="bar" />
        <span>Écart critique</span>
      </div>
    </div>
  );
}

function FragmentRow({
  dept,
  comps,
  matrix,
  maxGap,
  dimmed,
  onSelectDept,
}: {
  readonly dept: string;
  readonly comps: Array<[number, string]>;
  readonly matrix: Map<string, GapHeatmapCell>;
  readonly maxGap: number;
  readonly dimmed: boolean;
  readonly onSelectDept?: (dept: string | null) => void;
}) {
  return (
    <>
      <button
        type="button"
        className={`rd-heat-dept ${dimmed ? 'dim' : ''}`}
        onClick={() => onSelectDept?.(dept)}
        title={onSelectDept ? 'Filtrer par ce département' : undefined}
      >
        {dept}
      </button>
      {comps.map(([id]) => {
        const cell = matrix.get(`${dept}__${id}`);
        if (!cell) return <div key={id} className="rd-heat-cell empty" />;
        const color = gapSeverityColor(cell.avg_gap);
        const intensity = Math.min(1, cell.avg_gap / maxGap);
        return (
          <div
            key={id}
            className="rd-heat-cell"
            style={{
              background: color,
              opacity: 0.35 + intensity * 0.65,
              fontSize: 10,
              color: intensity > 0.55 ? '#fff' : 'var(--rd-text-2)',
            }}
            title={`${dept} · ${cell.competence_nom}\nÉcart moyen: ${cell.avg_gap.toFixed(2)} · ${cell.enseignants_count} ens.`}
          >
            {cell.avg_gap.toFixed(1)}
          </div>
        );
      })}
    </>
  );
}
