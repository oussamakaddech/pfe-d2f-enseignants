import { useState, useEffect, useMemo } from "react";
import { useAppNotification } from "@/hooks/ui";
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
import type { TableColumnsType } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useEvaluationsEnrichedByFormation, useUpdateEvaluationsBulk } from "@/hooks/evaluation";
import { useEnseignants } from "@/hooks/enseignant";

const { Text } = Typography;

interface EnseignantData {
  id?: string | number;
  nom?: string;
  prenom?: string;
  mail?: string;
}

interface EvaluationRow {
  key?: string | number;
  idEvalParticipant?: string | number;
  enseignantId?: string | number;
  formationId?: string | number;
  note?: number | null;
  satisfaisant?: boolean;
  commentaire?: string;
  nom?: string;
  prenom?: string;
  mail?: string;
}

interface FormationEvaluationsTabProps {
  formationId: string | number;
}

const FormationEvaluationsTab = ({ formationId }: FormationEvaluationsTabProps) => {
  const { message } = useAppNotification();
  const { data: rawEvals = [], isLoading } = useEvaluationsEnrichedByFormation(formationId);
  const { data: enseignantsData = [] } = useEnseignants();
  const bulkUpdateMut = useUpdateEvaluationsBulk();

  const enrichedBase = useMemo((): EvaluationRow[] => {
    const ensMap = (enseignantsData as EnseignantData[]).reduce<Record<string, EnseignantData>>((map, ens) => {
      if (ens.id != null) map[String(ens.id)] = ens;
      return map;
    }, {});
    return (rawEvals as EvaluationRow[]).map((ev) => {
      const ens = (ensMap[String(ev.enseignantId)] || {}) as EnseignantData; // S4325: cast needed for compatibility
      return { key: ev.idEvalParticipant, ...ev, nom: ens.nom || "", prenom: ens.prenom || "", mail: ens.mail || "" };
    });
  }, [rawEvals, enseignantsData]);

  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const loading = isLoading;

  useEffect(() => {
    setEvaluations(enrichedBase);
  }, [enrichedBase]);

  const handleSaveAll = () => {
    const dtoList = evaluations.map(ev => ({
      idEvalParticipant: ev.idEvalParticipant,
      enseignantId: ev.enseignantId,
      formationId: ev.formationId,
      note: ev.note,
      satisfaisant: ev.satisfaisant,
      commentaire: ev.commentaire,
    }));
    bulkUpdateMut.mutateAsync({ formationId, evaluations: dtoList }).catch(() => {
      message.error("Erreur lors de la sauvegarde des évaluations.");
    });
  };

  const exportExcel = () => {
    const rows = evaluations.map(ev => ({
      Nom:          ev.nom,
      Prénom:       ev.prenom,
      Email:        ev.mail,
      Note:         ev.note,
      Satisfaisant: ev.satisfaisant ? "Oui" : "Non",
      Commentaire:  ev.commentaire || "",
    }));
    writeExcel(
      [{ name: "Évaluations", rows, title: "Évaluations de Formation — Esprit", subtitle: exportDateLabel() }],
      `evaluations_formation_${formationId}_${isoDate()}.xlsx`
    );
  };

  const columns: TableColumnsType<EvaluationRow> = [
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
          value={evaluations[idx]?.note ?? null}
          onChange={v => {
            const arr = [...evaluations];
            arr[idx] = { ...arr[idx], note: v };
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
          checked={evaluations[idx]?.satisfaisant ?? false}
          onChange={e => {
            const arr = [...evaluations];
            arr[idx] = { ...arr[idx], satisfaisant: e.target.checked };
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
          value={evaluations[idx]?.commentaire ?? ""}
          onChange={e => {
            const arr = [...evaluations];
            arr[idx] = { ...arr[idx], commentaire: e.target.value };
            setEvaluations(arr);
          }}
        />
      ),
    },
  ];

  if (loading) {
    return <Text>Chargement des évaluations…</Text>;
  }
  if (!evaluations.length) {
    return (
      <Space direction="vertical" align="center">
        <Text>Aucune évaluation pour cette formation.</Text>
      </Space>
    );
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" style={{ width: "100%", marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15 }}>Évaluations</Text>
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
        <Button onClick={() => setEvaluations(enrichedBase)}>Recharger</Button>
      </Space>
    </Space>
  );
};

export default FormationEvaluationsTab;
