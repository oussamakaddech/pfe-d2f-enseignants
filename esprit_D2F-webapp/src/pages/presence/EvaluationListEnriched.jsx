// src/components/EvaluationListEnriched.jsx
import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Checkbox,
  Typography,
  Space,
} from "antd";
import { DownloadOutlined, SaveOutlined } from "@ant-design/icons";
import useAppNotification from "../../hooks/useAppNotification";
import * as XLSX from "xlsx";
import EvaluationFormateurService from "../../services/EvaluationFormateurService";

const EvaluationListEnriched = () => {
  const { message } = useAppNotification();
  const [evaluations, setEvaluations] = useState([]);

  useEffect(() => {
    EvaluationFormateurService.listAllEvaluationsEnriched()
      .then((data) => setEvaluations(data))
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération des évaluations enrichies :",
          error
        );
      });
  }, []);

  const handleChange = (index, field, value) => {
    const copy = [...evaluations];
    copy[index][field] = value;
    setEvaluations(copy);
  };

  const handleCheckboxChange = (index, field, checked) => {
    const copy = [...evaluations];
    copy[index][field] = checked;
    setEvaluations(copy);
  };

  const handleSaveAll = () => {
    const dtos = evaluations.map((e) => ({
      idEvalParticipant: e.idEvalParticipant,
      note: e.note,
      satisfaisant: e.satisfaisant,
      commentaire: e.commentaire,
      enseignantId: e.enseignantId,
      formationId: e.formationId,
    }));
    EvaluationFormateurService.updateEvaluationsBulk(dtos)
      .then(() => message.success("Mise à jour en masse effectuée avec succès"))
      .catch((err) => {
        console.error("Erreur lors de la mise à jour en masse :", err);
        message.error("Erreur lors de la mise à jour en masse");
      });
  };

  const exportExcel = () => {
    const data = evaluations.map((e) => ({
      Nom: e.nom,
      Prénom: e.prenom,
      Email: e.mail,
      Note: e.note,
      Satisfaisant: e.satisfaisant ? "Oui" : "Non",
      Commentaire: e.commentaire || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Évaluations");
    XLSX.writeFile(wb, "evaluations_enriched.xlsx");
  };

  const columns = [
    {
      title: "Enseignant",
      dataIndex: "nom",
      key: "nom",
      render: (_, row) => (
        <div>
          <div>{row.nom} {row.prenom}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>({row.mail})</Typography.Text>
        </div>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      width: 100,
      render: (_, row, idx) => (
        <InputNumber
          value={row.note}
          onChange={(val) => handleChange(idx, "note", val)}
          min={0}
          max={20}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: "Satisfaisant",
      dataIndex: "satisfaisant",
      key: "satisfaisant",
      width: 120,
      render: (_, row, idx) => (
        <Checkbox
          checked={row.satisfaisant}
          onChange={(e) => handleCheckboxChange(idx, "satisfaisant", e.target.checked)}
        />
      ),
    },
    {
      title: "Commentaire",
      dataIndex: "commentaire",
      key: "commentaire",
      render: (_, row, idx) => (
        <Input
          value={row.commentaire}
          onChange={(e) => handleChange(idx, "commentaire", e.target.value)}
        />
      ),
    },
  ];

  return (
    <Card style={{ marginTop: 16, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>Évaluations enrichies</Typography.Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={exportExcel}>
            Exporter Excel
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAll}>
            Enregistrer tout
          </Button>
        </Space>
      </div>
      <Table
        dataSource={evaluations}
        columns={columns}
        rowKey="idEvalParticipant"
        size="small"
        pagination={false}
      />
    </Card>
  );
};

export default EvaluationListEnriched;
