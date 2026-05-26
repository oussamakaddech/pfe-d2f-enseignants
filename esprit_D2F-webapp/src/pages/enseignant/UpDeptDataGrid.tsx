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
  const [fileUp, setFileUp] = useState(null);
  const [drawerUpVisible, setDrawerUpVisible] = useState(false);
  const [upMode, setUpMode] = useState('create');
  const [currentUp, setCurrentUp] = useState(null);
  const [formUp] = Form.useForm();

  // Dept states
  const [fileDept, setFileDept] = useState(null);
  const [drawerDeptVisible, setDrawerDeptVisible] = useState(false);
  const [deptMode, setDeptMode] = useState('create');
  const [currentDept, setCurrentDept] = useState(null);
  const [formDept] = Form.useForm();

  // Search states
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);

  /*** Import Excel ***/
  const handleUploadUp = async () => {
    if (!fileUp) return;
    try {
      const res = await importUpsExcel(fileUp);
      msgApi.success(res);
      setFileUp(null);
    } catch (err: unknown) {
      msgApi.error(err.response?.data || err.message);
    }
  };
  const handleUploadDept = async () => {
    if (!fileDept) return;
    try {
      const res = await importDeptsExcel(fileDept);
      msgApi.success(res);
      setFileDept(null);
    } catch (err: unknown) {
      msgApi.error(err.response?.data || err.message);
    }
  };

  /*** CRUD UP ***/
  const openCreateUp = () => {
    setUpMode('create');
    setCurrentUp(null);
    formUp.resetFields();
    setDrawerUpVisible(true);
  };
  const openEditUp = record => {
    setUpMode('edit');
    setCurrentUp(record);
    formUp.setFieldsValue({ id: record.id, libelle: record.libelle });
    setDrawerUpVisible(true);
  };
  const handleSubmitUp = async values => {
    try {
      if (upMode === 'create') {
        await createUp(values);
        msgApi.success('UP créée');
      } else {
        await updateUp({ id: currentUp.id, data: values });
        msgApi.success('UP mise à jour');
      }
      setDrawerUpVisible(false);
    } catch (err: unknown) {
      msgApi.error(err.response?.data || err.message);
    }
  };
  const handleDeleteUp = async id => {
    try {
      await deleteUp(id);
      msgApi.success('UP supprimée');
    } catch (err: unknown) {
      msgApi.error(err.response?.data || err.message);
    }
  };

  /*** CRUD Dept ***/
  const openCreateDept = () => {
    setDeptMode('create');
    setCurrentDept(null);
    formDept.resetFields();
    setDrawerDeptVisible(true);
  };
  const openEditDept = record => {
    setDeptMode('edit');
    setCurrentDept(record);
    formDept.setFieldsValue({ id: record.id, nom: record.nom });
    setDrawerDeptVisible(true);
  };
  const handleSubmitDept = async values => {
    try {
      if (deptMode === 'create') {
        await createDept(values);
        msgApi.success('Département créé');
      } else {
        await updateDept({ id: currentDept.id, data: values });
        msgApi.success('Département mis à jour');
      }
      setDrawerDeptVisible(false);
    } catch (err: unknown) {
      msgApi.error(err.response?.data || err.message);
    }
  };

  /*** Search helpers ***/
  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchedColumn(dataIndex);
  };
  const handleReset = clearFilters => {
    clearFilters();
  };
  const getColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${placeholder}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
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
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
    filterDropdownProps: {
      onOpenChange: visible => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    },
    render: text =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: '#ffc069' }}>{text}</span>
      ) : (
        text
      ),
  });

  /*** Columns definition without ID column ***/
  const upColumns = [
    {
      title: 'Libellé',
      dataIndex: 'libelle',
      key: 'libelle',
      sorter: (a, b) => a.libelle.localeCompare(b.libelle),
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

  const deptColumns = [
    {
       title: 'Libellé',
      dataIndex: 'libelle',
      key: 'libelle',
      sorter: (a, b) => a.libelle.localeCompare(b.libelle),
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
                      onClick={fetchUps}
                      style={{ fontSize: 20 }}
                    />
                    <Button icon={<PlusOutlined />} onClick={openCreateUp}>
                      Ajouter UP
                    </Button>
                    <Upload
                      accept=".xlsx,.xls"
                      beforeUpload={f => {
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
                    <Table
                      dataSource={ups}
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
                      onClick={fetchDepts}
                      style={{ fontSize: 20 }}
                    />
                    <Button icon={<PlusOutlined />} onClick={openCreateDept}>
                      Ajouter Département
                    </Button>
                    <Upload
                      accept=".xlsx,.xls"
                      beforeUpload={f => {
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
                    <Table
                      dataSource={depts}
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








