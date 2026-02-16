// src/components/FormationEvaluationsTab.jsx
import  { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Table,
  InputNumber,
  Input,
  Checkbox,
  Button,
  Typography,
  Space,
  Row,
} from "antd";
import {
  DownloadOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import EvaluationFormateurService from "../../services/EvaluationFormateurService";
import EnseignantService from "../../services/EnseignantService";

const { Title, Text } = Typography;

const FormationEvaluationsTab = ({ formationId }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvaluations = () => {
    setLoading(true);
    Promise.all([
      EvaluationFormateurService.listEvaluationsEnrichedByFormation(formationId),
      EnseignantService.getAllEnseignants(),
    ])
      .then(([evals, enseignants]) => {
        const ensMap = enseignants.reduce((map, ens) => {
          map[ens.id] = ens;
          return map;
        }, {});
        const enriched = evals.map(ev => {
          const ens = ensMap[ev.enseignantId] || {};
          return {
            key: ev.idEvalParticipant,
            ...ev,
            nom: ens.nom || "",
            prenom: ens.prenom || "",
            mail: ens.mail || "",
          };
        });
        setEvaluations(enriched);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (formationId) {
      loadEvaluations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationId]);

  const handleSaveAll = () => {
    const dtoList = evaluations.map(ev => ({
      idEvalParticipant: ev.idEvalParticipant,
      enseignantId: ev.enseignantId,
      formationId: ev.formationId,
      note: ev.note,
      satisfaisant: ev.satisfaisant,
      commentaire: ev.commentaire,
    }));
    EvaluationFormateurService
      .updateEvaluationsBulkByFormation(formationId, dtoList)
      .then(loadEvaluations)
      .catch(console.error);
  };

  const exportExcel = () => {
    const data = evaluations.map(ev => ({
      Nom: ev.nom,
      Prénom: ev.prenom,
      Email: ev.mail,
      Note: ev.note,
      Satisfaisant: ev.satisfaisant ? "Oui" : "Non",
      Commentaire: ev.commentaire || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Évaluations");
    XLSX.writeFile(wb, `evaluations_formation_${formationId}.xlsx`);
  };

  const columns = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_, r) => (
        <>
          <Text strong>{r.nom} {r.prenom}</Text><br/>
          <Text type="secondary">({r.mail})</Text>
        </>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      width: 120,
      render: (_, __, idx) => (
        <InputNumber
          min={0} max={20}
          value={evaluations[idx].note}
          onChange={v => {
            const arr = [...evaluations];
            arr[idx].note = v;
            setEvaluations(arr);
          }}
        />
      ),
    },
    {
      title: "Satisfaisant",
      dataIndex: "satisfaisant",
      key: "satisfaisant",
      width: 120,
      render: (_, __, idx) => (
        <Checkbox
          checked={evaluations[idx].satisfaisant}
          onChange={e => {
            const arr = [...evaluations];
            arr[idx].satisfaisant = e.target.checked;
            setEvaluations(arr);
          }}
        />
      ),
    },
    {
      title: "Commentaire",
      key: "commentaire",
      render: (_, __, idx) => (
        <Input.TextArea
          rows={2}
          value={evaluations[idx].commentaire}
          onChange={e => {
            const arr = [...evaluations];
            arr[idx].commentaire = e.target.value;
            setEvaluations(arr);
          }}
        />
      ),
    },
  ];

  if (loading) {
    return <Title level={4}>Chargement des évaluations…</Title>;
  }
  if (!evaluations.length) {
    return (
      <Space direction="vertical" align="center">
        <Text>Aucune évaluation pour cette formation.</Text>
        <Button type="primary" onClick={loadEvaluations}>Recharger</Button>
      </Space>
    );
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" style={{ width: "100%", marginBottom: 16 }}>
        <Title level={4}>Évaluations</Title>
        <Button icon={<DownloadOutlined />} onClick={exportExcel}>
          Exporter Excel
        </Button>
      </Row>
      <Table
        columns={columns}
        dataSource={evaluations}
        pagination={false}
        bordered
      />
      <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 16 }}>
        <Button type="primary" onClick={handleSaveAll}>Enregistrer</Button>
        <Button onClick={loadEvaluations}>Recharger</Button>
      </Space>
    </Space>
  );
};

FormationEvaluationsTab.propTypes = {
  formationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default FormationEvaluationsTab;
