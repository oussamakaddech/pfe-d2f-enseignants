// src/components/PresenceList.jsx
import  { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Table,
  Button,
  Typography,
  Row,
  Col,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import FormationWorkflowService from "../../services/FormationWorkflowService";

const { Title } = Typography;

const PresenceList = ({ seanceId }) => {
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    FormationWorkflowService.getPresencesBySeance(seanceId)
      .then((data) => setPresences(data))
      .catch((error) =>
        console.error("Erreur lors de la récupération des présences :", error)
      )
      .finally(() => setLoading(false));
  }, [seanceId]);

  const togglePresence = (idParticipation, currentPresence, enseignant) => {
    const newPresence = !currentPresence;
    FormationWorkflowService.updatePresence(
      idParticipation,
      newPresence,
      "Mis à jour via UI",
      enseignant
    )
      .then(() => {
        setPresences((prev) =>
          prev.map((p) =>
            p.idParticipation === idParticipation
              ? { ...p, presence: newPresence }
              : p
          )
        );
      })
      .catch((error) =>
        console.error("Erreur lors de la mise à jour de la présence :", error)
      );
  };

  const exportExcel = () => {
    // Prépare les données sans les IDs
    const data = presences.map((p) => ({
      Nom: p.enseignant?.nom || "",
      Prénom: p.enseignant?.prenom || "",
      Email: p.enseignant?.mail || "",
      Type: p.enseignant?.type || "",
      Statut: p.presence ? "Présent" : "Absent",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Présences");
    XLSX.writeFile(wb, `presences_seance_${seanceId}.xlsx`);
  };

  const columns = [
    {
      title: "Nom",
      dataIndex: ["enseignant", "nom"],
      key: "nom",
    },
    {
      title: "Prénom",
      dataIndex: ["enseignant", "prenom"],
      key: "prenom",
    },
    {
      title: "Email",
      dataIndex: ["enseignant", "mail"],
      key: "mail",
    },

    {
      title: "Statut",
      dataIndex: "presence",
      key: "presence",
      render: (presence) => (presence ? "Présent" : "Absent"),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type={record.presence ? "default" : "primary"}
          danger={record.presence}
          size="small"
          onClick={() =>
            togglePresence(
              record.idParticipation,
              record.presence,
              record.enseignant
            )
          }
        >
          {record.presence ? "Marquer Absent" : "Marquer Présent"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4}>Liste des présences</Title>
        </Col>
        <Col>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportExcel}
          >
            Export Excel
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={presences}
        columns={columns}
        rowKey="idParticipation"
        loading={loading}
        pagination={false}
      />
    </>
  );
};

PresenceList.propTypes = {
  seanceId: PropTypes.number.isRequired,
};

export default PresenceList;
