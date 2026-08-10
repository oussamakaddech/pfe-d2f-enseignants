import { useMemo } from 'react';
import { Table, Tag, Progress, Space, Empty, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { URGENCE_COLORS } from '@/utils/analytics/constants';
import { gapSeverityColor } from '@/utils/analytics/format';
import type { SkillGap } from '@/models/analyse/analyticsFeature';

interface GapsTableProps {
  readonly gaps: SkillGap[];
  readonly loading?: boolean;
  readonly onRowClick?: (gap: SkillGap) => void;
}

/** Déduplique les gaps par competence_id, en gardant celui avec le gap_score le plus élevé. */
function deduplicateGaps(gaps: SkillGap[]): SkillGap[] {
  const map = new Map<number, SkillGap>();
  for (const gap of gaps) {
    const existing = map.get(gap.competence_id);
    if (!existing || gap.gap_score > existing.gap_score) {
      map.set(gap.competence_id, gap);
    }
  }
  return Array.from(map.values());
}

/** Table des gaps de compétence avec filtres, tri et badges de sévérité. */
export default function GapsTable({ gaps, loading, onRowClick }: GapsTableProps) {
  const uniqueGaps = useMemo(() => deduplicateGaps(gaps), [gaps]);

  const columns = useMemo<ColumnsType<SkillGap>>(
    () => [
      {
        title: 'Compétence',
        dataIndex: 'competence_nom',
        sorter: (a, b) => a.competence_nom.localeCompare(b.competence_nom),
        render: (_, r) => (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 600 }}>{r.competence_nom}</span>
            <Space size={4}>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>{r.competence_code}</span>
              {r.niveau_actuel === 0 && <Tag color="red">Manquante</Tag>}
            </Space>
          </Space>
        ),
      },
      {
        title: 'Domaine',
        dataIndex: 'domaine_nom',
        render: (v: string) => v || '—',
      },
      {
        title: 'Niveau actuel',
        dataIndex: 'niveau_actuel',
        sorter: (a, b) => a.niveau_actuel - b.niveau_actuel,
        render: (v: number) => <Progress percent={v * 20} size="small" />,
      },
      {
        title: 'Niveau requis',
        dataIndex: 'niveau_requis',
        sorter: (a, b) => a.niveau_requis - b.niveau_requis,
      },
      {
        title: 'Gap',
        dataIndex: 'gap_score',
        sorter: (a, b) => a.gap_score - b.gap_score,
        render: (v: number) => <Tag color={gapSeverityColor(v)}>{v.toFixed(2)}</Tag>,
      },
      {
        title: 'Urgence',
        dataIndex: 'niveau_urgence',
        render: (v: SkillGap['niveau_urgence']) => (
          <Tag color={URGENCE_COLORS[v] as string}>{v}</Tag>
        ),
        filters: ['FAIBLE', 'MODEREE', 'HAUTE', 'CRITIQUE'].map((u) => ({ text: u, value: u })),
        onFilter: (value, r) => r.niveau_urgence === value,
      },
      {
        title: 'Stagnation',
        dataIndex: 'mois_stagnation',
        render: (v: number) => (v > 0 ? `${v} mois` : '—'),
        sorter: (a, b) => a.mois_stagnation - b.mois_stagnation,
      },
      {
        title: 'Régression',
        dataIndex: 'en_regression',
        render: (v: boolean) => (v ? <Tag color="red">Oui</Tag> : <Tag>Non</Tag>),
      },
    ],
    [gaps],
  );

  if (!loading && uniqueGaps.length === 0) {
    return <Empty description="Aucun gap détecté" />;
  }

  return (
    <div>
      {gaps.length !== uniqueGaps.length && (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: 'block', marginBottom: 8 }}
        >
          {gaps.length - uniqueGaps.length} doublon(s) masqué(s) — {uniqueGaps.length} compétence(s)
          unique(s)
        </Typography.Text>
      )}
      <Table<SkillGap>
        rowKey={(r) => `${r.competence_id}-${r.niveau_requis}`}
        loading={loading}
        columns={columns}
        dataSource={uniqueGaps}
        pagination={{ pageSize: 10 }}
        onRow={(r) => ({
          onClick: () => onRowClick?.(r),
          style: { cursor: onRowClick ? 'pointer' : 'default' },
        })}
        size="middle"
      />
    </div>
  );
}
