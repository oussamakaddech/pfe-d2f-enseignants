// src/components/ListAccounts.jsx
import { useEffect, useRef, useState } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  message,
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
} from '../../services/accountService';
import Register from '../auth/Register';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLES = ['admin', 'CUP', 'Enseignant', 'Formateur'];

export default function ListAccounts() {
  const [msgApi, msgCtx] = message.useMessage();
  const [accounts, setAccounts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
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

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0] || '');
    setSearchedColumn(dataIndex);
  };

  const handleReset = clearFilters => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = dataIndex => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button type="primary" onClick={() => handleSearch(selectedKeys, confirm, dataIndex)} icon={<SearchOutlined />} size="small">OK</Button>
          <Button onClick={() => handleReset(clearFilters)} size="small">Reset</Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
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
          <Box>
            <Text strong>{record.firsName} {record.lastName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>@{text}</Text>
          </Box>
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
        const colorMap = { admin: 'red', CUP: 'green', Enseignant: 'orange', Formateur: 'default' };
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
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {msgCtx}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic title="Total Comptes" value={stats.total} prefix={<TeamOutlined />} valueStyle={{ color: '#3f51b5' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic title="Comptes Actifs" value={stats.active} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#4caf50' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic title="Comptes Bloqués" value={stats.blocked} prefix={<StopOutlined />} valueStyle={{ color: '#f44336' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic title="Administrateurs" value={stats.admins} prefix={<SolutionOutlined />} valueStyle={{ color: '#ff9800' }} />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Title level={3} style={{ margin: 0 }}>👥 Gestion des Utilisateurs</Title>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)} style={{ borderRadius: '8px', background: '#d32f2f', borderColor: '#d32f2f' }}>
            Nouveau Compte
          </Button>
        </Box>
        <Divider />
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

// Simple Box component mock since we are using antd
function Box({ children, display, justifyContent, alignItems, mb }) {
  return (
    <div style={{ display, justifyContent, alignItems, marginBottom: mb ? `${mb * 8}px` : 0 }}>
      {children}
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