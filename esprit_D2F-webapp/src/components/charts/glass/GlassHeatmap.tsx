import { useMemo } from 'react';
import { Empty } from 'antd';
import type { GapHeatmapCell } from '@/models/analyse';
import { neutral } from '@/styles/themes/tokens';

interface GlassHeatmapProps {
  readonly data: readonly GapHeatmapCell[];
  readonly maxGap?: number;
  readonly onCellClick?: (departement: string, competenceId: number) => void;
}

/** Heatmap Département × Compétence du gap moyen (construit from scratch). */
export default function GlassHeatmap({ data, maxGap, onCellClick }: GlassHeatmapProps) {
  const { rows, competences, max } = useMemo(() => {
    const compMap = new Map<number, string>();
    const deptMap = new Map<string, Map<number, GapHeatmapCell>>();
    let m = 0;
    for (const cell of data) {
      compMap.set(cell.competence_id, cell.competence_nom);
      if (!deptMap.has(cell.departement)) deptMap.set(cell.departement, new Map());
      deptMap.get(cell.departement)!.set(cell.competence_id, cell);
      m = Math.max(m, cell.avg_gap);
    }
    const comps = [...compMap.entries()].map(([id, nom]) => ({ id, nom }));
    const rs = [...deptMap.entries()].map(([departement, map]) => ({ departement, map }));
    return { rows: rs, competences: comps, max: maxGap ?? (m || 1) };
  }, [data, maxGap]);

  if (data.length === 0) return <Empty description="Aucune donnée de heatmap" />;

  const colorFor = (v: number) => {
    const ratio = Math.max(0, Math.min(1, v / max));
    const hue = 130 - ratio * 130; // vert → rouge
    const alpha = 0.18 + ratio * 0.62;
    return `hsla(${hue}, 75%, 48%, ${alpha})`;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `minmax(130px, auto) repeat(${competences.length}, minmax(64px, 1fr))`,
          gap: 6,
          minWidth: 520,
        }}
      >
        <div />
        {competences.map((c) => (
          <div
            key={c.id}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: neutral[600],
              textAlign: 'center',
              padding: '4px 2px',
            }}
          >
            {c.nom.length > 14 ? `${c.nom.slice(0, 13)}…` : c.nom}
          </div>
        ))}
        {rows.map((r) => (
          <Row
            key={r.departement}
            r={r}
            competences={competences}
            colorFor={colorFor}
            max={max}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  r,
  competences,
  colorFor,
  max,
  onCellClick,
}: {
  readonly r: { readonly departement: string; readonly map: Map<number, GapHeatmapCell> };
  readonly competences: { readonly id: number; readonly nom: string }[];
  readonly colorFor: (v: number) => string;
  readonly max: number;
  readonly onCellClick?: (departement: string, competenceId: number) => void;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: neutral[700],
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {r.departement}
      </div>
      {competences.map((c) => {
        const cell = r.map.get(c.id);
        if (!cell) {
          return (
            <div
              key={c.id}
              style={{ height: 38, borderRadius: 10, background: 'rgba(15,23,42,0.04)' }}
            />
          );
        }
        if (!onCellClick) {
          return (
            <div
              key={c.id}
              title={`${c.nom} · ${r.departement} — gap ${cell.avg_gap.toFixed(2)} (${cell.enseignants_count} enseignants)`}
              style={{
                height: 38,
                borderRadius: 10,
                background: colorFor(cell.avg_gap),
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
              }}
            >
              {cell.avg_gap.toFixed(2)}
            </div>
          );
        }
        return (
          <button
            type="button"
            key={c.id}
            title={`${c.nom} · ${r.departement} — gap ${cell.avg_gap.toFixed(2)} (${cell.enseignants_count} enseignants)`}
            onClick={() => onCellClick(r.departement, c.id)}
            style={{
              height: 38,
              borderRadius: 10,
              background: colorFor(cell.avg_gap),
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {cell.avg_gap.toFixed(2)}
          </button>
        );
      })}
    </>
  );
}
