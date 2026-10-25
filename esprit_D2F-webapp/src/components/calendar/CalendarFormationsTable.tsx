import { useState } from 'react';
import { Table, Tag, Button, Space, Input, Select, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  MailOutlined,
} from '@ant-design/icons';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { useCalendarFormations, useSendInvitations } from '@/hooks/formation/useCalendar';
import CalendarService from '@/services/formation/CalendarService';
import { useUpdateInscriptionsOuvertes } from '@/hooks/formation/useFormations';
import type { CalendarFormation, CalendarFormationFilters } from '@/models/calendar';

/** Date de fin passée (format ISO yyyy-MM-dd, comparable comme chaîne). */
const estTerminee = (f: CalendarFormation) =>
  !!f.dateFin && f.dateFin < new Date().toLocaleDateString('sv-SE');

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
  const { message, modal } = useAppNotification();
  const sendInvitations = useSendInvitations();
  const [exportId, setExportId] = useState<number | null>(null);

  const exporterIcs = async (formation: CalendarFormation) => {
    setExportId(formation.idFormation);
    try {
      await CalendarService.downloadIcsFormation(formation.idFormation);
    } catch {
      message.error('Export .ics impossible.');
    } finally {
      setExportId(null);
    }
  };

  // Un e-mail (avec .ics de toutes les séances) par participant : confirmation obligatoire.
  const envoyerInvitations = (formation: CalendarFormation) => {
    modal.confirm({
      title: 'Envoyer les invitations ?',
      content: `Chaque participant de « ${formation.titre} » (${formation.participantsCount}) recevra un e-mail avec l'invitation calendrier (.ics).`,
      okText: 'Envoyer',
      cancelText: 'Annuler',
      onOk: () =>
        sendInvitations.mutateAsync(formation.idFormation).then(
          (res) =>
            res.status === 'NO_RECIPIENT' || res.status === 'FORMATION_PASSEE'
              ? message.warning(res.message)
              : message.success(res.message),
          () => message.error("Échec de l'envoi des invitations."),
        ),
    });
  };
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
      width: 140,
      render: (_, formation) => (
        <Space size={4}>
          <Tooltip title="Exporter les séances (.ics)">
            <Button
              size="small"
              icon={<ExportOutlined />}
              aria-label={`Exporter ${formation.titre} en .ics`}
              loading={exportId === formation.idFormation}
              onClick={() => exporterIcs(formation)}
            />
          </Tooltip>
          <Tooltip
            title={
              estTerminee(formation)
                ? 'Formation terminée : pas d’invitation'
                : 'Envoyer les invitations aux participants'
            }
          >
            <Button
              size="small"
              icon={<MailOutlined />}
              aria-label={`Envoyer les invitations de ${formation.titre}`}
              disabled={formation.participantsCount === 0 || estTerminee(formation)}
              onClick={() => envoyerInvitations(formation)}
            />
          </Tooltip>
          <Tooltip title="Enregistrer dans le catalogue (inscriptions ouvertes)">
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={
                updateInscriptions.isPending &&
                updateInscriptions.variables?.id === formation.idFormation
              }
              onClick={() => handleRegister(formation)}
              aria-label={`Enregistrer ${formation.titre} dans le catalogue`}
            />
          </Tooltip>
        </Space>
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
        locale={{ emptyText: 'Aucune formation importée depuis un fichier .xlsx' }}
        scroll={{ x: 'max-content' }}
      />
    </Space>
  );
}
