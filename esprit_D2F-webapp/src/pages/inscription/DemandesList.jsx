// src/components/Inscription/DemandesList.jsx
import { useEffect, useState, useRef } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  message,
  Typography,
  Spin,
  Empty,
} from "antd";
import { SearchOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import InscriptionService from "../../services/InscriptionService";

const { Title } = Typography;

export default function DemandesList() {
  const { id: formationId } = useParams();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  const [msgApi, msgCtx] = message.useMessage();

  useEffect(() => {
    (async () => {
      try {
        const data = await InscriptionService.getInscriptionsByFormation(
          formationId
        );
        setDemandes(data);
      } catch {
        msgApi.error("Impossible de charger les inscriptions");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationId]);

  const handleTraitement = async (id, approuver) => {
    try {
      await InscriptionService.traiterDemande(id, approuver);
      msgApi.success(approuver ? "Approuvé" : "Rejeté");
      setLoading(true);
      const data = await InscriptionService.getInscriptionsByFormation(
        formationId
      );
      setDemandes(data);
    } catch {
      msgApi.error("Erreur lors du traitement");
    } finally {
      setLoading(false);
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

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
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
        setTimeout(() => searchInput.current.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: 0 }}>{text}</span>
      ) : (
        text
      ),
  });

  const exportToExcel = () => {
    const approved = demandes.filter(r => r.etat === "APPROVED");
    const exportData = approved.map((r) => ({
      Email: r.enseignant.mail,
      Prénom: r.enseignant.prenom,
      Nom: r.enseignant.nom,
      Département: r.enseignant.deptLibelle,
      UP: r.enseignant.upLibelle,
      État: r.etat,
      Date: new Date(r.dateDemande).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscriptions");
    XLSX.writeFile(wb, `inscriptions_${formationId}.xlsx`);
  };

  if (loading) return <Spin style={{ display: "block", margin: "2rem auto" }} />;
  if (!demandes.length) return <Empty description="Aucune inscription" />;

  const columns = [
    {
      title: "Email",
      dataIndex: ["enseignant", "mail"],
      key: "mail",
      sorter: (a, b) => a.enseignant.mail.localeCompare(b.enseignant.mail),
      ...getColumnSearchProps("mail"),
    },
    {
      title: "Prénom",
      dataIndex: ["enseignant", "prenom"],
      key: "prenom",
      sorter: (a, b) => a.enseignant.prenom.localeCompare(b.enseignant.prenom),
      ...getColumnSearchProps("prenom"),
    },
    {
      title: "Nom",
      dataIndex: ["enseignant", "nom"],
      key: "nom",
      sorter: (a, b) => a.enseignant.nom.localeCompare(b.enseignant.nom),
      ...getColumnSearchProps("nom"),
    },
    {
      title: "Département",
      dataIndex: ["enseignant", "deptLibelle"],
      key: "deptLibelle",
      sorter: (a, b) =>
        (a.enseignant.deptLibelle || "").localeCompare(b.enseignant.deptLibelle || ""),
      ...getColumnSearchProps("deptLibelle"),
    },
    {
      title: "UP",
      dataIndex: ["enseignant", "upLibelle"],
      key: "upLibelle",
      sorter: (a, b) =>
        (a.enseignant.upLibelle || "").localeCompare(b.enseignant.upLibelle || ""),
      ...getColumnSearchProps("upLibelle"),
    },
    {
      title: "État",
      dataIndex: "etat",
      key: "etat",
      filters: [
        { text: "PENDING", value: "PENDING" },
        { text: "APPROVED", value: "APPROVED" },
        { text: "REJECTED", value: "REJECTED" },
      ],
      onFilter: (value, record) => record.etat === value,
      render: (etat) => (
        <strong
          style={{
            color:
              etat === "APPROVED"
                ? "green"
                : etat === "REJECTED"
                ? "red"
                : undefined,
          }}
        >
          {etat}
        </strong>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button type="link" onClick={() => handleTraitement(r.id, true)}>
            Approuver
          </Button>
          <Button type="link" danger onClick={() => handleTraitement(r.id, false)}>
            Rejeter
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            Inscriptions pour la formation #{formationId}
          </Title>
          <Button
           type="primary"
           icon={<FileExcelOutlined />}
           onClick={exportToExcel}
         >
           Exporter approuvées
         </Button>
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={demandes}
          pagination={{ pageSize: 5, showSizeChanger: true }}
        />
      </div>
    </>
  );
}
