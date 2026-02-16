// src/components/TeachersDataGrid.jsx
import { useState, useRef, useEffect } from "react";
import {
  Table,
  Button,
  Upload,
  Typography,
  Input,
  Drawer,
  message,
} from "antd";
import {
  SearchOutlined,
  UploadOutlined,
  UserAddOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import EnseignantService from "../../services/EnseignantService";
import EnseignantRegister from "./EnseignantRegister";

const { Title } = Typography;

export default function TeachersDataGrid() {
  const navigate = useNavigate();
  const [msgApi, msgCtx] = message.useMessage();
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (filters = {}) => {
    try {
      const list = await EnseignantService.getAllEnseignants(filters);
      setData(list);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur de récupération";
      msgApi.error(msg);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const res = await EnseignantService.uploadEnseignants(file);
      msgApi.success(res.data.message || "Import Excel réussi !");
      setFile(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      msgApi.error(msg);
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0] || "");
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${placeholder}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Button
          type="primary"
          onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          OK
        </Button>
        <Button
          onClick={() => handleReset(clearFilters)}
          size="small"
          style={{ width: 90 }}
        >
          Réinitialiser
        </Button>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ?.toString()
        .toLowerCase()
        .includes(value.toLowerCase()),
    onFilterDropdownVisibleChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: 0 }}>{text}</span>
      ) : (
        text
      ),
  });

  const columns = [
    {
      title: "Nom",
      dataIndex: "nom",
      key: "nom",
      sorter: (a, b) => a.nom.localeCompare(b.nom),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("nom", "Nom"),
    },
    {
      title: "Prénom",
      dataIndex: "prenom",
      key: "prenom",
      sorter: (a, b) => a.prenom.localeCompare(b.prenom),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("prenom", "Prénom"),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      sorter: (a, b) => a.type.localeCompare(b.type),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("type", "Type"),
    },
    {
      title: "Email",
      dataIndex: "mail",
      key: "mail",
      sorter: (a, b) => a.mail.localeCompare(b.mail),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("mail", "Email"),
    },
    {
      title: "UP",
      dataIndex: "upLibelle",
      key: "upLibelle",
      sorter: (a, b) => a.upLibelle.localeCompare(b.upLibelle),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("upLibelle", "UP"),
    },
    {
      title: "Département",
      dataIndex: "deptLibelle",
      key: "deptLibelle",
      sorter: (a, b) => a.deptLibelle.localeCompare(b.deptLibelle),
      sortDirections: ["ascend", "descend"],
      ...getColumnSearchProps("deptLibelle", "Département"),
    },
  ];

  const rowSelection = {
    type: "radio",
    selectedRowKeys: selectedTeacher ? [selectedTeacher.id] : [],
    onChange: (_, rows) => setSelectedTeacher(rows[0]),
  };

  const exportExcel = () => {
    // Exporte toutes les propriétés de chaque objet enseignant
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enseignants");
    XLSX.writeFile(wb, `enseignants_export_${Date.now()}.xlsx`);
  };

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>Liste des Enseignants</Title>

        <Button
          type="primary"
          icon={<UserAddOutlined />}
          disabled={!selectedTeacher}
          onClick={() => setDrawerVisible(true)}
          style={{ marginBottom: 16, marginRight: 8 }}
        >
          Créer Compte
        </Button>

        <div
          style={{
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
          </Upload>
          <Button
            type="primary"
            disabled={!file}
            onClick={handleUpload}
            icon={<UploadOutlined />}
          >
            Importer Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportExcel}
            disabled={!data.length}
          >
            Exporter Excel
          </Button>
        </div>

        <Table
          rowSelection={rowSelection}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => navigate(`/home/calendar/${record.id}`),
          })}
          style={{ cursor: "pointer" }}
        />

        <Drawer
          title="Créer un compte à partir de cet enseignant"
          width={400}
          onClose={() => setDrawerVisible(false)}
          visible={drawerVisible}
          destroyOnClose
        >
          <EnseignantRegister
            initialValues={{
              id: selectedTeacher?.id,
              username: selectedTeacher?.id,
              firstName: selectedTeacher?.prenom,
              lastName: selectedTeacher?.nom,
              email: selectedTeacher?.mail,
              role: "Formateur",
            }}
            onSuccess={() => {
              msgApi.success("Utilisateur créé avec succès !");
              setDrawerVisible(false);
              setSelectedTeacher(null);
              fetchData();
            }}
            onError={(msg) => msgApi.error(msg)}
          />
        </Drawer>
      </div>
    </>
  );
}
