import { useState, useRef, type RefObject, type Key } from "react";
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
import type { FilterDropdownProps } from "antd/es/table/interface";
import type { InputRef } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useBureaux, useCreateBureau, useUpdateBureau, useDeleteBureau } from "@/hooks/bureau/useBureaux";
import type { Bureau } from "@/models/bureau";
import "@/styles/pages/bureau-page.css";
import s from "./BureauPage.module.css";

type SearchDropdownProps = Readonly<{
  placeholder: string;
  selectedKeys: Key[];
  setSelectedKeys: (keys: Key[]) => void;
  confirm: () => void;
  clearFilters?: () => void;
  onSearch: (keys: string[], confirm: () => void) => void;
  onReset: (clearFilters: () => void) => void;
  inputRef: React.RefObject<InputRef | null>;
}>;

function ColumnSearchDropdown({ placeholder, selectedKeys, setSelectedKeys, confirm, clearFilters, onSearch, onReset, inputRef }: SearchDropdownProps) {
  return (
    <div className={s.searchDropdown}>
      <Input
        ref={inputRef}
        placeholder={`Rechercher ${placeholder}`}
        value={selectedKeys[0] as string}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => onSearch(selectedKeys as string[], confirm)}
        className={s.searchDropdownInput}
      />
      <Button
        type="primary"
        onClick={() => onSearch(selectedKeys as string[], confirm)}
        icon={<SearchOutlined />}
        size="small"
        className={s.searchBtnOk}
      >
        OK
      </Button>
      <Button onClick={() => clearFilters && onReset(clearFilters)} size="small" className={s.searchBtnReset}>
        Réinitialiser
      </Button>
    </div>
  );
}

function ColumnSearchIcon({ filtered }: Readonly<{ filtered: boolean }>) {
  return <SearchOutlined className={filtered ? s.columnSearchHighlight : undefined} />;
}

type SearchColumnConfig = {
  onSearch: (selectedKeys: string[], confirm: () => void, dataIndex: string) => void;
  onReset: (clearFilters: () => void) => void;
  searchInputRef: React.RefObject<InputRef | null>;
  searchedColumn: string;
};

function getColumnSearchProps(dataIndex: keyof Bureau, placeholder: string, cfg: SearchColumnConfig) {
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <ColumnSearchDropdown
        placeholder={placeholder}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
        confirm={confirm}
        clearFilters={clearFilters}
        onSearch={(keys, conf) => cfg.onSearch(keys, conf, dataIndex)}
        onReset={cfg.onReset}
        inputRef={cfg.searchInputRef}
      />
    ),
    filterIcon: (filtered: boolean) => <ColumnSearchIcon filtered={filtered} />,
    onFilter: (value: boolean | Key, record: Bureau) =>
      String(record[dataIndex] ?? "").toLowerCase().includes(String(value).toLowerCase()),
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => cfg.searchInputRef.current?.select(), 100);
      },
    },
    render: (text: string) =>
      cfg.searchedColumn === dataIndex ? (
        <span className={s.searchHighlight}>{text}</span>
      ) : (
        text
      ),
  };
}

export default function BureauPage() {
  const { message: msgApi } = useAppNotification();
  const { data: bureaux = [], isLoading: loading } = useBureaux();
  const createMut  = useCreateBureau();
  const updateMut  = useUpdateBureau();
  const deleteMut  = useDeleteBureau();

  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<InputRef>(null);

  // ── Modal état ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<Bureau | null>(null);
  const [form] = Form.useForm();

  const data = Array.isArray(bureaux) ? bureaux : [];
  const saveLoading = createMut.isPending || updateMut.isPending;

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
      if (modalMode === "create") {
        await createMut.mutateAsync(values);
        msgApi.success("Bureau créé avec succès !");
      } else {
        await updateMut.mutateAsync({ id: editingRecord!.id, data: values });
        msgApi.success("Bureau modifié avec succès !");
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      msgApi.error(e?.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  };

  // ── Supprimer ─────────────────────────────────────────────────────────
  const handleDelete = async (record: Bureau) => {
    try {
      await deleteMut.mutateAsync(record.id);
      msgApi.success(`Bureau "${record.nom}" supprimé`);
    } catch (err: unknown) {
      msgApi.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur lors de la suppression");
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

  const searchCfg: SearchColumnConfig = {
    onSearch: handleSearch,
    onReset: handleReset,
    searchInputRef: searchInput,
    searchedColumn,
  };

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
      ...getColumnSearchProps("nom", "Nom", searchCfg),
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
      ...getColumnSearchProps("email", "Email", searchCfg),
      render: (email: string) =>
        email ? (
          <span><MailOutlined className={s.iconMuted} />{email}</span>
        ) : (
          <span className={s.emptyValue}>—</span>
        ),
    },
    {
      title: "Téléphone",
      dataIndex: "numeroTelephone",
      key: "numeroTelephone",
      ...getColumnSearchProps("numeroTelephone", "Téléphone", searchCfg),
      render: (tel: string) =>
        tel ? (
          <span><PhoneOutlined className={s.iconMuted} />{tel}</span>
        ) : (
          <span className={s.emptyValue}>—</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Bureau) => (
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
          <div className={s.heroFlexRow}>
            <div>
              <div className={s.heroTitleRow}>
                <h2 className="bureau-hero-title">Gestion des Bureaux</h2>
                <span className="bureau-hero-badge">
                  {data.length}
                  <span className={s.heroBadgeCount}>bureau{data.length === 1 ? "" : "x"}</span>
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
            <div className={`bureau-stat-icon ${s.statIconBrand}`}>
              <BankOutlined />
            </div>
            <div>
              <div className="bureau-stat-label">Total Bureaux</div>
              <div className={`bureau-stat-value ${s.statValueBrand}`}>{data.length}</div>
            </div>
          </div>
          <div className="bureau-stat-card">
            <div className={`bureau-stat-icon ${s.statIconInfo}`}>
              <MailOutlined />
            </div>
            <div>
              <div className="bureau-stat-label">Avec Email</div>
              <div className={`bureau-stat-value ${s.statValueInfo}`}>
                {data.filter((b) => b.email).length}
              </div>
            </div>
          </div>
          <div className="bureau-stat-card">
            <div className={`bureau-stat-icon ${s.statIconSuccess}`}>
              <PhoneOutlined />
            </div>
            <div>
              <div className="bureau-stat-label">Avec Téléphone</div>
              <div className={`bureau-stat-value ${s.statValueSuccess}`}>
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
        <Form form={form} layout="vertical" className={s.formTopMargin}>
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
            <Input placeholder="email@exemple.com" prefix={<MailOutlined className={s.inputPrefixIcon} />} />
          </Form.Item>
          <Form.Item
            name="numeroTelephone"
            label="Numéro de Téléphone"
            rules={[{ required: true, message: "Le numéro de téléphone est requis" }]}
          >
            <Input placeholder="+216 XX XXX XXX" prefix={<PhoneOutlined className={s.inputPrefixIcon} />} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
