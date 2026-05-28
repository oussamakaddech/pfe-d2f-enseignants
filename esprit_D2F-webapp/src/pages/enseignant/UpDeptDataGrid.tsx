import { useState, useRef } from 'react';
import {
  Tabs,
  Table,
  Button,
  Upload,
  Input,
  Drawer,
  Form,
  Popconfirm,
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
} from '@ant-design/icons';
import { useAllUps, useCreateUp, useUpdateUp, useDeleteUp, useImportUpsExcel } from "@/hooks/formation/useUpCrud";
import { useAllDepts, useCreateDept, useUpdateDept, useDeleteDept, useImportDeptsExcel } from "@/hooks/formation/useDeptCrud";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/up-dept-data-grid.css";

interface RecordItem {
  id: string | number;
  libelle?: string;
  nom?: string;
  [key: string]: unknown;
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

  // Dept states
  const [fileDept, setFileDept] = useState<File | null>(null);
  const [drawerDeptVisible, setDrawerDeptVisible] = useState(false);
  const [deptMode, setDeptMode] = useState<'create' | 'edit'>('create');
  const [currentDept, setCurrentDept] = useState<RecordItem | null>(null);
  const [formDept] = Form.useForm();

  // Search states
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

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
      msgApi.success(res);
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
    try {
      if (upMode === 'create') {
        await createUp(values);
        msgApi.success('UP créée');
      } else {
        await updateUp({ id: currentUp!.id, data: values });
        msgApi.success('UP mise à jour');
      }
      setDrawerUpVisible(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
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
    try {
      if (deptMode === 'create') {
        await createDept(values);
        msgApi.success('Département créé');
      } else {
        await updateDept({ id: currentDept!.id, data: values });
        msgApi.success('Département mis à jour');
      }
      setDrawerDeptVisible(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      msgApi.error(error.response?.data || error.message || 'Erreur');
    }
  };

  /*** Search helpers ***/
  const handleSearch = (selectedKeys: React.Key[], confirm: () => void, dataIndex: string) => {
    confirm();
    setSearchedColumn(dataIndex);
  };
  const handleReset = (clearFilters?: () => void) => {
    clearFilters?.();
  };
  const getColumnSearchProps = (dataIndex: string, placeholder: string): TableColumnType<RecordItem> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${placeholder}`}
          value={selectedKeys[0] as string}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          size="small"
          onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ width: 90, marginRight: 8 }}
        >
          OK
        </Button>
        <Button
          size="small"
          onClick={() => handleReset(clearFilters)}
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value, record) =>
      Boolean(record[dataIndex]?.toString().toLowerCase().includes(String(value).toLowerCase())),
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => searchInput.current?.focus(), 100);
      },
    },
    render: (text: unknown) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: '#ffc069' }}>{String(text)}</span>
      ) : (
        String(text)
      ),
  });

  /*** Columns definition without ID column ***/
  const upColumns: TableColumnType<RecordItem>[] = [
    {
      title: 'Libellé',
      dataIndex: 'libelle',
      key: 'libelle',
      sorter: (a, b) => (a.libelle ?? '').localeCompare(b.libelle ?? ''),
      ...getColumnSearchProps('libelle', 'Libellé'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditUp(record)}
            size="small"
            style={{ marginRight: 8 }}
          />
          <Popconfirm
            title="Supprimer cette UP ?"
            onConfirm={() => handleDeleteUp(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </>
      ),
    },
  ];

  const deptColumns: TableColumnType<RecordItem>[] = [
    {
       title: 'Libellé',
      dataIndex: 'libelle',
      key: 'libelle',
      sorter: (a, b) => (a.libelle ?? '').localeCompare(b.libelle ?? ''),
      ...getColumnSearchProps('libelle', 'Libellé'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditDept(record)}
            size="small"
            style={{ marginRight: 8 }}
          />
          <Popconfirm
            title="Supprimer ce département ?"
            onConfirm={() => handleDeleteDept(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div className="updept-page">
      <AppPageHeader
        icon={<ApartmentOutlined />}
        title="Gestion des UP & Départements"
          subtitle="Administrer les unités pédagogiques et les départements"
        />
        <Tabs
          defaultActiveKey="ups"
          items={[
            {
              key: 'ups',
              label: 'UP',
              children: (
                <>
                  <div className="updept-toolbar">
                    <Button type="text" icon={<ReloadOutlined />}
                      onClick={() => fetchUps()}
                      style={{ fontSize: 20 }}
                    />
                    <Button icon={<PlusOutlined />} onClick={openCreateUp}>
                      Ajouter UP
                    </Button>
                    <Upload
                      accept=".xlsx,.xls"
                      beforeUpload={(f) => {
                        setFileUp(f);
                        return false;
                      }}
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
                    </Upload>
                    <Button
                      type="primary"
                      disabled={!fileUp}
                      onClick={handleUploadUp}
                    >
                      Importer Excel
                    </Button>
                  </div>
                  <div className="updept-table-card">
                    <Table<RecordItem>
                      dataSource={ups as RecordItem[]}
                      columns={upColumns}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  </div>

                  <Drawer
                    title={upMode === 'create' ? 'Ajouter UP' : 'Modifier UP'}
                    width={360}
                    onClose={() => setDrawerUpVisible(false)}
                    open={drawerUpVisible}
                    destroyOnHidden
                  >
                    <Form layout="vertical" form={formUp} onFinish={handleSubmitUp}>
                      <Form.Item
                        name="id"
                        label="ID"
                        rules={[{ required: true, message: 'ID requis' }]}
                      >
                        <Input disabled={upMode === 'edit'} />
                      </Form.Item>
                      <Form.Item
                        name="libelle"
                        label="Libellé"
                        rules={[{ required: true, message: 'Libellé requis' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">
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
              label: 'Département',
              children: (
                <>
                  <div className="updept-toolbar">
                    <Button type="text" icon={<ReloadOutlined />}
                      onClick={() => fetchDepts()}
                      style={{ fontSize: 20 }}
                    />
                    <Button icon={<PlusOutlined />} onClick={openCreateDept}>
                      Ajouter Département
                    </Button>
                    <Upload
                      accept=".xlsx,.xls"
                      beforeUpload={(f) => {
                        setFileDept(f);
                        return false;
                      }}
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
                    </Upload>
                    <Button
                      type="primary"
                      disabled={!fileDept}
                      onClick={handleUploadDept}
                    >
                      Importer Excel
                    </Button>
                  </div>
                  <div className="updept-table-card">
                    <Table<RecordItem>
                      dataSource={depts as RecordItem[]}
                      columns={deptColumns}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  </div>

                  <Drawer
                    title={
                      deptMode === 'create'
                        ? 'Ajouter Département'
                        : 'Modifier Département'
                    }
                    width={360}
                    onClose={() => setDrawerDeptVisible(false)}
                    open={drawerDeptVisible}
                    destroyOnHidden
                  >
                    <Form
                      layout="vertical"
                      form={formDept}
                      onFinish={handleSubmitDept}
                    >
                      <Form.Item
                        name="id"
                        label="ID"
                        rules={[{ required: true, message: 'ID requis' }]}
                      >
                        <Input disabled={deptMode === 'edit'} />
                      </Form.Item>
                      <Form.Item
                        name="nom"
                        label="Nom"
                        rules={[{ required: true, message: 'Nom requis' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">
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
  );
}








