import { useState, useRef, useMemo } from 'react';
import {
  Tabs,
  Table,
  Button,
  Upload,
  Input,
  Drawer,
  Form,
  Popconfirm,
  Tooltip,
  Space,
} from 'antd';
import type { TableColumnType, InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import {
  SearchOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApartmentOutlined,
  ReadOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useAllUps, useCreateUp, useUpdateUp, useDeleteUp, useImportUpsExcel } from "@/hooks/formation/useUpCrud";
import { useAllDepts, useCreateDept, useUpdateDept, useDeleteDept, useImportDeptsExcel } from "@/hooks/formation/useDeptCrud";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { StatCard } from "@/components/common";
import "@/styles/pages/up-dept-data-grid.css";

interface RecordItem {
  id: string | number;
  libelle?: string;
  nom?: string;
  [key: string]: unknown;
}

interface ColumnFilterDropdownProps {
  readonly dataIndex: string;
  readonly placeholder: string;
  readonly selectedKeys: React.Key[];
  readonly searchInputRef: React.RefObject<InputRef | null>;
  readonly onSetSelectedKeys: (keys: React.Key[]) => void;
  readonly onSearch: (keys: React.Key[]) => void;
  readonly onReset: () => void;
}

function ColumnFilterDropdown({
  dataIndex,
  placeholder,
  selectedKeys,
  searchInputRef,
  onSetSelectedKeys,
  onSearch,
  onReset,
}: ColumnFilterDropdownProps) {
  return (
    <div style={{ padding: 8 }}>
      <Input
        ref={searchInputRef}
        placeholder={`Rechercher ${placeholder}`}
        value={selectedKeys[0] as string}
        onChange={(e) => onSetSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => onSearch(selectedKeys)}
        style={{ marginBottom: 8, display: 'block' }}
      />
      <Space>
        <Button type="primary" icon={<SearchOutlined />} size="small" onClick={() => onSearch(selectedKeys)}>
          OK
        </Button>
        <Button size="small" onClick={() => onReset()}>
          Réinitialiser
        </Button>
      </Space>
    </div>
  );
}

function buildColumnSearchProps(
  dataIndex: string,
  placeholder: string,
  searchInputRef: React.RefObject<InputRef | null>,
  onSearch: (keys: React.Key[], confirm: () => void, dataIndex: string) => void,
  searchedColumn: string,
): TableColumnType<RecordItem> {
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <ColumnFilterDropdown
        dataIndex={dataIndex}
        placeholder={placeholder}
        selectedKeys={selectedKeys}
        searchInputRef={searchInputRef}
        onSetSelectedKeys={setSelectedKeys}
        onSearch={(keys) => onSearch(keys, confirm, dataIndex)}
        onReset={() => clearFilters?.()}
      />
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#2563eb' : undefined }} />,
    onFilter: (value, record) =>
      Boolean(record[dataIndex]?.toString().toLowerCase().includes(String(value).toLowerCase())),
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => searchInputRef.current?.focus(), 100);
      },
    },
    render: (text: unknown) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: '#bfdbfe', padding: '2px 6px', borderRadius: 4 }}>{String(text)}</span>
      ) : String(text),
  };
}

export default function UpDeptDataGrid() {
  const { message: msgApi } = useAppNotification();

  const { data: ups = [], refetch: fetchUps } = useAllUps();
  const { data: depts = [], refetch: fetchDepts } = useAllDepts();
  const { mutateAsync: importUpsExcel } = useImportUpsExcel();
  const { mutateAsync: createUp } = useCreateUp();
  const { mutateAsync: updateUp } = useUpdateUp();
  const { mutateAsync: deleteUp } = useDeleteUp();
  const { mutateAsync: importDeptsExcel } = useImportDeptsExcel();
  const { mutateAsync: createDept } = useCreateDept();
  const { mutateAsync: updateDept } = useUpdateDept();
  const { mutateAsync: deleteDept } = useDeleteDept();

  // UP states
  const [fileUp, setFileUp] = useState<File | null>(null);
  const [drawerUpVisible, setDrawerUpVisible] = useState(false);
  const [upMode, setUpMode] = useState<'create' | 'edit'>('create');
  const [currentUp, setCurrentUp] = useState<RecordItem | null>(null);
  const [formUp] = Form.useForm();
  const [upLoading, setUpLoading] = useState(false);

  // Dept states
  const [fileDept, setFileDept] = useState<File | null>(null);
  const [drawerDeptVisible, setDrawerDeptVisible] = useState(false);
  const [deptMode, setDeptMode] = useState<'create' | 'edit'>('create');
  const [currentDept, setCurrentDept] = useState<RecordItem | null>(null);
  const [formDept] = Form.useForm();
  const [deptLoading, setDeptLoading] = useState(false);

  // Search states
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

  const stats = useMemo(() => ({
    totalUps: ups.length,
    totalDepts: depts.length,
    total: ups.length + depts.length,
  }), [ups, depts]);

  /*** Import Excel ***/
  const handleUploadUp = async () => {
    if (!fileUp) return;
    try {
      const res = await importUpsExcel(fileUp);
      msgApi.success(res);
      setFileUp(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    }
  };
  const handleUploadDept = async () => {
    if (!fileDept) return;
    try {
      const res = await importDeptsExcel(fileDept);
      msgApi.success(`${res.count} département(s) importé(s)`);
      setFileDept(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    }
  };

  /*** CRUD UP ***/
  const openCreateUp = () => {
    setUpMode('create');
    setCurrentUp(null);
    formUp.resetFields();
    setDrawerUpVisible(true);
  };
  const openEditUp = (record: RecordItem) => {
    setUpMode('edit');
    setCurrentUp(record);
    formUp.setFieldsValue({ id: record.id, libelle: record.libelle });
    setDrawerUpVisible(true);
  };
  const handleSubmitUp = async (values: Record<string, unknown>) => {
    setUpLoading(true);
    try {
      if (upMode === 'create') {
        await createUp(values);
        msgApi.success('UP créée avec succès');
      } else {
        await updateUp({ id: currentUp!.id, data: values });
        msgApi.success('UP mise à jour');
      }
      setDrawerUpVisible(false);
      formUp.resetFields();
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    } finally {
      setUpLoading(false);
    }
  };
  const handleDeleteUp = async (id: string | number) => {
    try {
      await deleteUp(id);
      msgApi.success('UP supprimée');
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    }
  };

  const handleDeleteDept = async (id: string | number) => {
    try {
      await deleteDept(id);
      msgApi.success('Département supprimé');
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    }
  };

  /*** CRUD Dept ***/
  const openCreateDept = () => {
    setDeptMode('create');
    setCurrentDept(null);
    formDept.resetFields();
    setDrawerDeptVisible(true);
  };
  const openEditDept = (record: RecordItem) => {
    setDeptMode('edit');
    setCurrentDept(record);
    formDept.setFieldsValue({ id: record.id, nom: record.nom });
    setDrawerDeptVisible(true);
  };
  const handleSubmitDept = async (values: Record<string, unknown>) => {
    setDeptLoading(true);
    try {
      if (deptMode === 'create') {
        await createDept(values);
        msgApi.success('Département créé avec succès');
      } else {
        await updateDept({ id: currentDept!.id, data: values });
        msgApi.success('Département mis à jour');
      }
      setDrawerDeptVisible(false);
      formDept.resetFields();
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    } finally {
      setDeptLoading(false);
    }
  };

  /*** Search helpers ***/
  const handleSearch = (selectedKeys: React.Key[], confirm: () => void, dataIndex: string) => {
    confirm();
    setSearchedColumn(dataIndex);
  };
  const getColumnSearchProps = (dataIndex: string, placeholder: string): TableColumnType<RecordItem> =>
    buildColumnSearchProps(dataIndex, placeholder, searchInput, handleSearch, searchedColumn);

  /*** Columns definition ***/
  const upColumns: TableColumnType<RecordItem>[] = [
    {
      title: 'Libellé',
      dataIndex: 'libelle',
      key: 'libelle',
      sorter: (a, b) => (a.libelle ?? '').localeCompare(b.libelle ?? ''),
      ...getColumnSearchProps('libelle', 'libellé'),
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: '#1f2937' }}>{text}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Modifier">
            <Button
              icon={<EditOutlined />}
              onClick={() => openEditUp(record)}
              className="updept-action-btn updept-action-btn--edit"
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cette UP ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDeleteUp(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                icon={<DeleteOutlined />}
                className="updept-action-btn updept-action-btn--delete"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deptColumns: TableColumnType<RecordItem>[] = [
    {
      title: 'Nom',
      dataIndex: 'libelle',
      key: 'libelle',
      sorter: (a, b) => (a.libelle ?? '').localeCompare(b.libelle ?? ''),
      ...getColumnSearchProps('libelle', 'nom'),
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: '#1f2937' }}>{text}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Modifier">
            <Button
              icon={<EditOutlined />}
              onClick={() => openEditDept(record)}
              className="updept-action-btn updept-action-btn--edit"
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer ce département ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDeleteDept(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                icon={<DeleteOutlined />}
                className="updept-action-btn updept-action-btn--delete"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="updept-page">
      {/* ── Hero header ── */}
      <div className="updept-hero">
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 className="updept-hero-title">Structures</h2>
              <span className="updept-hero-badge">
                {stats.total}
                <span className="updept-hero-badge-total">unité{stats.total === 1 ? "" : "s"}</span>
              </span>
            </div>
            <div className="updept-hero-subtitle">Administrer les unités pédagogiques et les départements</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Tooltip title="Rafraîchir">
              <Button icon={<ReloadOutlined />} onClick={() => { fetchUps(); fetchDepts(); }} style={{ borderRadius: 10, height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="updept-stats">
        <StatCard
          icon={<ApartmentOutlined />}
          label="Unités pédagogiques"
          value={stats.totalUps}
          iconColor="#2563eb"
          accentColor="#2563eb"
        />
        <StatCard
          icon={<BankOutlined />}
          label="Départements"
          value={stats.totalDepts}
          iconColor="#7c3aed"
          accentColor="#7c3aed"
        />
        <StatCard
          icon={<ReadOutlined />}
          label="Total structures"
          value={stats.total}
          iconColor="#059669"
          accentColor="#059669"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="updept-tabs">
        <Tabs
          defaultActiveKey="ups"
          items={[
            {
              key: 'ups',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ApartmentOutlined />
                  Unités Pédagogiques ({ups.length})
                </span>
              ),
              children: (
                <>
                  <div className="updept-toolbar">
                    <Tooltip title="Rafraîchir">
                      <Button icon={<ReloadOutlined />} onClick={() => fetchUps()} />
                    </Tooltip>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateUp} style={{ background: 'linear-gradient(135deg, #b51200, #9a0f00)', border: 'none', boxShadow: '0 4px 12px rgba(181, 18, 0, 0.3)' }}>
                      Ajouter UP
                    </Button>
                    <Upload
                      accept=".xlsx,.xls"
                      beforeUpload={(f) => { setFileUp(f); return false; }}
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
                    </Upload>
                    <Button type="primary" disabled={!fileUp} onClick={handleUploadUp} style={{ background: fileUp ? 'linear-gradient(135deg, #059669, #047857)' : undefined, border: fileUp ? 'none' : undefined }}>
                      Importer Excel
                    </Button>
                  </div>
                  <div className="updept-table-card">
                    <Table<RecordItem>
                      dataSource={ups as RecordItem[]}
                      columns={upColumns}
                      rowKey="id"
                      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} UP` }}
                      locale={{ emptyText: <div className="updept-empty"><div className="updept-empty-icon"><ApartmentOutlined /></div><div className="updept-empty-title">Aucune UP</div><div className="updept-empty-desc">Commencez par ajouter une unité pédagogique ou importer depuis un fichier Excel.</div></div> }}
                    />
                  </div>

                  <Drawer
                    title={upMode === 'create' ? 'Ajouter une UP' : 'Modifier l\'UP'}
                    width={400}
                    onClose={() => { setDrawerUpVisible(false); formUp.resetFields(); }}
                    open={drawerUpVisible}
                    destroyOnHidden
                    className="updept-drawer"
                  >
                    <Form layout="vertical" form={formUp} onFinish={handleSubmitUp} style={{ marginTop: 8 }}>
                      <Form.Item name="id" label="Identifiant" rules={[{ required: true, message: 'Identifiant requis' }]}>
                        <Input placeholder="Ex: UP001" disabled={upMode === 'edit'} style={{ borderRadius: 10 }} />
                      </Form.Item>
                      <Form.Item name="libelle" label="Libellé" rules={[{ required: true, message: 'Libellé requis' }]}>
                        <Input placeholder="Nom de l'unité pédagogique" style={{ borderRadius: 10 }} />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                        <Button type="primary" htmlType="submit" loading={upLoading} block size="large" style={{ borderRadius: 10, fontWeight: 600 }}>
                          {upMode === 'create' ? 'Créer' : 'Mettre à jour'}
                        </Button>
                      </Form.Item>
                    </Form>
                  </Drawer>
                </>
              ),
            },
            {
              key: 'depts',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BankOutlined />
                  Départements ({depts.length})
                </span>
              ),
              children: (
                <>
                  <div className="updept-toolbar">
                    <Tooltip title="Rafraîchir">
                      <Button icon={<ReloadOutlined />} onClick={() => fetchDepts()} />
                    </Tooltip>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDept} style={{ background: 'linear-gradient(135deg, #b51200, #9a0f00)', border: 'none', boxShadow: '0 4px 12px rgba(181, 18, 0, 0.3)' }}>
                      Ajouter Département
                    </Button>
                    <Upload
                      accept=".xlsx,.xls"
                      beforeUpload={(f) => { setFileDept(f); return false; }}
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
                    </Upload>
                    <Button type="primary" disabled={!fileDept} onClick={handleUploadDept} style={{ background: fileDept ? 'linear-gradient(135deg, #059669, #047857)' : undefined, border: fileDept ? 'none' : undefined }}>
                      Importer Excel
                    </Button>
                  </div>
                  <div className="updept-table-card">
                    <Table<RecordItem>
                      dataSource={depts as RecordItem[]}
                      columns={deptColumns}
                      rowKey="id"
                      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} département${total === 1 ? '' : 's'}` }}
                      locale={{ emptyText: <div className="updept-empty"><div className="updept-empty-icon"><BankOutlined /></div><div className="updept-empty-title">Aucun département</div><div className="updept-empty-desc">Commencez par ajouter un département ou importer depuis un fichier Excel.</div></div> }}
                    />
                  </div>

                  <Drawer
                    title={deptMode === 'create' ? 'Ajouter un département' : 'Modifier le département'}
                    width={400}
                    onClose={() => { setDrawerDeptVisible(false); formDept.resetFields(); }}
                    open={drawerDeptVisible}
                    destroyOnHidden
                    className="updept-drawer"
                  >
                    <Form layout="vertical" form={formDept} onFinish={handleSubmitDept} style={{ marginTop: 8 }}>
                      <Form.Item name="id" label="Identifiant" rules={[{ required: true, message: 'Identifiant requis' }]}>
                        <Input placeholder="Ex: DEPT001" disabled={deptMode === 'edit'} style={{ borderRadius: 10 }} />
                      </Form.Item>
                      <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
                        <Input placeholder="Nom du département" style={{ borderRadius: 10 }} />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                        <Button type="primary" htmlType="submit" loading={deptLoading} block size="large" style={{ borderRadius: 10, fontWeight: 600 }}>
                          {deptMode === 'create' ? 'Créer' : 'Mettre à jour'}
                        </Button>
                      </Form.Item>
                    </Form>
                  </Drawer>
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
