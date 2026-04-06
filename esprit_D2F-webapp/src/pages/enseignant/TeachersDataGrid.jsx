// src/components/TeachersDataGrid.jsx
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
  message,
} from "antd";
import {
  SearchOutlined,
  UploadOutlined,
  UserAddOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import EnseignantService from "../../services/EnseignantService";
import UpService from "../../services/upService";
import DeptService from "../../services/DeptService";
import EnseignantRegister from "./EnseignantRegister";

const { Title } = Typography;
const { Option } = Select;

export default function TeachersDataGrid() {
  const navigate = useNavigate();
  const [msgApi, msgCtx] = message.useMessage();
  const [data, setData] = useState([]);
  const [extracted, setExtracted] = useState([]);
  const [activeExtractIndex, setActiveExtractIndex] = useState(null);
  const [file, setFile] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
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

  // ── Reference data for dropdowns ──────────────────────────────────────────
  const [ups, setUps] = useState([]);
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    fetchData();
    UpService.getAllUps().then(setUps).catch(() => {});
    DeptService.getAllDepts().then(setDepts).catch(() => {});
    try {
      const raw = localStorage.getItem("rice_extracted_enseignants");
      if (raw) setExtracted(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchData = async (filters = {}) => {
    try {
      const list = await EnseignantService.getAllEnseignants(filters);
      setData(list);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur de récupération";
      msgApi.error(msg);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (record) => {
    try {
      await EnseignantService.deleteEnseignant(record.id);
      msgApi.success(`Enseignant "${record.nom} ${record.prenom}" supprimé`);
      if (selectedTeacher?.id === record.id) setSelectedTeacher(null);
      fetchData();
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
      ? `${nomUp.toLowerCase()}.${prenomClean.toLowerCase().replace(/\s+/g, ".")}@esprit.tn`
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
      const mail = String(values.mail ?? "").trim() || (nomUp && prenom ? `${nomUp.toLowerCase()}.${prenom.toLowerCase().replace(/\s+/g, ".")}@esprit.tn` : "");

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

      await EnseignantService.createEnseignant(payload);
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
      fetchData();
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
      await EnseignantService.updateEnseignant(editingRecord.id, payload);
      msgApi.success("Enseignant modifié avec succès !");
      setEditModalOpen(false);
      setEditingRecord(null);
      fetchData();
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
      const res = await EnseignantService.uploadEnseignants(file);
      msgApi.success(res.data?.message || res.message || "Import Excel réussi !");
      setFile(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      msgApi.error(msg);
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0] || "");
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
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
      title: "Nom",
      dataIndex: "nom",
      key: "nom",
      sorter: (a, b) => a.nom.localeCompare(b.nom),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("nom", "Nom"),
    },
    {
      title: "Prénom",
      dataIndex: "prenom",
      key: "prenom",
      sorter: (a, b) => a.prenom.localeCompare(b.prenom),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("prenom", "Prénom"),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("type", "Type"),
    },
    {
      title: "Email",
      dataIndex: "mail",
      key: "mail",
      sorter: (a, b) => (a.mail || "").localeCompare(b.mail || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("mail", "Email"),
    },
    {
      title: "UP",
      dataIndex: "upLibelle",
      key: "upLibelle",
      sorter: (a, b) => (a.upLibelle || "").localeCompare(b.upLibelle || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("upLibelle", "UP"),
    },
    {
      title: "Département",
      dataIndex: "deptLibelle",
      key: "deptLibelle",
      sorter: (a, b) => (a.deptLibelle || "").localeCompare(b.deptLibelle || ""),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("deptLibelle", "Département"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#1890ff" }} />}
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
                danger
                icon={<DeleteOutlined />}
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
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enseignants");
    XLSX.writeFile(wb, `enseignants_export_${Date.now()}.xlsx`);
  };

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>Liste des Enseignants</Title>

        <Button
          type="primary"
          icon={<UserAddOutlined />}
          disabled={!selectedTeacher}
          onClick={() => setDrawerVisible(true)}
          style={{ marginBottom: 16, marginRight: 8 }}
        >
          Créer Compte
        </Button>

        {extracted?.length > 0 && (
          <div style={{ marginBottom: 12, padding: 12, border: "1px dashed #d9d9d9", borderRadius: 6 }}>
            <Title level={5} style={{ margin: 0 }}>
              Enseignants extraits (IA) — {extracted.length}
            </Title>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {extracted.map((ex, idx) => (
                <div
                  key={`${String(ex?.nom_complet ?? "unnamed").slice(0, 40)}_${idx}`}
                  style={{ padding: 8, border: "1px solid #f0f0f0", borderRadius: 6, minWidth: 220 }}
                >
                  <div style={{ fontWeight: 600 }}>{ex?.nom_complet ?? "—"}</div>
                  {ex?.fichier && (
                    <div style={{ fontSize: 12, color: "#666" }}>{ex.fichier}</div>
                  )}
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        openCreateExtractModal(ex, idx);
                      }}
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

        <div
          style={{
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
          </Upload>
          <Button
            type="primary"
            disabled={!file}
            onClick={handleUpload}
            icon={<UploadOutlined />}
          >
            Importer Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportExcel}
            disabled={!data.length}
          >
            Exporter Excel
          </Button>
        </div>

        <Table
          rowSelection={rowSelection}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => navigate(`/home/calendar/${record.id}`),
          })}
          style={{ cursor: "pointer" }}
        />

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

        {/* ── Modal: Modifier enseignant ─────────────────────────────────── */}
        <Modal
          title={`Modifier — ${editingRecord?.nom ?? ""} ${editingRecord?.prenom ?? ""}`}
          open={editModalOpen}
          onCancel={() => { setEditModalOpen(false); setEditingRecord(null); }}
          onOk={handleEditSave}
          confirmLoading={editLoading}
          okText="Enregistrer"
          cancelText="Annuler"
          destroyOnHidden
          width={520}
        >
          <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="nom"
              label="Nom"
              rules={[{ required: true, message: "Le nom est requis" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="prenom"
              label="Prénom"
              rules={[{ required: true, message: "Le prénom est requis" }]}
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
