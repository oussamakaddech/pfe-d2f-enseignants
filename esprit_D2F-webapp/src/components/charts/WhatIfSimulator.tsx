import { useState } from "react";
import {
  Card, Row, Col, InputNumber, Select, Button, Space, Typography, Table, Tag, Statistic, Divider, Alert, Empty,
} from "antd";
import {
  ExperimentOutlined, PlusOutlined, DeleteOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import type { WhatIfAction, WhatIfDetail, WhatIfResponse } from "@/models/analyse";
import { useSimulateWhatIf } from "@/hooks/analyse/useAnalytics";

const { Text, Paragraph } = Typography;

function riskColor(niveau: string): string {
  switch (niveau) {
    case "CRITIQUE": return "#ef4444";
    case "ELEVE":    return "#f59e0b";
    case "MODERE":   return "#3b82f6";
    default:         return "#10b981";
  }
}

interface PlanRow extends WhatIfAction {
  key: number;
}

export default function WhatIfSimulator({ enseignantId }: { readonly enseignantId: string }) {
  const [rows, setRows] = useState<PlanRow[]>([{ key: 1, competence_id: 1, niveau_vise: 4 }]);
  const [horizon, setHorizon] = useState<number>(6);
  const sim = useSimulateWhatIf(enseignantId);

  function addRow() {
    setRows((prev) => [...prev, { key: prev.length + 1, competence_id: 1, niveau_vise: 4 }]);
  }
  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }
  function updateRow(key: number, patch: Partial<PlanRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function run() {
    const plan: WhatIfAction[] = rows
      .filter((r) => r.competence_id > 0 && r.niveau_vise >= 1 && r.niveau_vise <= 5)
      .map(({ key: _k, ...rest }) => rest);
    if (!plan.length) return;
    await sim.mutateAsync({ plan, horizon_mois: horizon });
  }

  const result: WhatIfResponse | null = sim.data ?? null;

  const detailColumns = [
    { title: "Compétence", dataIndex: "competence_id", key: "competence_id", render: (v: number) => `C${v}` },
    { title: "Niveau actuel", dataIndex: "niveau_actuel", key: "niveau_actuel" },
    { title: "Niveau requis", dataIndex: "niveau_requis", key: "niveau_requis" },
    { title: "Niveau visé", dataIndex: "niveau_vise", key: "niveau_vise" },
    {
      title: "Gap avant → après",
      key: "gap",
      render: (_: unknown, d: WhatIfDetail) => `${d.gap_avant.toFixed(1)} → ${d.gap_apres.toFixed(1)}`,
    },
    {
      title: "Urgence après",
      dataIndex: "urgence_apres",
      key: "urgence_apres",
      render: (v: string) => <Tag color={riskColor(v)}>{v}</Tag>,
    },
    {
      title: "Résolu",
      dataIndex: "resolu",
      key: "resolu",
      render: (v: boolean) => (v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag>),
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Space>
          <ExperimentOutlined />
          <span>Simulation what-if — impact d'un plan de formation</span>
        </Space>
      }
    >
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        Projetez le score de risque et les gaps <em>comme si</em> le plan de formations ci-dessous avait été suivi.
        Réutilise la chaîne de scoring de risque du moteur.
      </Paragraph>

      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        {rows.map((row) => (
          <Space key={row.key} wrap>
            <Text style={{ fontSize: 12 }}>Compétence</Text>
            <InputNumber
              min={1}
              max={999}
              value={row.competence_id}
              onChange={(v) => updateRow(row.key, { competence_id: Number(v) || 0 })}
              placeholder="ID"
              style={{ width: 90 }}
            />
            <Text style={{ fontSize: 12 }}>Niveau visé</Text>
            <Select
              value={row.niveau_vise}
              onChange={(v) => updateRow(row.key, { niveau_vise: v })}
              style={{ width: 90 }}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `N${n}` }))}
            />
            {rows.length > 1 && (
              <Button
                icon={<DeleteOutlined />}
                onClick={() => removeRow(row.key)}
                danger
                size="small"
              />
            )}
          </Space>
        ))}

        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={addRow} size="small">
            Ajouter une action
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>Horizon</Text>
          <Select
            value={horizon}
            onChange={setHorizon}
            style={{ width: 110 }}
            options={[
              { value: 3, label: "3 mois" },
              { value: 6, label: "6 mois" },
              { value: 12, label: "12 mois" },
            ]}
          />
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={run}
            loading={sim.isPending}
            disabled={!enseignantId || rows.every((r) => r.competence_id <= 0)}
            style={{ background: "#b51200", borderColor: "#b51200" }}
          >
            Simuler l'impact
          </Button>
        </Space>
      </Space>

      {sim.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 12 }}
          message="La simulation a échoué. Vérifiez l'identifiant enseignant et les actions."
        />
      )}

      {result && (
        <>
          <Divider style={{ margin: "16px 0" }} />
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Risque avant"
                  value={Math.round(result.risk_before.score * 100)}
                  suffix="%"
                  valueStyle={{ color: riskColor(result.risk_before.niveau) }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>{result.risk_before.niveau}</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Risque après"
                  value={Math.round(result.risk_after.score * 100)}
                  suffix="%"
                  valueStyle={{ color: riskColor(result.risk_after.niveau) }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>{result.risk_after.niveau}</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Réduction risque"
                  value={Math.round(result.risk_reduction * 100)}
                  suffix="%"
                  valueStyle={{ color: "#10b981" }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Gaps résolus"
                  value={result.nb_gaps_resolus}
                  valueStyle={{ color: "#8b5cf6" }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {result.nb_gaps_before} → {result.nb_gaps_after}
                </Text>
              </Card>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 13 }}>Détail par compétence</Divider>
          {result.details.length ? (
            <Table<WhatIfDetail>
              rowKey="competence_id"
              size="small"
              pagination={false}
              columns={detailColumns}
              dataSource={result.details}
            />
          ) : (
            <Empty description="Aucun détail retourné" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </>
      )}
    </Card>
  );
}
