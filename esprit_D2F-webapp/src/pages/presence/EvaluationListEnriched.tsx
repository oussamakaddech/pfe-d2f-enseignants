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
import type { TableColumnsType } from "antd";
import { DownloadOutlined, SaveOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useEvaluationsGlobales, useUpdateEvaluationsBulkFlat } from "@/hooks/evaluation";

interface EvaluationRow {
  idEvalParticipant?: string | number;
  nom?: string;
  prenom?: string;
  mail?: string;
  note?: number | null;
  satisfaisant?: boolean;
  commentaire?: string;
  enseignantId?: string | number;
  formationId?: string | number;
}

const EvaluationListEnriched = () => {
  const { message } = useAppNotification();
  const { data: rawEvaluations = [] } = useEvaluationsGlobales();
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const bulkUpdateMut = useUpdateEvaluationsBulkFlat();

  useEffect(() => {
    setEvaluations(rawEvaluations as EvaluationRow[]);
  }, [rawEvaluations]);

  const handleChange = (index: number, field: keyof EvaluationRow, value: unknown) => {
    setEvaluations((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCheckboxChange = (index: number, field: keyof EvaluationRow, checked: boolean) => {
    handleChange(index, field, checked);
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
    bulkUpdateMut.mutateAsync({ evaluations: dtos })
      .then(() => message.success("Mise à jour en masse effectuée avec succès"))
      .catch(() => {
        message.error("Erreur lors de la mise à jour en masse");
      });
  };

  const exportExcel = () => {
    const rows = evaluations.map((e) => ({
      Nom:          e.nom,
      Prénom:       e.prenom,
      Email:        e.mail,
      Note:         e.note,
      Satisfaisant: e.satisfaisant ? "Oui" : "Non",
      Commentaire:  e.commentaire || "",
    }));
    writeExcel(
      [{ name: "Évaluations", rows, title: "Évaluations Enrichies — Esprit", subtitle: exportDateLabel() }],
      `evaluations_enriched_${isoDate()}.xlsx`
    );
  };

  const columns: TableColumnsType<EvaluationRow> = [
    {
      title: "Enseignant",
      dataIndex: "nom",
      key: "nom",
      render: (_: unknown, row: EvaluationRow) => (
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
      render: (_: unknown, row: EvaluationRow, idx: number) => (
        <InputNumber
          value={row.note ?? undefined}
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
      render: (_: unknown, row: EvaluationRow, idx: number) => (
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
      render: (_: unknown, row: EvaluationRow, idx: number) => (
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
      <Table<EvaluationRow>
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
