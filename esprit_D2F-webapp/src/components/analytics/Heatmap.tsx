import { useState } from 'react';
import { Table, Tag, Tooltip, Segmented } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HeatmapCell } from '@/models/analyse/analyticsFeature';
import { formatDepartment } from '@/utils/analytics/format';

interface HeatmapProps {
  readonly cells: HeatmapCell[];
  readonly loading?: boolean;
  readonly onCellClick?: (departement: string, competenceId: number, competenceNom: string) => void;
}

export function gapColor(avg: number): string {
  if (avg >= 0.75) return '#f5222d';
  if (avg >= 0.5) return '#fa8c16';
  if (avg >= 0.25) return '#faad14';
  if (avg > 0) return '#a0d911';
  return '#f5f5f5';
}

export function gapSeverityLabel(avg: number): string {
  if (avg >= 0.75) return 'Critique';
  if (avg >= 0.5) return 'Élevé';
  if (avg >= 0.25) return 'Moyen';
  if (avg > 0) return 'Faible';
  return 'Nul';
}

const LEGEND = [
  { label: 'Faible', color: '#a0d911' },
  { label: 'Moyen', color: '#faad14' },
  { label: 'Élevé', color: '#fa8c16' },
  { label: 'Critique', color: '#f5222d' },
];

/** Heatmap des gaps (département × compétence) — cliquable pour drill-down. */
export default function Heatmap({ cells, loading, onCellClick }: HeatmapProps) {
  const [mode, setMode] = useState<'pct' | 'count'>('pct');

  // Compétences triées par gravité moyenne décroissante.
  const compAgg = new Map<string, { max: number; sum: number; n: number }>();
  cells.forEach((c) => {
    const a = compAgg.get(c.competence_nom) ?? { max: 0, sum: 0, n: 0 };
    a.max = Math.max(a.max, c.avg_gap);
    a.sum += c.avg_gap;
    a.n += 1;
    compAgg.set(c.competence_nom, a);
  });
  const competences = Array.from(compAgg.keys()).sort(
    (a, b) => compAgg.get(b)!.max - compAgg.get(a)!.max,
  );
  const departements = Array.from(new Set(cells.map((c) => c.departement))).sort((a, b) =>
    a.localeCompare(b),
  );

  const map = new Map<string, HeatmapCell>();
  cells.forEach((c) => map.set(`${c.departement}|${c.competence_nom}`, c));

  const columns: ColumnsType<{ departement: string }> = [
    {
      title: 'Département',
      dataIndex: 'departement',
      fixed: 'left',
      width: 150,
      render: (v: string) => formatDepartment(v),
    },
    ...competences.map((comp) => ({
      title: comp,
      dataIndex: comp,
      render: (_: unknown, row: { departement: string }) => {
        const cell = map.get(`${row.departement}|${comp}`);
        if (!cell) return <span style={{ color: '#bfbfbf' }}>·</span>;
        const pct = Math.round(cell.avg_gap * 100);
        const sev = gapSeverityLabel(cell.avg_gap);
        const content = (
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <div>
              <b>{comp}</b>
            </div>
            <div>
              Écart moyen : <b>{pct}%</b> ({sev})
            </div>
            <div>
              Enseignants touchés : <b>{cell.enseignants_count}</b>
            </div>
            <div style={{ opacity: 0.8, marginTop: 2 }}>Cliquez pour voir les enseignants</div>
          </div>
        );
        return (
          <Tooltip title={content}>
            <Tag
              color={gapColor(cell.avg_gap)}
              style={{ fontWeight: 600, cursor: onCellClick ? 'pointer' : 'default' }}
              onClick={() => onCellClick?.(row.departement, cell.competence_id, comp)}
            >
              {mode === 'pct' ? `${pct}%` : cell.enseignants_count}
            </Tag>
          </Tooltip>
        );
      },
    })),
  ];

  const data = departements.map((d) => ({ departement: d }));

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as 'pct' | 'count')}
          options={[
            { label: 'Écart %', value: 'pct' },
            { label: 'Effectif', value: 'count' },
          ]}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {LEGEND.map((l) => (
            <span
              key={l.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: '#64748b',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: l.color,
                  display: 'inline-block',
                }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <Table
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </div>
  );
}
