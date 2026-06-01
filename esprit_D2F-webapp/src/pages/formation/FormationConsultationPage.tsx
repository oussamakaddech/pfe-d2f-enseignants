import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Input,
  Button,
  Space,
  Drawer,
  DatePicker,
  Popconfirm,
  Typography,
  Select,
  Modal,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";
import type { Dayjs } from "dayjs";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MailOutlined,
  PlusCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { AppPageHeader, StatusBadge, EmptyState } from "@/components/common";
import "@/styles/pages/formation-consultation-page.css";
import dayjs from "dayjs";

import { useAuth } from "@/hooks/auth/useAuth";
import {
  useAllFormations,
  useFormationsParDepartement,
  useFormationsWithDocuments,
  useDeleteFormation,
  useExportFormations,
  useUps,
  useDepartements,
  useProfile,
} from "@/hooks/formation";
import type { Formation } from "@/models/formation";
import type { FormationDocument } from "@/models/document";
import type { Id } from "@/models/common";
import FormationWorkflowEditForm from "./FormationWorkflowEditForm";
import DocumentConsultationModal from "@/pages/documentFormation/DocumentConsultationModal";
import MailForm from "@/pages/besoin/MailForm";
import useAppNotification from "@/hooks/ui/useAppNotification";

const normalizeRole = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replaceAll(/[\s_-]+/g, "");

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

const TYPE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  INTERNE: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  EXTERNE: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

interface RefItem {
  id?: Id;
  libelle?: string;
  nom?: string;
}

function FormationExpandRow({ record }: { record: Formation }) {
  return (
    <div className="formation-expand-content">
      <span className="formation-expand-title">Séances</span>
      <div className="formation-seance-list">
        {(record.seances || []).map((s) => (
          <span key={String(s.idSeance)} className="formation-seance-tag">
            <span className="formation-seance-date">{dayjs(s.dateSeance).format("DD/MM/YYYY")}</span>
            <span className="formation-seance-time">{s.heureDebut}–{s.heureFin}</span>
            {s.salle && <span className="formation-seance-salle">· {s.salle}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FormationConsultationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageFormations = normalizeRole(user?.role) === "admin";
  const isChefDept = normalizeRole(user?.role) === "chefdepartement";
  const { message: msgApi } = useAppNotification();

  const { data: profile } = useProfile();
  const deptId = (user?.deptId ?? profile?.deptId ?? profile?.departementId) as Id | undefined;

  const { data: formationsAll = [], isLoading: loadingAll, refetch: refetchAll } = useAllFormations();
  const { data: formationsDept = [], isLoading: loadingDept, refetch: refetchDept } = useFormationsParDepartement(
    isChefDept ? deptId : undefined,
  );
  const loading = loadingAll || loadingDept;
  const formations = useMemo(
    () => isChefDept && deptId ? formationsDept : formationsAll,
    [isChefDept, deptId, formationsDept, formationsAll],
  );

  const { data: formationsWithDocs = [] } = useFormationsWithDocuments();
  const documentsByFormation = useMemo(() => {
    const map = new Map<Id, FormationDocument[]>();
    for (const f of formationsWithDocs) {
      if (f.idFormation != null) map.set(f.idFormation, f.documents ?? []);
    }
    return map;
  }, [formationsWithDocs]);

  const deleteMut = useDeleteFormation();
  const exportMut = useExportFormations();

  const { data: upsData = [] } = useUps();
  const { data: deptsData = [] } = useDepartements();
  const upsOptions = useMemo(
    () => (upsData as unknown[]).map((u: unknown) => {
      const up = u as RefItem; // S4325: cast needed for compatibility
      return { id: up.id, libelle: up.libelle || up.nom || "_" };
    }),
    [upsData],
  );
  const deptsOptions = useMemo(
    () => (deptsData as unknown[]).map((d: unknown) => {
      const dept = d as RefItem; // S4325: cast needed for compatibility
      return { id: dept.id, libelle: dept.libelle || dept.nom || "_" };
    }),
    [deptsData],
  );

  const [filterText, setFilterText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [etatFilter, setEtatFilter] = useState<string | undefined>();
  const [upFilter, setUpFilter] = useState<Id | undefined>();
  const [deptFilter, setDeptFilter] = useState<Id | undefined>();
  const [periodFilter, setPeriodFilter] = useState<string | undefined>();
  const [periodRange, setPeriodRange] = useState<[Dayjs, Dayjs] | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openMail, setOpenMail] = useState(false);
  const [docsModalFormation, setDocsModalFormation] = useState<Formation | null>(null);

  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);

  const filtered = useMemo(() => {
    let res = [...formations];
    if (filterText) {
      res = res.filter((f) =>
        (f.titreFormation || "")
          .toLowerCase()
          .includes(filterText.toLowerCase()),
      );
    }
    if (typeFilter) res = res.filter((f) => f.typeFormation === typeFilter);
    if (etatFilter) res = res.filter((f) => f.etatFormation === etatFilter);
    if (upFilter) res = res.filter((f) => f.up1?.id === upFilter);
    if (deptFilter) res = res.filter((f) => f.departement1?.id === deptFilter);
    if (periodFilter) res = res.filter((f) => f.periodCode === periodFilter);
    if (periodRange) {
      const [start, end] = periodRange;
      res = res.filter((f) => {
        const debut = dayjs(f.dateDebut);
        const fin = dayjs(f.dateFin);
        return !debut.isBefore(start, "day") && !fin.isAfter(end, "day");
      });
    }
    return res;
  }, [formations, filterText, typeFilter, etatFilter, upFilter, deptFilter, periodFilter, periodRange]);

  async function handleDelete(id: Id) {
    if (!canManageFormations) return;
    try {
      await deleteMut.mutateAsync(id);
      msgApi.success("Formation supprimée");
    } catch {
      msgApi.error("Erreur suppression");
    }
  }

  async function handleExport() {
    if (!periodRange) {
      msgApi.error("Veuillez spécifier début et fin.");
      return;
    }
    const [start, end] = periodRange.map((d) => d.format("YYYY-MM-DD"));
    try {
      const response = await exportMut.mutateAsync({ start, end });
      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `formations_${start}_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
      msgApi.success("✔️ Export réussi !");
      setOpenExport(false);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const apiMsg = e?.response?.data?.message || e?.response?.data?.error || e?.message;
      msgApi.error(`❌ Erreur export : ${apiMsg}`);
    }
  }

  const rowSelection = {
    type: "radio" as const,
    selectedRowKeys: selectedFormation ? [selectedFormation.idFormation as Id] : [],
    onChange: (_: React.Key[], selectedRows: Formation[]) => {
      setSelectedFormation(selectedRows[0] || null);
    },
  };

  const columns: TableColumnsType<Formation> = [
    {
      title: "Formation",
      key: "formation",
      width: 260,
      render: (_, r) => (
        <div>
          <div className="formation-col-title">{r.titreFormation || "—"}</div>
          <div className="formation-col-subtitle">
            {r.up1?.libelle || ""}{r.departement1?.libelle ? ` · ${r.departement1.libelle}` : ""}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.titreFormation || "").localeCompare(b.titreFormation || ""),
    },
    {
      title: "Type",
      dataIndex: "typeFormation",
      key: "typeFormation",
      width: 110,
      render: (t: string) => {
        const c = TYPE_COLORS[t] ?? { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
        return <Tag style={{ color: c.color, background: c.bg, borderColor: c.border, borderRadius: 6, fontWeight: 500 }}>{t || "—"}</Tag>;
      },
      sorter: (a, b) => (a.typeFormation || "").localeCompare(b.typeFormation || ""),
    },
    {
      title: "Période",
      key: "periode",
      width: 130,
      render: (_, r) => {
        if (r.periodCode === "OTHER") return <Tag>{r.customPeriodLabel || "Autre"}</Tag>;
        const opt = PERIOD_OPTIONS.find((o) => o.value === r.periodCode);
        return opt ? <Tag>{opt.label}</Tag> : "—";
      },
      sorter: (a, b) => (a.periodCode || "").localeCompare(b.periodCode || ""),
    },
    {
      title: "Dates",
      key: "dates",
      width: 150,
      render: (_, r) => (
        <div className="formation-date-cell">
          <span className="formation-date-start">{r.dateDebut ? dayjs(r.dateDebut).format("DD/MM/YYYY") : "—"}</span>
          <span className="formation-date-end">{r.dateFin ? dayjs(r.dateFin).format("DD/MM/YYYY") : "—"}</span>
        </div>
      ),
      sorter: (a, b) => dayjs(a.dateDebut).valueOf() - dayjs(b.dateDebut).valueOf(),
    },
    {
      title: "État",
      dataIndex: "etatFormation",
      key: "etatFormation",
      width: 120,
      render: (e: string) => e ? <StatusBadge status={e} /> : <Tag>—</Tag>,
      sorter: (a, b) => (a.etatFormation || "").localeCompare(b.etatFormation || ""),
    },
    {
      title: "Documents",
      key: "documents",
      width: 120,
      align: "center" as const,
      render: (_, r) => {
        const count = documentsByFormation.get(r.idFormation as Id)?.length ?? 0;
        return (
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            disabled={count === 0}
            onClick={() => setDocsModalFormation(r)}
            title={count > 0 ? "Consulter les documents" : "Aucun document"}
          >
            {count}
          </Button>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "center" as const,
      render: (_, r) => {
        const role = normalizeRole(user?.role);
        const isResponsableDossier = role === "responsabledossier";
        return canManageFormations || isResponsableDossier ? (
          <Space size={4}>
            {(canManageFormations || isResponsableDossier) && (
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined />}
                onClick={() => { setSelectedFormation(r); setOpenEdit(true); }}
                title={isResponsableDossier ? "Gérer Dossier" : "Modifier"}
                className="formation-btn-edit"
              />
            )}
            {canManageFormations && (
              <Popconfirm
                title="Supprimer cette formation ?"
                onConfirm={() => void handleDelete(r.idFormation!)}
              >
                <Button type="text" shape="circle" icon={<DeleteOutlined />} danger className="formation-btn-delete" />
              </Popconfirm>
            )}
          </Space>
        ) : (
          <Tag color="blue" className="formation-tag-consultation">Consultation</Tag>
        );
      },
    },
  ];

  const resetFilters = () => {
    setFilterText("");
    setTypeFilter(undefined);
    setEtatFilter(undefined);
    setUpFilter(undefined);
    setDeptFilter(undefined);
    setPeriodFilter(undefined);
    setPeriodRange(null);
  };

  const hasActiveFilters = filterText || typeFilter || etatFilter || upFilter || deptFilter || periodFilter || periodRange;

  return (
    <div className="formation-consultation-page">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <AppPageHeader
          icon={<AppstoreOutlined />}
          title="Catalogue des Formations"
          subtitle={`${filtered.length} formation${filtered.length === 1 ? "" : "s"}${hasActiveFilters ? " (filtrées)" : ""}`}
          actions={
            <Space size={8}>
              {canManageFormations && (
                <Button
                  icon={<MailOutlined />}
                  disabled={!selectedFormation}
                  onClick={() => setOpenMail(true)}
                  className="formation-btn-email"
                >
                  Envoyer Email
                </Button>
              )}
              <Button icon={<DownloadOutlined />} onClick={() => setOpenExport(true)} className="formation-btn-export">
                Exporter
              </Button>
              {canManageFormations && (
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => navigate("/home/Formation/Creer")}
                  className="formation-btn-create"
                >
                  Nouvelle formation
                </Button>
              )}
            </Space>
          }
        />

        {/* ── Barre de filtres ─────────────────────────────────────────────── */}
        <div className="formation-filter-bar">
          <div className="formation-filter-header">
            <div className="formation-filter-title">
              <FilterOutlined />
              Filtres
              {hasActiveFilters && <span className="formation-filter-active-dot" />}
            </div>
            {hasActiveFilters && (
              <Button type="link" size="small" icon={<ReloadOutlined />} onClick={resetFilters}
                style={{ fontSize: 12, padding: "0 4px" }}>
                Réinitialiser
              </Button>
            )}
          </div>

          <div className="formation-filter-row">
            <Input.Search
              placeholder="Rechercher par titre..."
              allowClear
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onSearch={setFilterText}
              style={{ width: 220 }}
            />
            <Select placeholder="Type" allowClear value={typeFilter} onChange={setTypeFilter} style={{ width: 130 }}>
              <Option value="INTERNE">Interne</Option>
              <Option value="EXTERNE">Externe</Option>
            </Select>
            <Select placeholder="État" allowClear value={etatFilter} onChange={setEtatFilter} style={{ width: 140 }}>
              <Option value="ENREGISTRE">Enregistré</Option>
              <Option value="PLANIFIE">Planifié</Option>
              <Option value="EN_COURS">En cours</Option>
              <Option value="ACHEVE">Achevé</Option>
              <Option value="ANNULE">Annulé</Option>
            </Select>
            <Select placeholder="Période" allowClear value={periodFilter} onChange={setPeriodFilter} style={{ width: 150 }}>
              {PERIOD_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
            <Select placeholder="UP" allowClear value={upFilter as string} onChange={(v) => setUpFilter(v as Id)} style={{ width: 170 }} showSearch optionFilterProp="children">
              {upsOptions.map((u) => <Option key={String(u.id)} value={u.id as string}>{u.libelle}</Option>)}
            </Select>
            <Select placeholder="Département" allowClear value={deptFilter as string} onChange={(v) => setDeptFilter(v as Id)} style={{ width: 170 }} showSearch optionFilterProp="children">
              {deptsOptions.map((d) => <Option key={String(d.id)} value={d.id as string}>{d.libelle}</Option>)}
            </Select>
            <RangePicker
              onChange={(dates) => setPeriodRange(dates as [Dayjs, Dayjs] | null)}
              placeholder={["Début", "Fin"]}
              style={{ width: 220 }}
            />
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="formation-table-wrapper">
        <Table<Formation>
          rowSelection={canManageFormations ? rowSelection : undefined}
          dataSource={filtered}
          columns={columns}
          rowKey="idFormation"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} formation${total === 1 ? "" : "s"}` }}
          locale={{
            emptyText: (
              <EmptyState
                icon={<AppstoreOutlined />}
                title="Aucune formation trouvée"
                description={hasActiveFilters ? "Aucun résultat ne correspond aux filtres appliqués." : "Aucune formation enregistrée pour le moment."}
                action={hasActiveFilters ? { label: "Effacer les filtres", onClick: resetFilters } : undefined}
                compact
              />
            ),
          }}
          expandable={{
            expandedRowRender: (record) => <FormationExpandRow record={record} />,
            rowExpandable: (record) => record.seances != null,
          }}
        />
        </div>

        {/* Drawer E-mail */}
        {canManageFormations && (
          <Drawer
            title="Envoyer un e-mail"
            placement="right"
            width={720}
            onClose={() => setOpenMail(false)}
            open={openMail}
            className="formation-drawer"
          >
            {selectedFormation && (
              <MailForm
                formation={selectedFormation as unknown as Parameters<typeof MailForm>[0]["formation"]}
                onSendSuccess={() => {
                  msgApi.success("E-mail envoyé !");
                  setOpenMail(false);
                }}
              />
            )}
          </Drawer>
        )}

        {canManageFormations && (
          <Drawer
            title="Modifier Formation"
            placement="right"
            width={720}
            onClose={() => setOpenEdit(false)}
            open={openEdit}
            className="formation-drawer"
          >
            {selectedFormation && (
              <FormationWorkflowEditForm
                formation={selectedFormation as unknown as Parameters<typeof FormationWorkflowEditForm>[0]["formation"]}
                onFormationUpdated={() => {
                  setOpenEdit(false);
                  void refetchAll();
                  if (isChefDept && deptId) void refetchDept();
                }}
              />
            )}
          </Drawer>
        )}

        {/* Modal Consultation Documents (lecture seule) */}
        <DocumentConsultationModal
          open={docsModalFormation != null}
          onClose={() => setDocsModalFormation(null)}
          titreFormation={docsModalFormation?.titreFormation}
          documents={docsModalFormation ? (documentsByFormation.get(docsModalFormation.idFormation as Id) ?? []) : []}
        />

        {/* Modal Export */}
        <Modal
          title="Exporter en Excel"
          open={openExport}
          onOk={() => void handleExport()}
          onCancel={() => setOpenExport(false)}
          okText="Exporter"
          cancelText="Annuler"
        >
          <RangePicker
            style={{ width: "100%", marginTop: 8 }}
            onChange={(dates) => setPeriodRange(dates as [Dayjs, Dayjs] | null)}
          />
        </Modal>
      </div>
  );
}
