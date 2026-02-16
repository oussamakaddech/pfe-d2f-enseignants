// src/components/UpDeptDataGrid.jsx
import { useState, useRef, useEffect } from 'react';
import {
  Tabs,
  Table,
  Button,
  Upload,
  Input,
  Typography,
  message,
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
} from '@ant-design/icons';
import UpService from '../../services/upService';
import DeptService from '../../services/DeptService';

const { Title } = Typography;
const { TabPane } = Tabs;

export default function UpDeptDataGrid() {
  const [msgApi, msgCtx] = message.useMessage();

  // UP states
  const [ups, setUps] = useState([]);
  const [fileUp, setFileUp] = useState(null);
  const [drawerUpVisible, setDrawerUpVisible] = useState(false);
  const [upMode, setUpMode] = useState('create'); // 'create' or 'edit'
  const [currentUp, setCurrentUp] = useState(null);
  const [formUp] = Form.useForm();

  // Dept states
  const [depts, setDepts] = useState([]);
  const [fileDept, setFileDept] = useState(null);
  const [drawerDeptVisible, setDrawerDeptVisible] = useState(false);
  const [deptMode, setDeptMode] = useState('create');
  const [currentDept, setCurrentDept] = useState(null);
  const [formDept] = Form.useForm();

  // Search states
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);

  useEffect(() => {
    fetchUps();
    fetchDepts();
  }, []);

  /*** Fetch data ***/
  const fetchUps = async () => {
    try {
      setSearchText('');
      const list = await UpService.getAllUps();
      setUps(list);
    } catch (err) {
      msgApi.error(err.message || 'Erreur chargement UPs');
    }
  };
  const fetchDepts = async () => {
    try {
      setSearchText('');
      const list = await DeptService.getAllDepts();
      setDepts(list);
    } catch (err) {
      msgApi.error(err.message || 'Erreur chargement Départements');
    }
  };

  /*** Import Excel ***/
  const handleUploadUp = async () => {
    if (!fileUp) return;
    try {
      const res = await UpService.importUpsExcel(fileUp);
      msgApi.success(res);
      setFileUp(null);
      fetchUps();
    } catch (err) {
      msgApi.error(err.response?.data || err.message);
    }
  };
  const handleUploadDept = async () => {
    if (!fileDept) return;
    try {
      const res = await DeptService.importDeptsExcel(fileDept);
      msgApi.success(res);
      setFileDept(null);
      fetchDepts();
    } catch (err) {
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
        await UpService.createUp(values);
        msgApi.success('UP créée');
      } else {
        await UpService.updateUp(currentUp.id, values);
        msgApi.success('UP mise à jour');
      }
      setDrawerUpVisible(false);
      fetchUps();
    } catch (err) {
      msgApi.error(err.response?.data || err.message);
    }
  };
  const handleDeleteUp = async id => {
    try {
      await UpService.deleteUp(id);
      msgApi.success('UP supprimée');
      fetchUps();
    } catch (err) {
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
        await DeptService.createDept(values);
        msgApi.success('Département créé');
      } else {
        await DeptService.updateDept(currentDept.id, values);
        msgApi.success('Département mis à jour');
      }
      setDrawerDeptVisible(false);
      fetchDepts();
    } catch (err) {
      msgApi.error(err.response?.data || err.message);
    }
  };
  const handleDeleteDept = async id => {
    try {
      await DeptService.deleteDept(id);
      msgApi.success('Département supprimé');
      fetchDepts();
    } catch (err) {
      msgApi.error(err.response?.data || err.message);
    }
  };

  /*** Search helpers ***/
  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };
  const handleReset = clearFilters => {
    clearFilters();
    setSearchText('');
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
    onFilterDropdownVisibleChange: visible => {
      if (visible) setTimeout(() => searchInput.current?.select(), 100);
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
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>Gestion des UP & Départements</Title>
        <Tabs defaultActiveKey="ups">
          {/* UP Tab */}
          <TabPane tab="UP" key="ups">
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <ReloadOutlined
                onClick={fetchUps}
                style={{ fontSize: 20, cursor: 'pointer' }}
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
            <Table
              dataSource={ups}
              columns={upColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />

            <Drawer
              title={upMode === 'create' ? 'Ajouter UP' : 'Modifier UP'}
              width={360}
              onClose={() => setDrawerUpVisible(false)}
              visible={drawerUpVisible}
              destroyOnClose
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
          </TabPane>

          {/* Département Tab */}
          <TabPane tab="Département" key="depts">
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <ReloadOutlined
                onClick={fetchDepts}
                style={{ fontSize: 20, cursor: 'pointer' }}
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
            <Table
              dataSource={depts}
              columns={deptColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />

            <Drawer
              title={
                deptMode === 'create'
                  ? 'Ajouter Département'
                  : 'Modifier Département'
              }
              width={360}
              onClose={() => setDrawerDeptVisible(false)}
              visible={drawerDeptVisible}
              destroyOnClose
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
          </TabPane>
        </Tabs>
      </div>
    </>
  );
}
