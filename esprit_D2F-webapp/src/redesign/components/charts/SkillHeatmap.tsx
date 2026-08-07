import type { HeatmapCell } from '@/redesign/contract';
import { ChartSkeleton } from '../States';

function gapColor(gap: number): string {
  if (gap <= 0.3) return '#10b981';
  if (gap <= 0.7) return '#84cc16';
  if (gap <= 1.1) return '#f59e0b';
  if (gap <= 1.6) return '#f97316';
  return '#ef4444';
}

export default function SkillHeatmap({
  cells,
  loading,
  selected,
  onCellClick,
}: {
  readonly cells: HeatmapCell[];
  readonly loading: boolean;
  readonly selected: { readonly department: string; readonly competenceId: number } | null;
  readonly onCellClick: (dept: string, compId: number, compName: string) => void;
}) {
  if (loading && cells.length === 0) return <ChartSkeleton height={240} />;
  if (cells.length === 0) return <div className="rd-empty">Aucun écart de compétence calculé</div>;

  const depts = Array.from(new Set(cells.map((c) => c.department))).sort((a, b) =>
    a.localeCompare(b),
  );
  const comps = Array.from(new Set(cells.map((c) => c.competenceName))).sort((a, b) =>
    a.localeCompare(b),
  );
  const get = (d: string, c: string) =>
    cells.find((x) => x.department === d && x.competenceName === c);

  return (
    <div
      className="rd-heatmap"
      style={{ gridTemplateColumns: `130px repeat(${comps.length}, minmax(46px, 1fr))` }}
    >
      <div className="rd-heat-corner" />
      {comps.map((c) => (
        <div key={c} className="rd-heat-head" title={c}>
          {c}
        </div>
      ))}
      {depts.map((d) => (
        <Row
          key={d}
          dept={d}
          comps={comps}
          get={get}
          selected={selected}
          onCellClick={onCellClick}
        />
      ))}
      <div />
      <div className="rd-heat-scale" style={{ gridColumn: `1 / span ${comps.length + 1}` }}>
        <span>Écart faible</span>
        <span className="bar" />
        <span>Écart critique</span>
      </div>
    </div>
  );
}

function Row({
  dept,
  comps,
  get,
  selected,
  onCellClick,
}: {
  readonly dept: string;
  readonly comps: string[];
  readonly get: (d: string, c: string) => HeatmapCell | undefined;
  readonly selected: { readonly department: string; readonly competenceId: number } | null;
  readonly onCellClick: (dept: string, compId: number, compName: string) => void;
}) {
  return (
    <>
      <div
        className="rd-heat-head"
        style={{ justifyContent: 'flex-start', color: 'var(--rd-text-2)', fontWeight: 700 }}
        title={dept}
      >
        {dept}
      </div>
      {comps.map((c) => {
        const cell = get(dept, c);
        if (!cell)
          return (
            <div
              key={c}
              className="rd-heat-cell"
              style={{ background: 'var(--rd-surface-3)', color: 'transparent' }}
            >
              ·
            </div>
          );
        const isSel = selected?.department === dept && selected?.competenceId === cell.competenceId;
        return (
          <button
            type="button"
            key={c}
            className={`rd-heat-cell ${isSel ? 'selected' : ''}`}
            style={{
              background: gapColor(cell.avgGap),
              opacity: cell.teachersCount === 0 ? 0.35 : 1,
            }}
            title={`${dept} · ${c} · écart ${cell.avgGap.toFixed(2)} · ${cell.teachersCount} enseignants`}
            onClick={() => onCellClick(dept, cell.competenceId, cell.competenceName)}
          >
            {cell.teachersCount}
          </button>
        );
      })}
    </>
  );
}
