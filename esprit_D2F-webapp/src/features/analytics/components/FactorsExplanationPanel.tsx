import { Card, List, Progress, Tag, Typography, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { RiskFactor } from "../types";

interface FactorsExplanationPanelProps {
  facteurs: RiskFactor[] | undefined;
  loading?: boolean;
}

/** Panneau explicatif des facteurs ayant contribué au score de risque. */
export default function FactorsExplanationPanel({
  facteurs,
  loading,
}: FactorsExplanationPanelProps) {
  return (
    <Card loading={loading} title="Explication du score (facteurs pondérés)" style={{ borderRadius: 12 }}>
      {!facteurs || facteurs.length === 0 ? (
        <Typography.Text type="secondary">Aucun facteur disponible.</Typography.Text>
      ) : (
        <List
          dataSource={facteurs}
          renderItem={(f) => (
            <List.Item>
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography.Text strong>{f.nom}</Typography.Text>
                  <Tag color="blue">poids {(f.poids * 100).toFixed(0)}%</Tag>
                </div>
                <Tooltip title={f.explication}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Progress
                      percent={Math.round(Math.abs(f.contribution) * 100)}
                      size="small"
                      strokeColor={f.contribution >= 0 ? "#f5222d" : "#52c41a"}
                      style={{ flex: 1 }}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined /> contribution {f.contribution.toFixed(3)}
                    </Typography.Text>
                  </div>
                </Tooltip>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
