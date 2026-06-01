import {
  Table,
  Button,
  Upload,
  Drawer,
  Space,
  Tooltip,
  Card,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  UploadOutlined,
  UserAddOutlined,
  DownloadOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import EnseignantRegister from "./EnseignantRegister";
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

export default function TeachersDataGrid() {
  const navigate = useNavigate();
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

  const rowSelection = {
    type: "radio" as const,
    selectedRowKeys: selectedTeacher ? [(selectedTeacher as Record<string, unknown>).id as string] : [],
    onChange: (_: unknown, rows: Record<string, unknown>[]) => setSelectedTeacher(rows[0]),
  };

  const exportExcel = () => {
    const rows = data.map((e: Record<string, unknown>) => {
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

  return (
    <>
      <div className="teachers-page">
        {/* Hero Banner */}
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
              <Tooltip title={selectedTeacher ? "Créer un compte pour l'enseignant sélectionné" : "Sélectionnez d'abord un enseignant dans le tableau"}>
                <Button type="primary" icon={<UserAddOutlined />} disabled={!selectedTeacher} onClick={() => setDrawerVisible(true)} className="teachers-btn-create">
                  Créer Compte
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="teachers-stats">
          <div className="teachers-stat-card teachers-stat-card--total">
            <div className="teachers-stat-icon" style={{ background: "#fff0ee", color: "#B51200" }}><TeamOutlined /></div>
            <div className="teachers-stat-label">Total</div>
            <div className="teachers-stat-value" style={{ color: "#B51200" }}>{data.length}</div>
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

        {/* Toolbar */}
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
          <Tooltip title={data.length ? "Exporter la liste en Excel" : "Aucune donnée à exporter"}>
            <Button icon={<DownloadOutlined />} onClick={exportExcel} disabled={!data.length} className="teachers-btn-export">
              Exporter Excel
            </Button>
          </Tooltip>
        </div>

        {/* Table */}
        <Card className="teachers-table-wrapper">
          <Table
            rowSelection={rowSelection}
            dataSource={data}
            columns={columns as ColumnsType<Record<string, unknown>>}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (total) => `${total} enseignant${total === 1 ? "" : "s"}` }}
            onRow={(record: Record<string, unknown>) => ({ onClick: () => { navigate(`/home/calendar/${record.id}`); } })}
            style={{ cursor: "pointer" }}
          />
        </Card>

        {/* Drawer: Créer compte */}
        <Drawer title="Créer un compte à partir de cet enseignant" width={400} onClose={() => { setDrawerVisible(false); setActiveExtractIndex(null); }} open={drawerVisible} destroyOnHidden>
          <EnseignantRegister
            initialValues={{
              id: String((selectedTeacher as Record<string, unknown>)?.id ?? ""),
              username: String((selectedTeacher as Record<string, unknown>)?.mail ?? "").split("@")[0] || "",
              firstName: String((selectedTeacher as Record<string, unknown>)?.prenom ?? ""),
              lastName: String((selectedTeacher as Record<string, unknown>)?.nom ?? ""),
              email: String((selectedTeacher as Record<string, unknown>)?.mail ?? ""),
              role: "Formateur",
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
            onError={() => {}}
          />
        </Drawer>

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
