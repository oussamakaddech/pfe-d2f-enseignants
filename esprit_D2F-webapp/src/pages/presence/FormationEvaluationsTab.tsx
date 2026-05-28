import  { useState, useEffect, useMemo } from "react";
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
import {
  DownloadOutlined,
} from "@ant-design/icons";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useEvaluationsEnrichedByFormation, useUpdateEvaluationsBulk } from "@/hooks/evaluation";
import { useEnseignants } from "@/hooks/enseignant";

const { Text } = Typography;

interface FormationEvaluationsTabProps {
  formationId: string | number;
}

const FormationEvaluationsTab = ({ formationId }: FormationEvaluationsTabProps) => {
  const { message } = useAppNotification();
  const { data: rawEvals = [], isLoading } = useEvaluationsEnrichedByFormation(formationId);
  const { data: enseignantsData = [] } = useEnseignants();
  const bulkUpdateMut = useUpdateEvaluationsBulk();

  const enrichedBase = useMemo(() => {
    const ensMap = (enseignantsData as any[]).reduce((map: Record<string, any>, ens: any) => {
      map[ens.id as string] = ens;
      return map;
    }, {} as Record<string, any>);
    return (rawEvals as any[]).map((ev: any) => {
      const ens = (ensMap[ev.enseignantId as string] || {}) as Record<string, any>;
      return { key: ev.idEvalParticipant, ...ev, nom: ens.nom || "", prenom: ens.prenom || "", mail: ens.mail || "" };
    });
  }, [rawEvals, enseignantsData]);

  const [evaluations, setEvaluations] = useState<Record<string, unknown>[]>([]);
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

  const columns = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_: any, r: any) => (
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
      render: (_: any, __: any, idx: number) => (
        <InputNumber
          min={0} max={20}
          value={evaluations[idx].note as any}
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
      render: (_: any, __: any, idx: number) => (
        <Checkbox
          checked={evaluations[idx].satisfaisant as any}
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
      render: (_: any, __: any, idx: number) => (
        <Input.TextArea
          rows={2}
          value={evaluations[idx].commentaire as any}
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








