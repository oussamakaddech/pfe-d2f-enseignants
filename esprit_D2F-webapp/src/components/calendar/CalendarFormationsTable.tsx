import { useState } from 'react';
import { Table, Tag, Button, Space, Input, Select, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { useCalendarFormations } from '@/hooks/formation/useCalendar';
import { useUpdateInscriptionsOuvertes } from '@/hooks/formation/useFormations';
import type { CalendarFormation, CalendarFormationFilters } from '@/models/calendar';

const ETAT_OPTIONS = [
  'NOUVEAU',
  'ENREGISTRE',
  'PLANIFIE',
  'EN_COURS',
  'ACHEVE',
  'ANNULE',
  'VISIBLE',
].map((v) => ({ label: v, value: v }));

/** Liste paginée des formations planifiées avec enregistrement dans le catalogue. */
export default function CalendarFormationsTable() {
  const { message } = useAppNotification();
  const [filters, setFilters] = useState<CalendarFormationFilters>({ page: 0, size: 10 });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useCalendarFormations(filters);
  const updateInscriptions = useUpdateInscriptionsOuvertes();

  const handleRegister = (formation: CalendarFormation) => {
    updateInscriptions.mutate(
      { id: formation.idFormation, ouvert: true },
      {
        onSuccess: () => {
          message.success(`"${formation.titre}" enregistrée dans le catalogue.`);
        },
        onError: () => {
          message.error("Échec de l'enregistrement dans le catalogue.");
        },
      },
    );
  };

  const columns: ColumnsType<CalendarFormation> = [
    { title: 'Formation', dataIndex: 'titre', ellipsis: true },
    {
      title: 'État',
      dataIndex: 'etat',
      width: 130,
      render: (etat?: string) => (etat ? <Tag>{etat}</Tag> : '—'),
    },
    { title: 'Du', dataIndex: 'dateDebut', width: 120, render: (v?: string) => v || '—' },
    { title: 'Au', dataIndex: 'dateFin', width: 120, render: (v?: string) => v || '—' },
    { title: 'Salle', dataIndex: 'salle', width: 120, render: (v?: string) => v || '—' },
    { title: 'Séances', dataIndex: 'sessionsCount', width: 90, align: 'center' },
    { title: 'Participants', dataIndex: 'participantsCount', width: 110, align: 'center' },
    {
      title: 'Actions',
      width: 100,
      render: (_, formation) => (
        <Tooltip title="Enregistrer dans le catalogue">
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={
              updateInscriptions.isPending &&
              updateInscriptions.variables?.id === formation.idFormation
            }
            onClick={() => handleRegister(formation)}
          />
        </Tooltip>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: (filters.page ?? 0) + 1,
    pageSize: filters.size ?? 10,
    total: data?.totalElements ?? 0,
    showSizeChanger: true,
    onChange: (page, size) => setFilters((f) => ({ ...f, page: page - 1, size })),
  };

  const applySearch = () =>
    setFilters((f) => ({ ...f, titre: searchInput.trim() || undefined, page: 0 }));

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Input
          allowClear
          placeholder="Rechercher une formation…"
          prefix={<SearchOutlined />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={applySearch}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="État"
          options={ETAT_OPTIONS}
          style={{ width: 180 }}
          onChange={(etat?: string) => setFilters((f) => ({ ...f, etat, page: 0 }))}
        />
        <Button type="primary" onClick={applySearch}>
          Filtrer
        </Button>
      </Space>

      <Table<CalendarFormation>
        size="small"
        rowKey="idFormation"
        loading={isLoading}
        columns={columns}
        dataSource={data?.content ?? []}
        pagination={pagination}
        scroll={{ x: 'max-content' }}
      />
    </Space>
  );
}
