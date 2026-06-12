import { useState } from "react";
import { Table, Tag, Button, Space, Input, Select, Tooltip, Modal } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import {
  DownloadOutlined,
  MailOutlined,
  TeamOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import {
  useCalendarFormations,
  useCalendarParticipants,
  useSendInvitations,
} from "@/hooks/formation/useCalendar";
import CalendarService from "@/services/formation/CalendarService";
import type { CalendarFormation, CalendarFormationFilters } from "@/models/calendar";

const ETAT_OPTIONS = [
  "NOUVEAU",
  "ENREGISTRE",
  "PLANIFIE",
  "EN_COURS",
  "ACHEVE",
  "ANNULE",
  "VISIBLE",
].map((v) => ({ label: v, value: v }));

interface Props {
  canSendInvitations: boolean;
}

/** Liste paginée des formations planifiées avec export .ics et invitations. */
export default function CalendarFormationsTable({ canSendInvitations }: Readonly<Props>) {
  const { message } = useAppNotification();
  const [filters, setFilters] = useState<CalendarFormationFilters>({ page: 0, size: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [participantsFor, setParticipantsFor] = useState<CalendarFormation | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data, isLoading } = useCalendarFormations(filters);
  const sendInvitations = useSendInvitations();

  const handleDownload = async (formation: CalendarFormation) => {
    setDownloadingId(formation.idFormation);
    try {
      await CalendarService.downloadIcsFormation(formation.idFormation);
    } catch {
      message.error("Échec du téléchargement du calendrier.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleInvite = (formation: CalendarFormation) => {
    sendInvitations.mutate(formation.idFormation, {
      onSuccess: (result) => {
        if (result.status === "NO_RECIPIENT") {
          message.warning(result.message);
        } else {
          message.success(result.message);
        }
      },
      onError: () => { message.error("Échec de l'envoi des invitations."); },
    });
  };

  const columns: ColumnsType<CalendarFormation> = [
    { title: "Formation", dataIndex: "titre", ellipsis: true },
    {
      title: "État",
      dataIndex: "etat",
      width: 130,
      render: (etat?: string) => (etat ? <Tag>{etat}</Tag> : "—"),
    },
    { title: "Du", dataIndex: "dateDebut", width: 120, render: (v?: string) => v || "—" },
    { title: "Au", dataIndex: "dateFin", width: 120, render: (v?: string) => v || "—" },
    { title: "Salle", dataIndex: "salle", width: 120, render: (v?: string) => v || "—" },
    { title: "Séances", dataIndex: "sessionsCount", width: 90, align: "center" },
    { title: "Participants", dataIndex: "participantsCount", width: 110, align: "center" },
    {
      title: "Actions",
      width: 170,
      render: (_, formation) => (
        <Space>
          <Tooltip title="Télécharger le .ics">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingId === formation.idFormation}
              onClick={() => handleDownload(formation)}
            />
          </Tooltip>
          <Tooltip title="Voir les participants">
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={() => setParticipantsFor(formation)}
            />
          </Tooltip>
          {canSendInvitations && (
            <Tooltip title="Envoyer les invitations">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<MailOutlined />}
                loading={
                  sendInvitations.isPending &&
                  sendInvitations.variables === formation.idFormation
                }
                onClick={() => handleInvite(formation)}
              />
            </Tooltip>
          )}
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

  const applySearch = () => setFilters((f) => ({ ...f, titre: searchInput.trim() || undefined, page: 0 }));

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={!!participantsFor}
        title={participantsFor ? `Participants — ${participantsFor.titre}` : ""}
        footer={null}
        width={640}
        onCancel={() => setParticipantsFor(null)}
      >
        {participantsFor && <ParticipantsList formationId={participantsFor.idFormation} />}
      </Modal>
    </Space>
  );
}

function ParticipantsList({ formationId }: Readonly<{ formationId: number }>) {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useCalendarParticipants(formationId, page, 10);

  const columns: ColumnsType<{ email: string; matchedEnseignant: boolean }> = [
    { title: "E-mail", dataIndex: "email" },
    {
      title: "Référencé",
      dataIndex: "matchedEnseignant",
      width: 140,
      render: (matched: boolean) =>
        matched ? <Tag color="success">Enseignant</Tag> : <Tag color="default">Externe</Tag>,
    },
  ];

  return (
    <Table
      size="small"
      rowKey="email"
      loading={isLoading}
      columns={columns}
      dataSource={data?.content ?? []}
      pagination={{
        current: page + 1,
        pageSize: 10,
        total: data?.totalElements ?? 0,
        onChange: (p) => setPage(p - 1),
        hideOnSinglePage: true,
      }}
    />
  );
}
