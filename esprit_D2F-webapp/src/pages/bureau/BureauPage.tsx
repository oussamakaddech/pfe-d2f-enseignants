import { useState, useRef, useEffect, type RefObject, type Key } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Popconfirm,
  Space,
  Tooltip,
  Card,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from "@ant-design/icons";
import BureauService from "@/services/bureau/BureauService";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { Bureau } from "@/models/bureau";
import "@/styles/pages/bureau-page.css";

const { Option: _Option } = Input as any;

type SearchDropdownProps = Readonly<{
  placeholder: string;
  selectedKeys: Key[];
  setSelectedKeys: (keys: Key[]) => void;
  confirm: () => void;
  clearFilters?: () => void;
  onSearch: (keys: string[], confirm: () => void) => void;
  onReset: (clearFilters: () => void) => void;
  inputRef: RefObject<any>;
}>;

function ColumnSearchDropdown({ placeholder, selectedKeys, setSelectedKeys, confirm, clearFilters, onSearch, onReset, inputRef }: SearchDropdownProps) {
  return (
    <div style={{ padding: 8 }}>
      <Input
        ref={inputRef}
        placeholder={`Rechercher ${placeholder}`}
        value={selectedKeys[0] as string}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => onSearch(selectedKeys as string[], confirm)}
        style={{ marginBottom: 8, display: "block" }}
      />
      <Button
        type="primary"
        onClick={() => onSearch(selectedKeys as string[], confirm)}
        icon={<SearchOutlined />}
        size="small"
        style={{ width: 90, marginRight: 8 }}
      >
        OK
      </Button>
      <Button onClick={() => clearFilters && onReset(clearFilters)} size="small" style={{ width: 90 }}>
        Réinitialiser
      </Button>
    </div>
  );
}

function ColumnSearchIcon({ filtered }: Readonly<{ filtered: boolean }>) {
  return <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />;
}

export default function BureauPage() {
  const { message: msgApi } = useAppNotification();
  const [data, setData] = useState<Bureau[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<any>(null);

  // ── Modal état ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<Bureau | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await BureauService.getAllBureaux();
      setData(list);
    } catch {
      msgApi.error("Erreur lors du chargement des bureaux");
    } finally {
      setLoading(false);
    }
  };

  // ── Ouvrir modal création ─────────────────────────────────────────────
  const openCreate = () => {
    setModalMode("create");
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  // ── Ouvrir modal édition ──────────────────────────────────────────────
  const openEdit = (record: Bureau) => {
    setModalMode("edit");
    setEditingRecord(record);
    form.setFieldsValue({
      nom: record.nom,
      email: record.email,
      numeroTelephone: record.numeroTelephone,
    });
    setModalOpen(true);
  };

  // ── Sauvegarder ───────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaveLoading(true);
      if (modalMode === "create") {
        await BureauService.createBureau(values);
        msgApi.success("Bureau créé avec succès !");
      } else {
        await BureauService.updateBureau(editingRecord!.id, values);
        msgApi.success("Bureau modifié avec succès !");
      }
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      msgApi.error(err?.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Supprimer ─────────────────────────────────────────────────────────
  const handleDelete = async (record: Bureau) => {
    try {
      await BureauService.deleteBureau(record.id);
      msgApi.success(`Bureau "${record.nom}" supprimé`);
      fetchData();
    } catch (err: any) {
      msgApi.error(err?.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  // ── Recherche colonne ─────────────────────────────────────────────────
  const handleSearch = (selectedKeys: string[], confirm: () => void, dataIndex: string) => {
    confirm();
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
  };

  const getColumnSearchProps = (dataIndex: keyof Bureau, placeholder: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <ColumnSearchDropdown
        placeholder={placeholder}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
        confirm={confirm}
        clearFilters={clearFilters}
        onSearch={(keys, conf) => handleSearch(keys, conf, dataIndex)}
        onReset={handleReset}
        inputRef={searchInput}
      />
    ),
    filterIcon: (filtered: boolean) => <ColumnSearchIcon filtered={filtered} />,
    onFilter: (value: any, record: Bureau) =>
      String(record[dataIndex] ?? "").toLowerCase().includes(String(value).toLowerCase()),
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    },
    render: (text: string) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069" }}>{text}</span>
      ) : (
        text
      ),
  });

  const getInitials = (nom: string) =>
    nom
      .split(" ")
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?";

  const columns = [
    {
      title: "Nom",
      dataIndex: "nom",
      key: "nom",
      sorter: (a: Bureau, b: Bureau) => a.nom.localeCompare(b.nom),
      sortDirections: ["ascend" as const, "descend" as const],
      ...getColumnSearchProps("nom", "Nom"),
      render: (nom: string) => (
        <div className="bureau-name-cell">
          <div className="bureau-avatar">{getInitials(nom)}</div>
          <span className="bureau-name-primary">{nom}</span>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: (a: Bureau, b: Bureau) => (a.email || "").localeCompare(b.email || ""),
      ...getColumnSearchProps("email", "Email"),
      render: (email: string) =>
        email ? (
          <span><MailOutlined style={{ marginRight: 6, color: "#64748b" }} />{email}</span>
        ) : (
          <span style={{ color: "#cbd5e0" }}>—</span>
        ),
    },
    {
      title: "Téléphone",
      dataIndex: "numeroTelephone",
      key: "numeroTelephone",
      ...getColumnSearchProps("numeroTelephone", "Téléphone"),
      render: (tel: string) =>
        tel ? (
          <span><PhoneOutlined style={{ marginRight: 6, color: "#64748b" }} />{tel}</span>
        ) : (
          <span style={{ color: "#cbd5e0" }}>—</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: Bureau) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined />}
              className="bureau-btn-edit"
              onClick={(e) => { e.stopPropagation(); openEdit(record); }}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer ce bureau ?"
            description={`"${record.nom}" sera définitivement supprimé.`}
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(record); }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="bureau-btn-delete"
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="bureau-page">
        {/* Hero Banner */}
        <div className="bureau-hero">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 className="bureau-hero-title">Gestion des Bureaux</h2>
                <span className="bureau-hero-badge">
                  {data.length}
                  <span style={{ fontWeight: 400, marginLeft: 4 }}>bureau{data.length === 1 ? "" : "x"}</span>
                </span>
              </div>
              <div className="bureau-hero-subtitle">Gérer les bureaux externes (nom, email, téléphone)</div>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bureau-btn-add"
              onClick={openCreate}
            >
              Nouveau Bureau
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="bureau-stats">
          <div className="bureau-stat-card">
            <div className="bureau-stat-icon" style={{ background: "#fff0ee", color: "#B51200" }}>
              <BankOutlined />
            </div>
            <div>
              <div className="bureau-stat-label">Total Bureaux</div>
              <div className="bureau-stat-value" style={{ color: "#B51200" }}>{data.length}</div>
            </div>
          </div>
          <div className="bureau-stat-card">
            <div className="bureau-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <MailOutlined />
            </div>
            <div>
              <div className="bureau-stat-label">Avec Email</div>
              <div className="bureau-stat-value" style={{ color: "#2563eb" }}>
                {data.filter((b) => b.email).length}
              </div>
            </div>
          </div>
          <div className="bureau-stat-card">
            <div className="bureau-stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <PhoneOutlined />
            </div>
            <div>
              <div className="bureau-stat-label">Avec Téléphone</div>
              <div className="bureau-stat-value" style={{ color: "#16a34a" }}>
                {data.filter((b) => b.numeroTelephone).length}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="bureau-table-wrapper">
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: (total) => `${total} bureau${total === 1 ? "" : "x"}` }}
          />
        </Card>
      </div>

      {/* Modal Créer / Modifier */}
      <Modal
        title={modalMode === "create" ? "Nouveau Bureau" : `Modifier — ${editingRecord?.nom ?? ""}`}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleSave}
        confirmLoading={saveLoading}
        okText={modalMode === "create" ? "Créer" : "Enregistrer"}
        cancelText="Annuler"
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nom"
            label="Nom"
            rules={[{ required: true, message: "Le nom est requis" }]}
          >
            <Input placeholder="Nom du bureau" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "L'email est requis" },
              { type: "email", message: "Email invalide" },
            ]}
          >
            <Input placeholder="email@exemple.com" prefix={<MailOutlined style={{ color: "#a0aec0" }} />} />
          </Form.Item>
          <Form.Item
            name="numeroTelephone"
            label="Numéro de Téléphone"
            rules={[{ required: true, message: "Le numéro de téléphone est requis" }]}
          >
            <Input placeholder="+216 XX XXX XXX" prefix={<PhoneOutlined style={{ color: "#a0aec0" }} />} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
