import { useEffect, useRef, useState } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Typography,
  Drawer,
  Modal,
  Form,
  Select,
  Popconfirm,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Statistic,
  Divider,
  Avatar,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import {
  getAllAccounts,
  banAccount,
  enableAccount,
  deleteAccount,
  updateAccount,
} from '@/services/auth/AccountService';
import Register from '@/pages/auth/Register';
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader, brand } from "@/components/common";
import "@/styles/pages/list-accounts.css";

const { Text } = Typography;
const { Option } = Select;

const ROLES = ['admin', 'CUP', 'Enseignant', 'Formateur', 'CHEF_DEPARTEMENT', 'RESPONSABLE_DOSSIER'];

const handleSearch = (selectedKeys, confirm) => { confirm(); };
const handleReset = (clearFilters) => { clearFilters(); };
const renderFilterIcon = (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />;

function makeFilterDropdown(dataIndex, searchInputRef) {
  return ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    <div style={{ padding: 8 }}>
      <Input
        ref={searchInputRef}
        placeholder={`Rechercher ${dataIndex}`}
        value={selectedKeys[0]}
        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => handleSearch(selectedKeys, confirm)}
        style={{ marginBottom: 8, display: 'block' }}
      />
      <Space>
        <Button type="primary" onClick={() => handleSearch(selectedKeys, confirm)} icon={<SearchOutlined />} size="small">OK</Button>
        <Button onClick={() => handleReset(clearFilters)} size="small">Reset</Button>
      </Space>
    </div>
  );
}

export default function ListAccounts() {
  const { message: msgApi } = useAppNotification();
  const [accounts, setAccounts] = useState([]);
  const searchInput = useRef(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await getAllAccounts();
      const normalized = data.map(acc => {
        let statusValue;
        if (typeof acc.status === 'boolean') {
          statusValue = acc.status ? 'BLOQUÉ' : 'ACTIF';
        } else if (typeof acc.status === 'string') {
          statusValue = acc.status;
        } else {
          statusValue = 'INCONNU';
        }
        return { ...acc, status: statusValue };
      });
      setAccounts(normalized);
    } catch (err) {
      msgApi.error(err.response?.data?.message || 'Erreur de récupération');
    }
  };

  const stats = {
    total: accounts.length,
    active: accounts.filter(a => a.status === 'ACTIF').length,
    blocked: accounts.filter(a => a.status === 'BLOQUÉ').length,
    admins: accounts.filter(a => a.role === 'admin').length,
  };

  // ─── CREATE ──────────────────────────────────────────────
  const handleCreateSuccess = () => {
    setDrawerVisible(false);
    fetchAccounts();
  };

  // ─── UPDATE ──────────────────────────────────────────────
  const handleEdit = record => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      firstName: record.firsName || record.firstName,
      lastName: record.lastName,
      email: record.email,
      phoneNumber: record.phoneNumber,
      role: record.role,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);
      await updateAccount(editingRecord.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
      }, values.role);
      msgApi.success('Compte modifié avec succès !');
      setEditModalVisible(false);
      editForm.resetFields();
      setEditingRecord(null);
      fetchAccounts();
    } catch (err) {
      msgApi.error(err.response?.data?.message || 'Erreur de modification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async userId => {
    try {
      await deleteAccount(userId);
      msgApi.success('Compte supprimé avec succès !');
      fetchAccounts();
    } catch (err) {
      msgApi.error(err.response?.data?.message || 'Erreur de suppression');
    }
  };

  const handleToggleStatus = async record => {
    const nextStatus = record.status === 'ACTIF' ? 'BLOQUÉ' : 'ACTIF';
    try {
      if (nextStatus === 'BLOQUÉ') {
        await banAccount(record.userName);
      } else {
        await enableAccount(record.userName);
      }
      msgApi.success(nextStatus === 'ACTIF' ? 'Compte débloqué !' : 'Compte bloqué !');
      fetchAccounts();
    } catch (err) {
      msgApi.error(err.response?.data?.message || 'Erreur de mise à jour');
    }
  };

  const getColumnSearchProps = dataIndex => ({
    filterDropdown: makeFilterDropdown(dataIndex, searchInput),
    filterIcon: renderFilterIcon,
    onFilter: (value, record) => record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
  });

  const columns = [
    {
      title: 'Utilisateur',
      dataIndex: 'userName',
      key: 'userName',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: record.status === 'ACTIF' ? '#1890ff' : '#ccc' }} />
          <div>
            <Text strong>{record.firsName} {record.lastName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>@{text}</Text>
          </div>
        </Space>
      ),
      ...getColumnSearchProps('userName'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <Text><MailOutlined /> {text}</Text>,
      ...getColumnSearchProps('email'),
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      filters: ROLES.map(r => ({ text: r, value: r })),
      onFilter: (value, record) => record.role === value,
      render: role => {
        const colorMap = { admin: 'red', CUP: 'green', Enseignant: 'orange', Formateur: 'default', CHEF_DEPARTEMENT: 'blue', RESPONSABLE_DOSSIER: 'cyan' };
        return <Tag color={colorMap[role] || 'default'} style={{ borderRadius: '12px', padding: '0 10px' }}>{role.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Badge status={status === 'ACTIF' ? 'success' : 'error'} text={status} style={{ fontWeight: '600' }} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Modifier">
            <Button shape="circle" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title={record.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}>
            <Button 
              shape="circle" 
              danger={record.status === 'ACTIF'} 
              icon={record.status === 'ACTIF' ? <StopOutlined /> : <CheckCircleOutlined />} 
              onClick={() => handleToggleStatus(record)} 
            />
          </Tooltip>
          <Popconfirm title="Supprimer?" onConfirm={() => handleDelete(record.id)} okButtonProps={{ danger: true }}>
            <Button shape="circle" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        icon={<TeamOutlined />}
        title="Gestion des Utilisateurs"
        subtitle="Administrer les comptes, rôles et accès de l'application"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)}>
            Nouveau Compte
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Total Comptes" value={stats.total} prefix={<TeamOutlined />} valueStyle={{ color: brand[500] }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Comptes Actifs" value={stats.active} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#27ae60" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Comptes Bloqués" value={stats.blocked} prefix={<StopOutlined />} valueStyle={{ color: "#ef4444" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Administrateurs" value={stats.admins} prefix={<SolutionOutlined />} valueStyle={{ color: "#f59e0b" }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Divider style={{ margin: "0 0 16px" }} />
        <Table
          rowKey="id"
          columns={columns}
          dataSource={accounts}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1000 }}
          style={{ background: '#fff' }}
        />
      </Card>

      <Drawer title="Créer un compte" width={520} onClose={() => setDrawerVisible(false)} open={drawerVisible} styles={{ body: { padding: '24px' } }}>
        <Register onSuccess={handleCreateSuccess} />
      </Drawer>

      <Modal title="Modifier le compte" open={editModalVisible} onOk={handleEditSubmit} onCancel={() => setEditModalVisible(false)} confirmLoading={loading} okText="Enregistrer" cancelText="Annuler" width={500}>
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="Prénom" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Nom" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item>
          <Form.Item name="phoneNumber" label="Téléphone" rules={[{ required: true }]}><Input prefix={<PhoneOutlined />} /></Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true }]}>
            <Select>
              {ROLES.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


// Simple Badge mock if not imported
function Badge({ status, text, style }) {
  const colors = { success: '#52c41a', error: '#f5222d', default: '#d9d9d9' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', ...style }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[status] || colors.default, marginRight: '8px' }} />
      {text}
    </div>
  );
}




