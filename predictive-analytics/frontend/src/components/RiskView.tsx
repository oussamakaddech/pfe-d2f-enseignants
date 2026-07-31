import { Alert, Card, Progress, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RiskFactor, RiskProfile } from "../api/types";
import { formatScore, riskLevelLabel } from "../lib/format";

const RISK_COLOR: Record<string, string> = {
  LOW: "#52c41a",
  MEDIUM: "#faad14",
  HIGH: "#fa8c16",
  CRITICAL: "#f5222d",
};

const factorColumns: ColumnsType<RiskFactor> = [
  {
    title: "Facteur",
    dataIndex: "label",
  },
  {
    title: "Contribution",
    dataIndex: "contribution",
    render: (value: number) => (
      <Progress percent={Math.round(value * 100)} size="small" style={{ minWidth: 140 }} />
    ),
  },
  {
    title: "Détail",
    dataIndex: "detail",
    render: (value: string) => <span style={{ fontSize: 12 }}>{value}</span>,
  },
];

interface Props {
  risk: RiskProfile;
}

export function RiskView({ risk }: Props) {
  const color = RISK_COLOR[risk.risk_level] ?? "#8c8c8c";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card size="small">
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <Progress
            type="dashboard"
            percent={Math.round(risk.risk_score * 100)}
            strokeColor={color}
          />
          <div>
            <Tag color={color} style={{ fontSize: 14, padding: "2px 12px" }}>
              {riskLevelLabel(risk.risk_level)}
            </Tag>
            {risk.ml_stagnation_probability !== null && (
              <p style={{ marginTop: 8 }}>
                Prédiction ML stagnation (12 mois) :{" "}
                <strong>{formatScore(risk.ml_stagnation_probability * 100, 0)} %</strong>
                {risk.model_version && (
                  <Tag style={{ marginLeft: 8 }}>v{risk.model_version}</Tag>
                )}
              </p>
            )}
            {risk.ml_stagnation_probability === null && (
              <Alert
                style={{ marginTop: 8 }}
                type="info"
                showIcon
                message="Score déterministe uniquement (modèle ML non entraîné)"
              />
            )}
          </div>
        </div>
      </Card>
      <Table<RiskFactor>
        size="small"
        rowKey="code"
        columns={factorColumns}
        dataSource={risk.factors}
        pagination={false}
      />
    </div>
  );
}
