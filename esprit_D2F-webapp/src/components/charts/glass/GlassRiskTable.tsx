import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TeacherRiskIndicator } from '@/models/analyse';
import { semantic, neutral } from '@/styles/themes/tokens';

interface GlassRiskTableProps {
  readonly data: readonly TeacherRiskIndicator[];
}

/** Table des enseignants les plus à risque (from scratch, légère). */
export default function GlassRiskTable({ data }: GlassRiskTableProps) {
  const columns: ColumnsType<TeacherRiskIndicator> = [
    {
      title: 'Enseignant',
      dataIndex: 'teacher_name',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: neutral[800] }}>{v}</div>
          <div style={{ fontSize: 11, color: neutral[500] }}>{r.teacher_id}</div>
        </div>
      ),
    },
    { title: 'Département', dataIndex: 'departement', render: (v?: string) => v ?? '—' },
    {
      title: 'Score de risque',
      dataIndex: 'attrition_risk_score',
      align: 'center',
      render: (s: number) => {
        const pct = Math.round(s * 100);
        let col: string;
        if (pct >= 80) {
          col = semantic.error;
        } else if (pct >= 60) {
          col = '#f97316';
        } else if (pct >= 40) {
          col = semantic.warning;
        } else {
          col = semantic.success;
        }
        return <span style={{ color: col, fontWeight: 700 }}>{pct}%</span>;
      },
    },
    {
      title: 'Signaux',
      dataIndex: 'disengagement_signals',
      render: (v?: string[]) =>
        v && v.length > 0 ? (
          <span style={{ fontSize: 12, color: neutral[600] }}>
            {v.slice(0, 2).join(', ')}
            {v.length > 2 ? '…' : ''}
          </span>
        ) : (
          <span style={{ color: neutral[400] }}>—</span>
        ),
    },
  ];

  return (
    <Table
      rowKey="teacher_id"
      dataSource={data as TeacherRiskIndicator[]}
      columns={columns}
      pagination={false}
      size="small"
      style={{ marginTop: -6 }}
    />
  );
}
