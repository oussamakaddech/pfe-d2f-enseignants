import { useState, useRef, useEffect } from "react";
import {
  Table,
  Button,
  Upload,
  Typography,
  Input,
  Drawer,
  Modal,
  Form,
  Select,
  Popconfirm,
  Space,
  Tooltip,
  Card,
} from "antd";
import {
  SearchOutlined,
  UploadOutlined,
  UserAddOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import {
  useEnseignants,
  useCreateEnseignant,
  useUpdateEnseignant,
  useDeleteEnseignant,
  useUploadEnseignants,
} from "@/hooks/enseignant";
import { useUps, useDepartements } from "@/hooks/formation";
import EnseignantRegister from "./EnseignantRegister";
import TeacherEditModal from "@/components/enseignant/TeacherEditModal";
import useAppNotification from "@/hooks/ui/useAppNotification";
// Design tokens are used via CSS classes — see TeachersDataGrid.css
import "@/styles/pages/teachers-data-grid.css";

const { Text } = Typography;
const { Option } = Select;

export default function TeachersDataGrid() {
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();
  const { data: data = [], isLoading } = useEnseignants();
  const createMut = useCreateEnseignant();
  const updateMut = useUpdateEnseignant();
  const deleteMut = useDeleteEnseignant();
  const uploadMut = useUploadEnseignants();
  const { data: ups = [] } = useUps();
  const { data: depts = [] } = useDepartements();
  const [extracted, setExtracted] = useState([]);
  const [activeExtractIndex, setActiveExtractIndex] = useState(null);
  const [file, setFile] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  // ── Create extracted teacher modal ───────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingExtractIndex, setCreatingExtractIndex] = useState(null);
  const [creatingExtract, setCreatingExtract] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rice_extracted_enseignants");
      if (raw) setExtracted(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (record) => {
    try {
      await deleteMut.mutateAsync(record.id);
      msgApi.success(`Enseignant "${record.nom} ${record.prenom}" supprimé`);
      if (selectedTeacher?.id === record.id) setSelectedTeacher(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEditModal = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      nom: record.nom,
      prenom: record.prenom,
      mail: record.mail,
      type: record.type,
      etat: record.etat || "A",
      cup: record.cup || "N",
      chefDepartement: record.chefDepartement || "N",
      upId: record.upId || undefined,
      deptId: record.deptId || undefined,
    });
    setEditModalOpen(true);
  };

  const splitExtractedName = (value) => {
    const name = String(value ?? "").trim();
    if (!name) return { prenom: "", nom: "" };
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { prenom: parts[0], nom: "" };
    const nom = parts.pop();
    const prenom = parts.join(" ");
    return { prenom, nom };
  };

  const openCreateExtractModal = (ex, idx) => {
    const { prenom, nom } = splitExtractedName(ex?.nom_complet);
    const nomUp = String(nom || "").trim().toUpperCase();
    const prenomClean = String(prenom || "").trim();
    const generatedMail = nomUp && prenomClean
      ? `${nomUp.toLowerCase()}.${prenomClean.toLowerCase().replaceAll(/\s+/g, ".")}@esprit.tn`
      : "";
    const draft = {
      prenom: prenomClean,
      nom: nomUp,
      mail: ex?.mail ?? generatedMail,
      type: "P",
      etat: "A",
      cup: "N",
      chefDepartement: "N",
      upId: undefined,
      deptId: undefined,
    };

    setCreatingExtractIndex(idx);
    setCreatingExtract(ex);
    createForm.setFieldsValue(draft);
    setCreateModalOpen(true);
  };

  const handleCreateExtractSave = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);

      const nomUp = String(values.nom ?? "").trim().toUpperCase();
      const prenom = String(values.prenom ?? "").trim();
      const mail = String(values.mail ?? "").trim() || (nomUp && prenom ? `${nomUp.toLowerCase()}.${prenom.toLowerCase().replaceAll(/\s+/g, ".")}@esprit.tn` : "");

      const payload = {
        nom: nomUp,
        prenom,
        mail,
        type: values.type,
        etat: values.etat,
        cup: values.cup,
        chefDepartement: values.chefDepartement,
        up: values.upId ? { id: values.upId } : null,
        dept: values.deptId ? { id: values.deptId } : null,
      };

      if (!payload.nom || !payload.prenom || !payload.mail) {
        throw new Error("Nom, prénom et email sont requis pour créer un enseignant");
      }

      await createMut.mutateAsync(payload);
      msgApi.success("Enseignant créé avec succès !");

      if (creatingExtractIndex !== null) {
        const next = extracted.filter((_, i) => i !== creatingExtractIndex);
        setExtracted(next);
        try {
          localStorage.setItem("rice_extracted_enseignants", JSON.stringify(next));
        } catch {}
      }

      setCreateModalOpen(false);
      setCreatingExtractIndex(null);
      setCreatingExtract(null);
      createForm.resetFields();
    } catch (err) {
      if (err.errorFields) return;
      const msg = err.response?.data?.message || err.message || "Erreur lors de la création";
      msgApi.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      const payload = {
        id: editingRecord.id,
        nom: values.nom,
        prenom: values.prenom,
        mail: values.mail,
        type: values.type,
        etat: values.etat,
        cup: values.cup,
        chefDepartement: values.chefDepartement,
        up: values.upId ? { id: values.upId } : null,
        dept: values.deptId ? { id: values.deptId } : null,
      };
      await updateMut.mutateAsync({ id: editingRecord.id, data: payload });
      msgApi.success("Enseignant modifié avec succès !");
      setEditModalOpen(false);
      setEditingRecord(null);
    } catch (err) {
      if (err.errorFields) return; // form validation error
      const msg = err.response?.data?.message || "Erreur lors de la modification";
      msgApi.error(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const res = await uploadMut.mutateAsync(file);
      msgApi.success(res?.data?.message || res?.message || "Import Excel réussi !");
      setFile(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      msgApi.error(msg);
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
  };

  const getColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${placeholder}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Button
          type="primary"
          onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          OK
        </Button>
        <Button
          onClick={() => handleReset(clearFilters)}
          size="small"
          style={{ width: 90 }}
        >
          Réinitialiser
        </Button>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ?.toString()
        .toLowerCase()
        .includes(value.toLowerCase()),
    filterDropdownProps: {
      onOpenChange: (visible) => {
        if (visible) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: 0 }}>{text}</span>
      ) : (
        text
      ),
  });

  const columns = [
    {
      title: "Enseignant",
      key: "enseignant",
      sorter: (a, b) => a.nom.localeCompare(b.nom),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("nom", "Nom"),
      render: (_, record) => (
        <div className="teachers-name-cell">
          <div className={getAvatarClass(record.type)}>
            {getInitials(record.nom, record.prenom)}
          </div>
          <div>
            <div className="teachers-name-primary">{record.nom} {record.prenom}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              {(record.cup === "O" || record.cup === "Y" || record.cup === "1") && (
                <span className="teachers-badge teachers-badge--cup">CUP</span>
              )}
              {(record.chefDepartement === "O" || record.chefDepartement === "Y" || record.chefDepartement === "1") && (
                <span className="teachers-badge teachers-badge--chef">Chef</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 140,
      sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("type", "Type"),
      render: (type) => getTypeTag(type),
    },
    {
      title: "Email",
      dataIndex: "mail",
      key: "mail",
      sorter: (a, b) => (a.mail || "").localeCompare(b.mail || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("mail", "Email"),
      render: (mail) => mail
        ? <span className="teachers-email"><MailOutlined className="teachers-email-icon" />{mail}</span>
        : <span style={{ color: "#cbd5e0" }}>—</span>,
    },
    {
      title: "UP",
      dataIndex: "upLibelle",
      key: "upLibelle",
      sorter: (a, b) => (a.upLibelle || "").localeCompare(b.upLibelle || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("upLibelle", "UP"),
      render: (up) => up || <span style={{ color: "#cbd5e0" }}>—</span>,
    },
    {
      title: "Département",
      dataIndex: "deptLibelle",
      key: "deptLibelle",
      sorter: (a, b) => (a.deptLibelle || "").localeCompare(b.deptLibelle || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("deptLibelle", "Département"),
      render: (dept) => dept || <span style={{ color: "#cbd5e0" }}>—</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined />}
              className="teachers-btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(record);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cet enseignant ?"
            description={`${record.nom} ${record.prenom} sera définitivement supprimé.`}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="teachers-btn-delete"
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    type: "radio",
    selectedRowKeys: selectedTeacher ? [selectedTeacher.id] : [],
    onChange: (_, rows) => setSelectedTeacher(rows[0]),
  };

  const exportExcel = () => {
    const rows = data.map(e => {
      let eType = e.type || "";
      if (e.type === "P") eType = "Permanent";
      else if (e.type === "V") eType = "Vacataire";
      return {
        Nom:         e.nom || "",
        Prénom:      e.prenom || "",
        Email:       e.mail || "",
        Type:        eType,
        UP:          e.upLibelle || "",
        Département: e.deptLibelle || "",
        CUP:         (e.cup === "O" || e.cup === "Y" || e.cup === "1") ? "Oui" : "Non",
        "Chef Dépt": (e.chefDepartement === "O" || e.chefDepartement === "Y" || e.chefDepartement === "1") ? "Oui" : "Non",
      };
    });
    writeExcel(
      [{ name: "Enseignants", rows, title: "Liste des Enseignants — Esprit", subtitle: exportDateLabel() }],
      `enseignants_${isoDate()}.xlsx`
    );
  };

  // Stats
  const permCount = data.filter(d => d.type === "P").length;
  const vacCount = data.filter(d => d.type === "V").length;
  const cupCount = data.filter(d => d.cup === "O" || d.cup === "Y" || d.cup === "1").length;

  // Avatar helper
  const getAvatarClass = (type) => {
    if (type === "P") return "teachers-avatar teachers-avatar--perm";
    if (type === "V") return "teachers-avatar teachers-avatar--vac";
    if (type === "C") return "teachers-avatar teachers-avatar--cont";
    return "teachers-avatar teachers-avatar--other";
  };

  const getInitials = (nom, prenom) => {
    const n = (nom || "").charAt(0).toUpperCase();
    const p = (prenom || "").charAt(0).toUpperCase();
    return p + n || "?";
  };

  const getTypeTag = (type) => {
    if (type === "P") return <span className="teachers-type-tag teachers-type-tag--perm"><span className="teachers-type-dot teachers-type-dot--perm" />Permanent</span>;
    if (type === "V") return <span className="teachers-type-tag teachers-type-tag--vac"><span className="teachers-type-dot teachers-type-dot--vac" />Vacataire</span>;
    if (type === "C") return <span className="teachers-type-tag teachers-type-tag--cont"><span className="teachers-type-dot teachers-type-dot--cont" />Contractuel</span>;
    return <span className="teachers-type-tag teachers-type-tag--other"><span className="teachers-type-dot teachers-type-dot--other" />{type || "—"}</span>;
  };

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
                  <span className="teachers-hero-badge-total">enseignant{data.length !== 1 ? "s" : ""}</span>
                </span>
              </div>
              <div className="teachers-hero-subtitle">Gérer, importer et créer les comptes enseignants</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tooltip title={selectedTeacher ? "Créer un compte pour l\'enseignant sélectionné" : "Sélectionnez d\'abord un enseignant dans le tableau"}>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  disabled={!selectedTeacher}
                  onClick={() => setDrawerVisible(true)}
                  className="teachers-btn-create"
                >
                  Créer Compte
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="teachers-stats">
          <div className="teachers-stat-card teachers-stat-card--total">
            <div className="teachers-stat-icon" style={{ background: "#fff0ee", color: "#B51200" }}>
              <TeamOutlined />
            </div>
            <div className="teachers-stat-label">Total</div>
            <div className="teachers-stat-value" style={{ color: "#B51200" }}>{data.length}</div>
          </div>
          <div className="teachers-stat-card teachers-stat-card--perm">
            <div className="teachers-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <UserOutlined />
            </div>
            <div className="teachers-stat-label">Permanents</div>
            <div className="teachers-stat-value" style={{ color: "#2563eb" }}>{permCount}</div>
          </div>
          <div className="teachers-stat-card teachers-stat-card--vac">
            <div className="teachers-stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
              <UserOutlined />
            </div>
            <div className="teachers-stat-label">Vacataires</div>
            <div className="teachers-stat-value" style={{ color: "#d97706" }}>{vacCount}</div>
          </div>
          <div className="teachers-stat-card teachers-stat-card--cup">
            <div className="teachers-stat-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <SafetyCertificateOutlined />
            </div>
            <div className="teachers-stat-label">CUP</div>
            <div className="teachers-stat-value" style={{ color: "#7c3aed" }}>{cupCount}</div>
          </div>
        </div>

        {extracted?.length > 0 && (
          <div className="teachers-extracted-panel">
            <div className="teachers-extracted-title">
              🤖 Enseignants extraits (IA){" "}
              <span className="teachers-extracted-badge">{extracted.length}</span>
            </div>
            <div className="teachers-extracted-grid">
              {extracted.map((ex, idx) => (
                <div
                  key={`${String(ex?.nom_complet ?? "unnamed").slice(0, 40)}_${idx}`}
                  className="teachers-extracted-item"
                >
                  <div className="teachers-extracted-name">{ex?.nom_complet ?? "—"}</div>
                  {ex?.fichier && (
                    <div className="teachers-extracted-file">{ex.fichier}</div>
                  )}
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => openCreateExtractModal(ex, idx)}
                    >
                      Créer
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        const next = extracted.filter((_, i) => i !== idx);
                        setExtracted(next);
                        try { localStorage.setItem("rice_extracted_enseignants", JSON.stringify(next)); } catch {}
                        msgApi.info("Extrait ignoré");
                      }}
                    >
                      Ignorer
                    </Button>
                  </Space>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="teachers-toolbar">
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} className="teachers-btn-select">
              {file ? file.name : "Sélectionner fichier"}
            </Button>
          </Upload>
          <Tooltip title={file ? "Importer le fichier sélectionné" : "Sélectionnez d\'abord un fichier Excel"}>
            <Button
              type="primary"
              disabled={!file}
              onClick={handleUpload}
              icon={<UploadOutlined />}
              className="teachers-btn-import"
            >
              Importer Excel
            </Button>
          </Tooltip>
          <div className="teachers-toolbar-divider" />
          <Tooltip title={!data.length ? "Aucune donnée à exporter" : "Exporter la liste en Excel"}>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportExcel}
              disabled={!data.length}
              className="teachers-btn-export"
            >
              Exporter Excel
            </Button>
          </Tooltip>
        </div>

        {/* Table */}
        <Card className="teachers-table-wrapper">
          <Table
            rowSelection={rowSelection}
            dataSource={data}
            columns={columns}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (total) => `${total} enseignant${total !== 1 ? "s" : ""}` }}
            onRow={(record) => ({
              onClick: () => navigate(`/home/calendar/${record.id}`),
            })}
            style={{ cursor: "pointer" }}
          />
        </Card>

        {/* ── Drawer: Créer compte ──────────────────────────────────────── */}
        <Drawer
          title="Créer un compte à partir de cet enseignant"
          width={400}
          onClose={() => { setDrawerVisible(false); setActiveExtractIndex(null); }}
          open={drawerVisible}
          destroyOnHidden
        >
          <EnseignantRegister
            initialValues={{
              id: selectedTeacher?.id,
              username: selectedTeacher?.id,
              firstName: selectedTeacher?.prenom,
              lastName: selectedTeacher?.nom,
              email: selectedTeacher?.mail,
              role: "Formateur",
            }}
            onSuccess={() => {
              msgApi.success("Utilisateur créé avec succès !");
              setDrawerVisible(false);
              setSelectedTeacher(null);
              fetchData();
              if (activeExtractIndex !== null) {
                const next = extracted.filter((_, i) => i !== activeExtractIndex);
                setExtracted(next);
                try { localStorage.setItem("rice_extracted_enseignants", JSON.stringify(next)); } catch {}
                setActiveExtractIndex(null);
              }
            }}
            onError={(msg) => msgApi.error(msg)}
          />
        </Drawer>

        <TeacherEditModal
          open={editModalOpen}
          record={editingRecord}
          confirmLoading={editLoading}
          ups={ups}
          depts={depts}
          form={editForm}
          onOk={handleEditSave}
          onCancel={() => { setEditModalOpen(false); setEditingRecord(null); }}
        />
      </div>

      <Modal
        title={`Créer enseignant extrait${creatingExtract?.nom_complet ? ` — ${creatingExtract.nom_complet}` : ""}`}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          setCreatingExtractIndex(null);
          setCreatingExtract(null);
          createForm.resetFields();
        }}
        onOk={handleCreateExtractSave}
        confirmLoading={createLoading}
        okText="Créer"
        cancelText="Annuler"
        destroyOnHidden
        width={560}
      >
        <Form form={createForm} layout="vertical" initialValues={{ type: "P", etat: "A", cup: "N", chefDepartement: "N" }}>
          <Form.Item
            name="prenom"
            label="Prénom"
            rules={[{ required: true, message: "Le prénom est requis" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="nom"
            label="Nom"
            rules={[{ required: true, message: "Le nom est requis" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="mail"
            label="Email"
            rules={[
              { required: true, message: "L'email est requis" },
              { type: "email", message: "Email invalide" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Le type est requis" }]}
          >
            <Select>
              <Option value="P">Permanent (P)</Option>
              <Option value="V">Vacataire (V)</Option>
              <Option value="C">Contractuel (C)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="etat" label="État">
            <Select>
              <Option value="A">Actif (A)</Option>
              <Option value="I">Inactif (I)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cup" label="CUP">
            <Select>
              <Option value="O">Oui</Option>
              <Option value="N">Non</Option>
            </Select>
          </Form.Item>
          <Form.Item name="chefDepartement" label="Chef de département">
            <Select>
              <Option value="O">Oui</Option>
              <Option value="N">Non</Option>
            </Select>
          </Form.Item>
          <Form.Item name="upId" label="UP">
            <Select allowClear placeholder="Sélectionner une UP">
              {ups.map((u) => (
                <Option key={u.id} value={u.id}>
                  {u.libelle}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="deptId" label="Département">
            <Select allowClear placeholder="Sélectionner un département">
              {depts.map((d) => (
                <Option key={d.id} value={d.id}>
                  {d.libelle}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}








