import { useMemo, useState } from "react";
import {
  Card, Table, Tag, Input, Button, Space, Typography, Statistic, Row, Col,
  Select, message as antdMessage, Empty, Spin, Alert,
} from "antd";
import { ReloadOutlined, ExperimentOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useABResults, useABWinner, useABAssign, useABEvent,
} from "@/hooks/analyse/useABTesting";
import type { ABVariantResult } from "@/services/analyse/ABTestingService";

const { Title, Text, Paragraph } = Typography;

const EVENT_TYPES = ["shown", "accepted", "completed", "scored", "days_to_enroll"];

export default function ABTestingPage() {
  const [experiment, setExperiment] = useState("recommendation_strategy");
  const [teacherId, setTeacherId] = useState("");
  const [variant, setVariant] = useState("control");
  const [eventType, setEventType] = useState("shown");

  const results = useABResults(experiment);
  const winner = useABWinner(experiment);
  const assign = useABAssign();
  const recordEvent = useABEvent();

  const columns: ColumnsType<ABVariantResult> = [
    { title: "Variante", dataIndex: "variant", key: "variant", render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: "Echantillon", dataIndex: "sample_size", key: "sample_size" },
    { title: "Affiche", dataIndex: "shown", key: "shown" },
    { title: "Accepte", dataIndex: "accepted", key: "accepted" },
    { title: "Complete", dataIndex: "completed", key: "completed" },
    {
      title: "Taux accept.",
      dataIndex: "acceptance_rate",
      key: "acceptance_rate",
      render: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    {
      title: "Taux complet.",
      dataIndex: "completion_rate",
      key: "completion_rate",
      render: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    { title: "Note moy.", dataIndex: "avg_score", key: "avg_score", render: (v: number) => v.toFixed(2) },
  ];

  const handleAssign = async () => {
    if (!teacherId.trim()) {
      antdMessage.warning("Veuillez saisir un identifiant enseignant.");
      return;
    }
    try {
      const res = await assign.mutateAsync({ teacher_id: teacherId.trim(), experiment_name: experiment });
      antdMessage.success(`Variante assignee : ${res.variant}`);
    } catch {
      antdMessage.error("Echec de l''assignation.");
    }
  };

  const handleEvent = async () => {
    if (!teacherId.trim()) {
      antdMessage.warning("Veuillez saisir un identifiant enseignant.");
      return;
    }
    try {
      const res = await recordEvent.mutateAsync({
        teacher_id: teacherId.trim(),
        experiment_name: experiment,
        variant,
        event_type: eventType,
      });
      antdMessage.success(res.status === "recorded" ? "Evenement enregistre." : "Evenement recu.");
    } catch {
      antdMessage.error("Echec de l''enregistrement de l''evenement.");
    }
  };

  const totalSample = useMemo(
    () => (results.data ?? []).reduce((acc, r) => acc + (r.sample_size || 0), 0),
    [results.data],
  );
  const totalAccepted = useMemo(
    () => (results.data ?? []).reduce((acc, r) => acc + (r.accepted || 0), 0),
    [results.data],
  );

  const winnerTag = useMemo(() => {
    if (winner.isLoading) return <Spin size="small" />;
    if (winner.data?.variant) {
      return <Tag color="green">🏆 {winner.data.variant}</Tag>;
    }
    return <Tag color="default">Aucun gagnant</Tag>;
  }, [winner.isLoading, winner.data]);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <ExperimentOutlined /> Tests A/B — Moteur d''analyse
      </Title>
      <Paragraph type="secondary">
        Pilotez les experiences de variantes (MSAS hybride, collaboratif, risk-based,
        baseline) et mesurez leur impact sur l''acceptation et la completion des
        formations recommandees.
      </Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            addonBefore="Experience"
            value={experiment}
            onChange={(e) => setExperiment(e.target.value)}
            style={{ width: 260 }}
            placeholder="recommendation_strategy"
          />
          <Input
            addonBefore="Enseignant"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            style={{ width: 220 }}
            placeholder="enseignant-123"
          />
          <Button
            type="primary"
            loading={assign.isPending}
            onClick={handleAssign}
          >
            Assigner variante
          </Button>
          <Select
            value={variant}
            onChange={setVariant}
            style={{ width: 150 }}
            options={[
              { value: "control", label: "control" },
              { value: "treatment_a", label: "treatment_a" },
              { value: "treatment_b", label: "treatment_b" },
              { value: "treatment_c", label: "treatment_c" },
            ]}
          />
          <Select
            value={eventType}
            onChange={setEventType}
            style={{ width: 160 }}
            options={EVENT_TYPES.map((e) => ({ value: e, label: e }))}
          />
          <Button
            icon={<ReloadOutlined />}
            loading={recordEvent.isPending}
            onClick={handleEvent}
          >
            Enregistrer evenement
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => results.refetch()}>
            Rafraichir
          </Button>
        </Space>
      </Card>

      {results.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Impossible de charger les resultats"
          description="Verifiez que le service d''analyse est demarre et que l''experience existe."
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total echantillon" value={totalSample} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total acceptations" value={totalAccepted} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Space direction="vertical">
              <Text strong>Variante gagnante</Text>
              {winnerTag}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="Resultats par variante">
        {(() => {
          if (results.isLoading) return <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>;
          if ((results.data?.length ?? 0) > 0) return (
            <Table<ABVariantResult>
              rowKey="variant"
              columns={columns}
              dataSource={results.data ?? []}
              pagination={false}
            />
          );
          return <Empty description="Aucune donnee pour cette experience" />;
        })()}
      </Card>
    </div>
  );
}
