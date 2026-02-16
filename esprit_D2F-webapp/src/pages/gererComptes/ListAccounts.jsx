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
} from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import {
  getAllAccounts,
  banAccount,
  enableAccount,
} from '../../services/accountService';
import Register from '../auth/Register'; // Ajustez le chemin si besoin

const { Title } = Typography;

export default function ListAccounts() {
  const [msgApi, msgCtx] = message.useMessage();
  const [accounts, setAccounts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await getAllAccounts();
      // Normalisation du statut : false = ACTIF, true = BLOQUÉ
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
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => searchInput.current.select(), 100);
      }
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
      title: 'Nom',
      dataIndex: 'userName',
      key: 'userName',
      sorter: (a, b) => a.userName.localeCompare(b.userName),
      ...getColumnSearchProps('userName'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
      ...getColumnSearchProps('email'),
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      sorter: (a, b) => a.role.localeCompare(b.role),
      ...getColumnSearchProps('role'),
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
        <strong style={{ color: status === 'ACTIF' ? 'green' : 'red' }}>
          {status}
        </strong>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          style={{
            backgroundColor: record.status === 'ACTIF' ? '#ff4d4f' : '#52c41a',
            borderColor: record.status === 'ACTIF' ? '#ff4d4f' : '#52c41a',
          }}
          onClick={() => handleToggleStatus(record)}
        >
          {record.status === 'ACTIF' ? 'BLOQUER' : 'DÉBLOQUER'}
        </Button>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        {/* Flex container pour aligner titre et bouton */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Liste des Comptes
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
          pagination={{ pageSize: 5, showSizeChanger: true }}
        />

        <Drawer
          title="Créer un compte"
          width={480}
          onClose={() => setDrawerVisible(false)}
          visible={drawerVisible}
          bodyStyle={{ padding: 0 }}
        >
          <Register />
        </Drawer>
      </div>
    </>
  );
}
