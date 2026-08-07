import { Table, Tag, Empty, Space, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Conflict, ConflictReport, ConflictType } from '@/models/calendar';

const TYPE_META: Record<ConflictType, { color: string; label: string }> = {
  ROOM_OVERLAP: { color: 'volcano', label: 'Conflit de salle' },
  DUPLICATE_FORMATION: { color: 'gold', label: 'Doublon de formation' },
  SESSION_NUMBERING: { color: 'geekblue', label: 'Numérotation de séance' },
};

interface Props {
  report?: ConflictReport;
  loading?: boolean;
}

/** Synthèse + détail des conflits détectés sur le calendrier. */
export default function ConflictsTable({ report, loading }: Readonly<Props>) {
  const columns: ColumnsType<Conflict> = [
    {
      title: 'Type',
      dataIndex: 'type',
      width: 200,
      filters: Object.entries(TYPE_META).map(([value, meta]) => ({ text: meta.label, value })),
      onFilter: (value, record) => record.type === value,
      render: (type: ConflictType) => {
        const meta = TYPE_META[type];
        return <Tag color={meta?.color}>{meta?.label ?? type}</Tag>;
      },
    },
    { title: 'Salle', dataIndex: 'salle', width: 140, render: (v?: string) => v || '—' },
    { title: 'Date', dataIndex: 'dateSeance', width: 120, render: (v?: string) => v || '—' },
    {
      title: 'Créneau',
      width: 140,
      render: (_, r) => (r.heureDebut ? `${r.heureDebut} – ${r.heureFin ?? ''}` : '—'),
    },
    { title: 'Détail', dataIndex: 'detail' },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Statistic title="Total conflits" value={report?.totalConflicts ?? 0} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Salles" value={report?.roomOverlaps ?? 0} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Doublons" value={report?.duplicateFormations ?? 0} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Numérotation" value={report?.sessionNumberingIssues ?? 0} />
        </Col>
      </Row>

      {report?.conflicts.length === 0 ? (
        <Empty description="Aucun conflit détecté" />
      ) : (
        <Table<Conflict>
          size="small"
          loading={loading}
          rowKey={(r) => `${r.type}-${r.seanceId ?? ''}-${r.otherSeanceId ?? ''}-${r.detail}`}
          columns={columns}
          dataSource={report?.conflicts ?? []}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
        />
      )}
    </Space>
  );
}
