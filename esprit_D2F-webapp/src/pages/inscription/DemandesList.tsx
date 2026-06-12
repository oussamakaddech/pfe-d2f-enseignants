import { useState, useRef, useMemo } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  Typography,
  Card,
  Badge,
  Tag,
  Avatar,
  Modal,
  Input as AntInput,
} from "antd";
import type { TableColumnsType, InputRef } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
  SearchOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  MailOutlined,
  ApartmentOutlined,
  TeamOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useInscriptionsByFormation, useTraiterDemande, useTraiterDemandeBulk, useSendEmail } from "@/hooks/formation";
import { useFormationById } from "@/hooks/formation/useFormations";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader, InscriptionStatGrid, PageLoader, EmptyStateStandard } from "@/components/common";
import "@/styles/pages/demandes-list.css";
import { brand } from "@/styles/themes/tokens";
import type { Id } from "@/models/common";

const { Text } = Typography;

type EtatDemande = "APPROVED" | "REJECTED" | "PENDING";

interface EnseignantRef {
  nom?: string;
  prenom?: string;
  mail?: string;
  deptLibelle?: string;
  upLibelle?: string;
}

interface Demande {
  id: Id;
  etat: EtatDemande;
  dateDemande: string;
  enseignant: EnseignantRef;
}

/** Le backend peut renvoyer soit un tableau, soit un Page<…> ({content:[…]}).
 *  On normalise défensivement (cf. FormationParticipantsPanel). */
function normalizeDemandes(data: unknown): Demande[] {
  if (Array.isArray(data)) return data as Demande[];
  const obj = data as { content?: unknown } | null;
  if (obj && Array.isArray(obj.content)) return obj.content as Demande[];
  return [];
}

interface DemandesColumnFilterDropdownProps {
  readonly dataIndex: keyof EnseignantRef;
  readonly selectedKeys: React.Key[];
  readonly searchInputRef: React.RefObject<InputRef | null>;
  readonly onSetSelectedKeys: (keys: React.Key[]) => void;
  readonly onSearch: (keys: React.Key[]) => void;
  readonly onReset: (clearFilters?: () => void) => void;
}

function DemandesColumnFilterDropdown({
  dataIndex,
  selectedKeys,
  searchInputRef,
  onSetSelectedKeys,
  onSearch,
  onReset,
}: DemandesColumnFilterDropdownProps) {
  return (
    <div style={{ padding: 8 }}>
      <Input
        ref={searchInputRef}
        placeholder={`Rechercher ${dataIndex}`}
        value={selectedKeys[0]}
        onChange={(e) => onSetSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => onSearch(selectedKeys)}
        style={{ marginBottom: 8, display: "block" }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() => onSearch(selectedKeys)}
          icon={<SearchOutlined />}
          size="small"
        >
          OK
        </Button>
        <Button onClick={() => onReset()} size="small">
          Réinitialiser
        </Button>
      </Space>
    </div>
  );
}

const ETAT_CONFIG: Record<EtatDemande, { color: "success" | "error" | "warning"; icon: React.ReactNode; text: string }> = {
  APPROVED: { color: "success", icon: <CheckCircleOutlined />, text: "Approuvé" },
  REJECTED: { color: "error",   icon: <CloseCircleOutlined />, text: "Rejeté" },
  PENDING:  { color: "warning", icon: <ClockCircleOutlined />, text: "En attente" },
};

async function sendTraitementEmail(
  target: Demande,
  approuver: boolean,
  motif: string | undefined,
  formation: { titreFormation?: string; dateDebut?: string; dateFin?: string } | undefined,
  formationId: string | undefined,
  sendEmail: (p: { to: string; subject: string; content: string; isHtml: boolean }) => Promise<unknown>,
  warn: (msg: string) => void,
): Promise<void> {
  if (!target.enseignant?.mail) return;
  const titre = formation?.titreFormation ?? `Formation #${formationId}`;
  const dStart = formation?.dateDebut ? dayjs(String(formation.dateDebut)).format("DD/MM/YYYY") : null;
  const dEnd = formation?.dateFin ? dayjs(String(formation.dateFin)).format("DD/MM/YYYY") : null;
  const dateRange = dStart && dEnd ? `<br>📅 Du <strong>${dStart}</strong> au <strong>${dEnd}</strong>` : "";
  const subject = approuver ? `✅ Inscription approuvée — ${titre}` : `❌ Inscription rejetée — ${titre}`;
  const greeting = `Bonjour ${target.enseignant.prenom ?? ""} ${target.enseignant.nom ?? ""},`;
  const motifLine = motif ? `Motif : <em>${motif}</em><br>` : "";
  const body = approuver
    ? `Votre demande d'inscription à la formation <strong>${titre}</strong> a été <strong>approuvée</strong>.${dateRange}<br>Vous pouvez la suivre dans votre espace « Mes Inscriptions ».`
    : `Votre demande d'inscription à la formation <strong>${titre}</strong> a été <strong>rejetée</strong>.<br>${motifLine}Pour plus d'informations, merci de contacter le service D2F.`;
  const content = `<p>${greeting}</p><p>${body}</p><p>Cordialement,<br/><strong>L'équipe D2F</strong></p>`;
  try {
    await sendEmail({ to: target.enseignant.mail, subject, content, isHtml: true });
  } catch {
    warn("Demande traitée, mais l'email de notification n'a pas pu être envoyé.");
  }
}

function buildDemandesColumnProps(
  dataIndex: keyof EnseignantRef,
  searchInputRef: React.RefObject<InputRef | null>,
  onSearch: (keys: React.Key[], confirm: FilterDropdownProps["confirm"], dataIndex: keyof EnseignantRef) => void,
  searchedColumn: string,
) {
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <DemandesColumnFilterDropdown
        dataIndex={dataIndex}
        selectedKeys={selectedKeys}
        searchInputRef={searchInputRef}
        onSetSelectedKeys={setSelectedKeys}
        onSearch={(keys) => onSearch(keys, confirm, dataIndex)}
        onReset={() => clearFilters?.()}
      />
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? "#b51200" : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: Demande) =>
      record.enseignant[dataIndex]?.toString().toLowerCase().includes(String(value).toLowerCase()) ?? false,
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => searchInputRef.current?.select(), 100);
      },
    },
    render: (text: string) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: "0 4px", borderRadius: 4 }}>{text}</span>
      ) : text,
  };
}

export default function DemandesList() {
  const { id: formationId } = useParams();
  const navigate = useNavigate();
  const [searchedColumn, setSearchedColumn] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Demande | null>(null);
  const [rejectMotif, setRejectMotif] = useState("");
  const searchInput = useRef<InputRef>(null);
  const { message: msgApi } = useAppNotification();

  const { data: rawDemandes, isLoading: loading, refetch } = useInscriptionsByFormation(formationId);
  const { data: formation } = useFormationById(formationId);
  const demandes = useMemo(() => normalizeDemandes(rawDemandes), [rawDemandes]);
  const traiterMut = useTraiterDemande();
  const traiterBulkMut = useTraiterDemandeBulk();
  const sendEmailMut = useSendEmail();

  // P3 - F4 : sélection multiple pour actions groupées
  const [selectedRowIds, setSelectedRowIds] = useState<React.Key[]>([]);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkMotif, setBulkMotif] = useState("");

  const selectedPending = useMemo(
    () => demandes.filter((d) => selectedRowIds.includes(d.id) && d.etat === "PENDING"),
    [demandes, selectedRowIds]
  );
  const hasPendingSelection = selectedPending.length > 0;

  const handleTraitement = async (id: Id, approuver: boolean, motif?: string) => {
    try {
      await traiterMut.mutateAsync({ id, approuver, motif });
      msgApi.success(approuver ? "✅ Demande approuvée" : "❌ Demande rejetée");
      const target = demandes.find((d) => d.id === id);
      if (target) {
        await sendTraitementEmail(
          target, approuver, motif,
          formation as { titreFormation?: string; dateDebut?: string; dateFin?: string } | undefined,
          formationId,
          sendEmailMut.mutateAsync,
          msgApi.warning,
        );
      }
      await refetch();
    } catch {
      msgApi.error("Erreur lors du traitement");
    }
  };

  const openRejectModal = (r: Demande) => {
    setRejectTarget(r);
    setRejectMotif("");
  };

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectMotif("");
  };

  const confirmRejection = async () => {
    if (!rejectTarget) return;
    const motif = rejectMotif.trim() || undefined;
    await handleTraitement(rejectTarget.id, false, motif);
    closeRejectModal();
  };

  // P3 - F4 : traitement en lot
  const handleBulkApprove = async () => {
    if (!hasPendingSelection) return;
    const ids = selectedPending.map((d) => d.id);
    try {
      const updated = await traiterBulkMut.mutateAsync({ ids, approuver: true });
      msgApi.success(`✅ ${updated.length} demande(s) approuvée(s)`);
      setSelectedRowIds([]);
      void refetch();
    } catch {
      msgApi.error("Erreur lors de l'approbation groupée");
    }
  };

  const handleBulkReject = async () => {
    if (!hasPendingSelection) return;
    const ids = selectedPending.map((d) => d.id);
    const motif = bulkMotif.trim() || undefined;
    try {
      const updated = await traiterBulkMut.mutateAsync({ ids, approuver: false, motif });
      msgApi.success(`❌ ${updated.length} demande(s) rejetée(s)`);
      setSelectedRowIds([]);
      setBulkMotif("");
      setBulkRejectOpen(false);
      void refetch();
    } catch {
      msgApi.error("Erreur lors du rejet groupé");
    }
  };

  const handleSearch = (selectedKeys: React.Key[], confirm: FilterDropdownProps["confirm"], dataIndex: string) => {
    confirm();
    setSearchedColumn(dataIndex);
  };

  const getColumnSearchProps = (dataIndex: keyof EnseignantRef) =>
    buildDemandesColumnProps(dataIndex, searchInput, handleSearch, searchedColumn);

  const exportToExcel = () => {
    const approved = demandes.filter((r) => r.etat === "APPROVED");
    const rows = approved.map((r) => ({
      Nom:         r.enseignant.nom,
      Prénom:      r.enseignant.prenom,
      Email:       r.enseignant.mail,
      Département: r.enseignant.deptLibelle || "—",
      UP:          r.enseignant.upLibelle || "—",
      État:        r.etat,
      Date:        new Date(r.dateDemande).toLocaleString("fr-FR"),
    }));
    writeExcel(
      [{ name: "Inscriptions", rows, title: "Inscriptions approuvées", subtitle: exportDateLabel() }],
      `inscriptions_formation_${formationId}_${isoDate()}.xlsx`,
    );
  };

  const total = demandes.length;
  const approvedCount = demandes.filter((d) => d.etat === "APPROVED").length;
  const pendingCount = demandes.filter((d) => d.etat === "PENDING").length;
  const rejectedCount = demandes.filter((d) => d.etat === "REJECTED").length;

  if (loading) return <PageLoader tip="Chargement des demandes..." />;
  if (!demandes.length)
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <AppPageHeader
          icon={<UserOutlined />}
          title={`Demandes d'inscription — Formation #${formationId}`}
          subtitle="Gérer et traiter les demandes d'inscription des enseignants"
          actions={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Retour</Button>
              <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={loading}>Actualiser</Button>
            </Space>
          }
        />
        <EmptyStateStandard
          title="Aucune demande pour cette formation"
          description="Les enseignants n'ont pas encore soumis de demande pour cette formation."
          actionLabel="Retour à la formation"
          actionIcon={<ArrowLeftOutlined />}
          onAction={() => navigate(-1)}
        />
      </div>
    );

  const columns: TableColumnsType<Demande> = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: brand[500] }} icon={<UserOutlined />}>
            {r.enseignant.prenom?.[0]}{r.enseignant.nom?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r.enseignant.prenom} {r.enseignant.nom}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {r.enseignant.mail}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Département",
      dataIndex: ["enseignant", "deptLibelle"],
      key: "deptLibelle",
      ...getColumnSearchProps("deptLibelle"),
      render: (val: string) => (
        <Tag icon={<ApartmentOutlined />} color="processing">{val || "—"}</Tag>
      ),
      sorter: (a, b) => (a.enseignant.deptLibelle || "").localeCompare(b.enseignant.deptLibelle || ""),
    },
    {
      title: "UP",
      dataIndex: ["enseignant", "upLibelle"],
      key: "upLibelle",
      ...getColumnSearchProps("upLibelle"),
      render: (val: string) => (
        <Tag icon={<TeamOutlined />} color="default">{val || "—"}</Tag>
      ),
      sorter: (a, b) => (a.enseignant.upLibelle || "").localeCompare(b.enseignant.upLibelle || ""),
    },
    {
      title: "Date demande",
      dataIndex: "dateDemande",
      key: "dateDemande",
      render: (d: string) => (
        <Text type="secondary">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {new Date(d).toLocaleDateString("fr-FR")}
        </Text>
      ),
      sorter: (a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime(),
    },
    {
      title: "État",
      dataIndex: "etat",
      key: "etat",
      filters: [
        { text: "En attente", value: "PENDING" },
        { text: "Approuvé",   value: "APPROVED" },
        { text: "Rejeté",     value: "REJECTED" },
      ],
      onFilter: (value, record) => record.etat === value,
      render: (etat: EtatDemande) => {
        const c = ETAT_CONFIG[etat] ?? ETAT_CONFIG.PENDING;
        return (
          <Badge
            status={c.color}
            text={
              <Tag color={c.color} icon={c.icon} style={{ fontWeight: 500 }}>
                {c.text}
              </Tag>
            }
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={r.etat === "APPROVED"}
            onClick={() => void handleTraitement(r.id, true)}
            style={r.etat === "APPROVED" ? {} : { backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
          >
            Approuver
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            disabled={r.etat === "REJECTED"}
            onClick={() => openRejectModal(r)}
          >
            Rejeter
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <AppPageHeader
          icon={<UserOutlined />}
          title={`Demandes d'inscription — Formation #${formationId}`}
          subtitle="Gérer et traiter les demandes d'inscription des enseignants"
          actions={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Retour</Button>
              <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={loading}>Actualiser</Button>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={exportToExcel}
                style={{ backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
              >
                Exporter approuvées
              </Button>
            </Space>
          }
        />

        <InscriptionStatGrid
          minColumnWidth={180}
          stats={[
            { icon: <TeamOutlined />,        label: "Total",      value: total,         tone: "brand"   },
            { icon: <CheckCircleOutlined />, label: "Approuvés",  value: approvedCount, tone: "success" },
            { icon: <ClockCircleOutlined />, label: "En attente", value: pendingCount,  tone: "warning" },
            { icon: <CloseCircleOutlined />, label: "Rejetés",    value: rejectedCount, tone: "danger"  },
          ]}
        />

        <Card style={{ borderRadius: 12 }}>
          {hasPendingSelection && (
            <div
              className="demandes-bulk-bar"
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                background: "linear-gradient(90deg, rgba(181, 18, 0, 0.05), rgba(181, 18, 0, 0.10))",
                border: "1px solid rgba(181, 18, 0, 0.25)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text>
                <strong>{selectedPending.length}</strong> demande(s) en attente sélectionnée(s)
              </Text>
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={traiterBulkMut.isPending}
                  onClick={() => void handleBulkApprove()}
                  style={{ backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
                >
                  Tout approuver
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={traiterBulkMut.isPending}
                  onClick={() => setBulkRejectOpen(true)}
                >
                  Tout rejeter
                </Button>
                <Button size="small" onClick={() => setSelectedRowIds([])}>
                  Effacer
                </Button>
              </Space>
            </div>
          )}
          <Table<Demande>
            rowKey="id"
            columns={columns}
            dataSource={demandes}
            rowSelection={{
              selectedRowKeys: selectedRowIds,
              onChange: (keys) => setSelectedRowIds(keys),
              getCheckboxProps: (record) => ({
                disabled: record.etat !== "PENDING",
              }),
            }}
            pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: [8, 16, 32] }}
            scroll={{ x: 900 }}
            size="middle"
          />
        </Card>

      <Modal
        title={
          <Space>
            <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
            <span>Rejeter la demande</span>
          </Space>
        }
        open={!!rejectTarget}
        onCancel={closeRejectModal}
        onOk={confirmRejection}
        okText="Confirmer le rejet"
        okButtonProps={{ danger: true, loading: traiterMut.isPending }}
        cancelText="Annuler"
        destroyOnHidden
      >
        {rejectTarget && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Text>
              Vous allez rejeter la demande de{" "}
              <strong>
                {rejectTarget.enseignant?.prenom ?? ""} {rejectTarget.enseignant?.nom ?? ""}
              </strong>
              {rejectTarget.enseignant?.mail ? ` (${rejectTarget.enseignant.mail})` : ""}.
            </Text>
            <Text type="secondary">
              Un email de notification lui sera envoyé automatiquement.
            </Text>
            <div>
              <label
                htmlFor="reject-motif"
                style={{ display: "block", marginBottom: 6, fontWeight: 500 }}
              >
                Motif du rejet (optionnel)
              </label>
              <AntInput.TextArea
                id="reject-motif"
                rows={3}
                maxLength={500}
                showCount
                placeholder="Ex : Quota atteint, prérequis non validés, chevauchement de dates…"
                value={rejectMotif}
                onChange={(e) => setRejectMotif(e.target.value)}
              />
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
            <span>Rejeter {selectedPending.length} demande(s)</span>
          </Space>
        }
        open={bulkRejectOpen}
        onCancel={() => { setBulkRejectOpen(false); setBulkMotif(""); }}
        onOk={() => void handleBulkReject()}
        okText="Confirmer le rejet groupé"
        okButtonProps={{ danger: true, loading: traiterBulkMut.isPending }}
        cancelText="Annuler"
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>
            Vous allez rejeter les <strong>{selectedPending.length}</strong> demande(s) en attente.
            Un email de notification sera envoyé à chaque enseignant.
          </Text>
          <div>
            <label
              htmlFor="bulk-reject-motif"
              style={{ display: "block", marginBottom: 6, fontWeight: 500 }}
            >
              Motif commun (optionnel)
            </label>
            <AntInput.TextArea
              id="bulk-reject-motif"
              rows={3}
              maxLength={500}
              showCount
              placeholder="Ex : Quota atteint pour cette session."
              value={bulkMotif}
              onChange={(e) => setBulkMotif(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
