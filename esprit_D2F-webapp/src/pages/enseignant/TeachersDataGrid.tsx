import { useMemo, useState } from "react";
import {
  Table,
  Button,
  Upload,
  Space,
  Tooltip,
  Card,
  Input,
  Select,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  UploadOutlined,
  UserAddOutlined,
  DownloadOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SearchOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import CreateAccountDrawer from "@/pages/admin/gererComptes/CreateAccountDrawer";
import TeacherEditModal from "@/components/enseignant/TeacherEditModal";
import TeacherCreateModal from "./components/TeacherCreateModal";
import { useTeachersColumns } from "./components/TeachersTableColumns";
import { useTeachersDataGrid } from "./hooks/useTeachersDataGrid";
// Design tokens are used via CSS classes — see TeachersDataGrid.css
import "@/styles/pages/teachers-data-grid.css";

interface SelectItem {
  id: string | number;
  libelle: string;
}

interface ExtractedTeacherItem {
  nom_complet?: string;
  mail?: string;
  fichier?: string;
}

type Row = Record<string, unknown>;
type TeacherSort = "nom_asc" | "nom_desc" | "type" | "up" | "dept" | "email";

const TYPE_LABELS: Record<string, string> = { P: "Permanent", V: "Vacataire", C: "Contractuel" };

const SORT_OPTIONS: { value: TeacherSort; label: string }[] = [
  { value: "nom_asc",  label: "Nom (A → Z)" },
  { value: "nom_desc", label: "Nom (Z → A)" },
  { value: "type",     label: "Type" },
  { value: "up",       label: "UP" },
  { value: "dept",     label: "Département" },
  { value: "email",    label: "Email" },
];

const isTruthyFlag = (v: unknown) => v === "O" || v === "Y" || v === "1";
const str = (v: unknown) => String(v ?? "");

/** Valeurs distinctes non vides d'une colonne, triées alphabétiquement. */
function distinctValues(rows: Row[], key: string): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = str(r[key]).trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default function TeachersDataGrid({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [upFilter, setUpFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [qualityFilter, setQualityFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<TeacherSort>("nom_asc");
  const {
    data, isLoading, ups, depts, extracted, setExtracted,
    file, setFile, handleUpload,
    selectedTeacher, setSelectedTeacher,
    drawerVisible, setDrawerVisible, activeExtractIndex, setActiveExtractIndex,
    editModalOpen, setEditModalOpen, editingRecord, setEditingRecord,
    editLoading, editForm, openEditModal, handleEditSave,
    createModalOpen, setCreateModalOpen, creatingExtract,
    setCreatingExtract, setCreatingExtractIndex,
    createLoading, createForm, openCreateExtractModal, handleCreateExtractSave,
    handleIgnoreExtract, handleDelete,
  } = useTeachersDataGrid();

  const columns = useTeachersColumns({ onEdit: openEditModal, onDelete: (record) => void handleDelete(record) });

  const typeOptions = useMemo(() => distinctValues(data, "type"), [data]);
  const upOptions = useMemo(() => distinctValues(data, "upLibelle"), [data]);
  const deptOptions = useMemo(() => distinctValues(data, "deptLibelle"), [data]);

  const displayedData = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = data.filter((d) => {
      if (typeFilter !== "ALL" && str(d.type) !== typeFilter) return false;
      if (upFilter !== "ALL" && str(d.upLibelle) !== upFilter) return false;
      if (deptFilter !== "ALL" && str(d.deptLibelle) !== deptFilter) return false;
      if (qualityFilter.includes("CUP") && !isTruthyFlag(d.cup)) return false;
      if (qualityFilter.includes("CHEF") && !isTruthyFlag(d.chefDepartement)) return false;
      if (!term) return true;
      return (
        str(d.nom).toLowerCase().includes(term) ||
        str(d.prenom).toLowerCase().includes(term) ||
        str(d.mail).toLowerCase().includes(term)
      );
    });

    const cmp = (a: Row, b: Row, key: string) => str(a[key]).localeCompare(str(b[key]));
    const sorted = [...rows];
    switch (sortBy) {
      case "nom_asc":  sorted.sort((a, b) => cmp(a, b, "nom")); break;
      case "nom_desc": sorted.sort((a, b) => cmp(b, a, "nom")); break;
      case "type":     sorted.sort((a, b) => cmp(a, b, "type")); break;
      case "up":       sorted.sort((a, b) => cmp(a, b, "upLibelle")); break;
      case "dept":     sorted.sort((a, b) => cmp(a, b, "deptLibelle")); break;
      case "email":    sorted.sort((a, b) => cmp(a, b, "mail")); break;
    }
    return sorted;
  }, [data, search, typeFilter, upFilter, deptFilter, qualityFilter, sortBy]);

  const hasActiveFilters =
    !!search || typeFilter !== "ALL" || upFilter !== "ALL" || deptFilter !== "ALL" || qualityFilter.length > 0;

  const rowSelection = {
    type: "radio" as const,
    selectedRowKeys: selectedTeacher ? [(selectedTeacher as Record<string, unknown>).id as string] : [],
    onChange: (_: unknown, rows: Record<string, unknown>[]) => setSelectedTeacher(rows[0]),
  };

  const exportExcel = () => {
    const rows = displayedData.map((e: Record<string, unknown>) => {
      let eType = String(e.type || "");
      if (e.type === "P") eType = "Permanent";
      else if (e.type === "V") eType = "Vacataire";
      return {
        Nom:         String(e.nom || ""),
        Prénom:      String(e.prenom || ""),
        Email:       String(e.mail || ""),
        Type:        eType,
        UP:          String(e.upLibelle || ""),
        Département: String(e.deptLibelle || ""),
        CUP:         (e.cup === "O" || e.cup === "Y" || e.cup === "1") ? "Oui" : "Non",
        "Chef Dépt": (e.chefDepartement === "O" || e.chefDepartement === "Y" || e.chefDepartement === "1") ? "Oui" : "Non",
      };
    });
    writeExcel(
      [{ name: "Enseignants", rows, title: "Liste des Enseignants — Esprit", subtitle: exportDateLabel() }],
      `enseignants_${isoDate()}.xlsx`
    );
  };

  const permCount = data.filter((d: Record<string, unknown>) => d.type === "P").length;
  const vacCount  = data.filter((d: Record<string, unknown>) => d.type === "V").length;
  const cupCount  = data.filter((d: Record<string, unknown>) => d.cup === "O" || d.cup === "Y" || d.cup === "1").length;

  // Si l'enseignant sélectionné a déjà un compte lié (userId), interdire la création
  const selectedHasAccount = !!(selectedTeacher as Record<string, unknown>)?.userId;
  const createBtnTooltip = selectedHasAccount
    ? "Cet enseignant possède déjà un compte. Utilisez la gestion des comptes pour le modifier."
    : "Créer un nouveau compte utilisateur";

  return (
    <>
      <div className="teachers-page">
        {/* Hero Banner (masqué quand intégré dans la page unifiée) */}
        {!embedded && (
        <div className="teachers-hero">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 className="teachers-hero-title">Annuaire des Enseignants</h2>
                <span className="teachers-hero-badge">
                  {data.length}
                  <span className="teachers-hero-badge-total">enseignant{data.length === 1 ? "" : "s"}</span>
                </span>
              </div>
              <div className="teachers-hero-subtitle">Gérer, importer et créer les comptes enseignants</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tooltip title={createBtnTooltip}>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setDrawerVisible(true)}
                  className="teachers-btn-create"
                  disabled={selectedHasAccount}
                >
                  Créer un compte
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
        )}

        {/* Statistiques */}
        <div className="teachers-stats">
          <div className="teachers-stat-card teachers-stat-card--total">
            <div className="teachers-stat-icon" style={{ background: "#fff0ee", color: "#b51200" }}><TeamOutlined /></div>
            <div className="teachers-stat-label">Total</div>
            <div className="teachers-stat-value" style={{ color: "#b51200" }}>{data.length}</div>
          </div>
          <div className="teachers-stat-card teachers-stat-card--perm">
            <div className="teachers-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><UserOutlined /></div>
            <div className="teachers-stat-label">Permanents</div>
            <div className="teachers-stat-value" style={{ color: "#2563eb" }}>{permCount}</div>
          </div>
          <div className="teachers-stat-card teachers-stat-card--vac">
            <div className="teachers-stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}><UserOutlined /></div>
            <div className="teachers-stat-label">Vacataires</div>
            <div className="teachers-stat-value" style={{ color: "#d97706" }}>{vacCount}</div>
          </div>
          <div className="teachers-stat-card teachers-stat-card--cup">
            <div className="teachers-stat-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><SafetyCertificateOutlined /></div>
            <div className="teachers-stat-label">CUP</div>
            <div className="teachers-stat-value" style={{ color: "#7c3aed" }}>{cupCount}</div>
          </div>
        </div>

        {/* Extracted AI panel */}
        {extracted?.length > 0 && (
          <div className="teachers-extracted-panel">
            <div className="teachers-extracted-title">
              Enseignants extraits (IA){" "}
              <span className="teachers-extracted-badge">{extracted.length}</span>
            </div>
            <div className="teachers-extracted-grid">
              {extracted.map((ex: Record<string, unknown>, idx: number) => (
                <div key={`${String(ex?.nom_complet ?? "unnamed").slice(0, 40)}_${idx}`} className="teachers-extracted-item">
                  <div className="teachers-extracted-name">{String(ex?.nom_complet ?? "—")}</div>
                  {!!ex?.fichier && <div className="teachers-extracted-file">{String(ex.fichier)}</div>}
                  <Space style={{ marginTop: 8 }}>
                    <Button size="small" type="primary" onClick={() => openCreateExtractModal(ex, idx)}>Créer</Button>
                    <Button size="small" onClick={() => handleIgnoreExtract(idx)}>Ignorer</Button>
                  </Space>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtres avancés & tri */}
        <div className="teachers-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Rechercher (nom, prénom, email...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ minWidth: 150 }}
            options={[
              { value: "ALL", label: "Tous les types" },
              ...typeOptions.map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t })),
            ]}
          />
          <Select
            showSearch
            value={upFilter}
            onChange={setUpFilter}
            style={{ minWidth: 150 }}
            options={[
              { value: "ALL", label: "Toutes les UP" },
              ...upOptions.map((u) => ({ value: u, label: u })),
            ]}
          />
          <Select
            showSearch
            value={deptFilter}
            onChange={setDeptFilter}
            style={{ minWidth: 180 }}
            options={[
              { value: "ALL", label: "Tous les départements" },
              ...deptOptions.map((d) => ({ value: d, label: d })),
            ]}
          />
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={qualityFilter}
            onChange={setQualityFilter}
            placeholder="Qualité"
            style={{ minWidth: 150 }}
            options={[
              { value: "CUP", label: "CUP" },
              { value: "CHEF", label: "Chef de département" },
            ]}
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ minWidth: 160 }}
            suffixIcon={<SortAscendingOutlined />}
            options={SORT_OPTIONS}
          />
          <span style={{ color: "#64748b", fontSize: 13 }}>
            {displayedData.length} résultat{displayedData.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Import / Export / Création */}
        <div className="teachers-toolbar">
          <Upload accept=".xlsx,.xls" beforeUpload={(f) => { setFile(f); return false; }} showUploadList={false}>
            <Button icon={<UploadOutlined />} className="teachers-btn-select">
              {file ? file.name : "Sélectionner fichier"}
            </Button>
          </Upload>
          <Tooltip title={file ? "Importer le fichier sélectionné" : "Sélectionnez d'abord un fichier Excel"}>
            <Button type="primary" disabled={!file} onClick={handleUpload} icon={<UploadOutlined />} className="teachers-btn-import">
              Importer Excel
            </Button>
          </Tooltip>
          <div className="teachers-toolbar-divider" />
          <Tooltip title={displayedData.length ? "Exporter la liste filtrée en Excel" : "Aucune donnée à exporter"}>
            <Button icon={<DownloadOutlined />} onClick={exportExcel} disabled={!displayedData.length} className="teachers-btn-export">
              Exporter Excel
            </Button>
          </Tooltip>
          {embedded && (
            <Tooltip title={createBtnTooltip}>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setDrawerVisible(true)}
                className="teachers-btn-create"
                style={{ marginLeft: "auto" }}
                disabled={selectedHasAccount}
              >
                Créer un compte
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Table */}
        <Card className="teachers-table-wrapper">
          <Table
            rowSelection={rowSelection}
            dataSource={displayedData}
            columns={columns as ColumnsType<Record<string, unknown>>}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (total) => `${total} enseignant${total === 1 ? "" : "s"}` }}
            onRow={(record: Record<string, unknown>) => ({ onClick: () => { navigate(`/home/calendar/${record.id}`); } })}
            style={{ cursor: "pointer" }}
            locale={{ emptyText: hasActiveFilters ? "Aucun enseignant ne correspond aux filtres." : "Aucun enseignant trouvé." }}
          />
        </Card>

        {/* Drawer: Créer compte */}
        <CreateAccountDrawer
          open={drawerVisible}
          onClose={() => {
            setDrawerVisible(false);
            setActiveExtractIndex(null);
          }}
          onSuccess={() => {
            setDrawerVisible(false);
            setSelectedTeacher(null);
            if (activeExtractIndex !== null) {
              const next = extracted.filter((_: unknown, i: number) => i !== activeExtractIndex);
              setExtracted(next);
              setActiveExtractIndex(null);
            }
          }}
          title="Créer un compte pour cet enseignant"
          subtitle="Les informations de l'enseignant sont pré-remplies. Choisissez le rôle à attribuer puis définissez un identifiant et un mot de passe."
          initialValues={{
            firstName: String((selectedTeacher as Record<string, unknown>)?.prenom ?? ""),
            lastName:  String((selectedTeacher as Record<string, unknown>)?.nom ?? ""),
            email:     String((selectedTeacher as Record<string, unknown>)?.mail ?? ""),
            username:  String((selectedTeacher as Record<string, unknown>)?.mail ?? "").split("@")[0] || "",
            role:      "ANIMATEUR",
          }}
        />

        <TeacherEditModal
          open={editModalOpen}
          record={editingRecord}
          confirmLoading={editLoading}
          ups={ups as SelectItem[]}
          depts={depts as SelectItem[]}
          form={editForm}
          onOk={handleEditSave}
          onCancel={() => { setEditModalOpen(false); setEditingRecord(null); }}
        />
      </div>

      <TeacherCreateModal
        open={createModalOpen}
        extractedTeacher={creatingExtract as ExtractedTeacherItem | null}
        onConfirm={handleCreateExtractSave}
        onCancel={() => {
          setCreateModalOpen(false);
          setCreatingExtractIndex(null);
          setCreatingExtract(null);
          createForm.resetFields();
        }}
        loading={createLoading}
        ups={ups as SelectItem[]}
        depts={depts as SelectItem[]}
        form={createForm}
      />
    </>
  );
}
