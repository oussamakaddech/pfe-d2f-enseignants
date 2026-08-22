import { useMemo } from 'react';
import { Table, Tag, Progress, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  riskColor,
  riskLabel,
  formatDepartment,
  formatUP,
  teacherStatus,
  STATUT_META,
} from '@/utils/analytics/format';
import type { AtRiskTeacher } from '@/models/analyse/analyticsFeature';

interface AtRiskTeachersTableProps {
  readonly teachers: AtRiskTeacher[];
  readonly loading?: boolean;
  readonly onSelect?: (id: string) => void;
}

/** Table des enseignants à risque (dashboard décisionnel). */
export default function AtRiskTeachersTable({
  teachers,
  loading,
  onSelect,
}: AtRiskTeachersTableProps) {
  const columns = useMemo<ColumnsType<AtRiskTeacher>>(
    () => [
      {
        title: 'Enseignant',
        dataIndex: 'nom',
        render: (v) => (
          <button type="button" className="ar-teacher-link">
            {v}
          </button>
        ),
      },
      {
        title: 'Département',
        dataIndex: 'departement',
        render: (v) => formatDepartment(v) || 'Non affecté',
      },
      { title: 'UP', dataIndex: 'up', render: (v) => formatUP(v) || 'Non affecté' },
      {
        title: 'Score de risque',
        dataIndex: 'score_risque',
        render: (v: number) => (
          <Progress
            percent={Math.round(v * 100)}
            size="small"
            strokeColor={riskColor(riskLabelToLevel(v))}
          />
        ),
        sorter: (a, b) => a.score_risque - b.score_risque,
        defaultSortOrder: 'descend' as const,
      },
      {
        title: 'Statut',
        key: 'statut',
        render: (_: unknown, r: AtRiskTeacher) => {
          const s = teacherStatus(r.tendance, r.niveau_risque);
          const meta = STATUT_META[s];
          return (
            <Tag color={meta.color} style={{ fontWeight: 600 }}>
              {meta.dot} {meta.label}
            </Tag>
          );
        },
        sorter: (a, b) =>
          Object.keys(STATUT_META).indexOf(teacherStatus(a.tendance, a.niveau_risque)) -
          Object.keys(STATUT_META).indexOf(teacherStatus(b.tendance, b.niveau_risque)),
      },
      {
        title: 'Niveau',
        dataIndex: 'niveau_risque',
        render: (v: AtRiskTeacher['niveau_risque']) => (
          <Tag color={riskColor(v)}>{riskLabel(v)}</Tag>
        ),
      },
      {
        title: 'Gaps critiques',
        dataIndex: 'nb_gaps_critiques',
        sorter: (a, b) => a.nb_gaps_critiques - b.nb_gaps_critiques,
      },
    ],
    [teachers],
  );

  if (!loading && teachers.length === 0) return <Empty description="Aucun enseignant à risque" />;

  return (
    <Table<AtRiskTeacher>
      rowKey="enseignant_id"
      loading={loading}
      columns={columns}
      dataSource={teachers}
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 10, showSizeChanger: false, responsive: true }}
      onRow={(r) => ({
        onClick: () => onSelect?.(r.enseignant_id),
        style: { cursor: onSelect ? 'pointer' : 'default' },
      })}
    />
  );
}

function riskLabelToLevel(score: number): AtRiskTeacher['niveau_risque'] {
  if (score >= 0.75) return 'CRITIQUE';
  if (score >= 0.5) return 'ELEVE';
  if (score >= 0.25) return 'MODERE';
  return 'FAIBLE';
}
