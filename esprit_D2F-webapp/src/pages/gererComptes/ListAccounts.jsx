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
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import {
  getAllAccounts,
  banAccount,
  enableAccount,
  deleteAccount,
  updateAccount,
} from '../../services/accountService';
import Register from '../auth/Register';

const { Title } = Typography;
const { Option } = Select;

const ROLES = ['admin', 'D2F', 'CUP', 'Enseignant', 'Formateur'];

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
      if (err.response) {
        msgApi.error(err.response?.data?.message || 'Erreur de modification');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── DELETE ──────────────────────────────────────────────
  const handleDelete = async userId => {
    try {
      await deleteAccount(userId);
      msgApi.success('Compte supprimé avec succès !');
      fetchAccounts();
    } catch (err) {
      msgApi.error(err.response?.data?.message || 'Erreur de suppression');
    }
  };

  // ─── TOGGLE STATUS ──────────────────────────────────────
  const handleToggleStatus = async record => {
    const nextStatus = record.status === 'ACTIF' ? 'BLOQUÉ' : 'ACTIF';
    try {
      if (nextStatus === 'BLOQUÉ') {
        await banAccount(record.userName);
      } else {
        await enableAccount(record.userName);
      }
      setAccounts(prev =>
        prev.map(acc =>
          acc.userName === record.userName
            ? { ...acc, status: nextStatus }
            : acc
        )
      );
      msgApi.success(
        nextStatus === 'ACTIF' ? 'Compte débloqué !' : 'Compte bloqué !'
      );
    } catch (err) {
      msgApi.error(err.response?.data?.message || 'Erreur de mise à jour');
    }
  };

  // ─── SEARCH ──────────────────────────────────────────────
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
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
          >
            OK
          </Button>
          <Button onClick={() => handleReset(clearFilters)} size="small">
            Réinitialiser
          </Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
    filterDropdownProps: {
      onOpenChange: visible => {
        if (visible) {
          setTimeout(() => searchInput.current.select(), 100);
        }
      },
    },
    render: text =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: '#ffc069', padding: 0 }}>{text}</span>
      ) : (
        text
      ),
  });

  const columns = [
    {
      title: 'Nom d\'utilisateur',
      dataIndex: 'userName',
      key: 'userName',
      sorter: (a, b) => a.userName.localeCompare(b.userName),
      ...getColumnSearchProps('userName'),
    },
    {
      title: 'Prénom',
      dataIndex: 'firsName',
      key: 'firsName',
      sorter: (a, b) => (a.firsName || '').localeCompare(b.firsName || ''),
      ...getColumnSearchProps('firsName'),
    },
    {
      title: 'Nom',
      dataIndex: 'lastName',
      key: 'lastName',
      sorter: (a, b) => (a.lastName || '').localeCompare(b.lastName || ''),
      ...getColumnSearchProps('lastName'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
      ...getColumnSearchProps('email'),
    },
    {
      title: 'Téléphone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      sorter: (a, b) => a.role.localeCompare(b.role),
      filters: ROLES.map(r => ({ text: r, value: r })),
      onFilter: (value, record) => record.role === value,
      render: role => {
        const colorMap = {
          admin: 'red',
          D2F: 'blue',
          CUP: 'green',
          Enseignant: 'orange',
          Formateur: 'default',
        };
        return <Tag color={colorMap[role] || 'default'}>{role}</Tag>;
      },
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: 'ACTIF', value: 'ACTIF' },
        { text: 'BLOQUÉ', value: 'BLOQUÉ' },
      ],
      onFilter: (value, record) => record.status === value,
      render: status => (
        <Tag color={status === 'ACTIF' ? 'green' : 'red'} style={{ fontWeight: 'bold' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Button
            size="small"
            style={{
              backgroundColor: record.status === 'ACTIF' ? '#ff4d4f' : '#52c41a',
              borderColor: record.status === 'ACTIF' ? '#ff4d4f' : '#52c41a',
              color: '#fff',
            }}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}
          </Button>
          <Popconfirm
            title="Supprimer ce compte"
            description="Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible."
            onConfirm={() => handleDelete(record.id)}
            okText="Oui, supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Gestion des Comptes
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerVisible(true)}
          >
            Créer un compte
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={accounts}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `${total} comptes` }}
          scroll={{ x: 1000 }}
        />

        {/* Drawer pour Créer un compte */}
        <Drawer
          title="Créer un compte"
          width={480}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
        >
          <Register onSuccess={handleCreateSuccess} />
        </Drawer>

        {/* Modal pour Modifier un compte */}
        <Modal
          title="Modifier le compte"
          open={editModalVisible}
          onOk={handleEditSubmit}
          onCancel={() => {
            setEditModalVisible(false);
            editForm.resetFields();
            setEditingRecord(null);
          }}
          confirmLoading={loading}
          okText="Enregistrer"
          cancelText="Annuler"
          width={500}
        >
          <Form
            form={editForm}
            layout="vertical"
          >
            <Form.Item
              name="firstName"
              label="Prénom"
              rules={[{ required: true, message: 'Entrez le prénom' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Prénom" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Nom"
              rules={[{ required: true, message: 'Entrez le nom' }]}
            >
              <Input placeholder="Nom" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Entrez l\'email' },
                { type: 'email', message: 'Email invalide' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="exemple@mail.com" />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Téléphone"
              rules={[{ required: true, message: 'Entrez le numéro de téléphone' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="06XXXXXXXX" />
            </Form.Item>

            <Form.Item
              name="role"
              label="Rôle"
              rules={[{ required: true, message: 'Sélectionnez un rôle' }]}
            >
              <Select>
                {ROLES.map(r => (
                  <Option key={r} value={r}>{r}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}