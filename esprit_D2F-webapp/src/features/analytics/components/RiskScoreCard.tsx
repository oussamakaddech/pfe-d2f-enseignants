import { Card, Progress, Tag, Typography } from "antd";
import { riskColor, riskLabel } from "../utils/format";
import type { RiskScore } from "../types";

interface RiskScoreCardProps {
  risk: RiskScore | undefined;
  loading?: boolean;
}

/** Carte affichant le score de risque multi-facteurs et sa catégorie. */
export default function RiskScoreCard({ risk, loading }: RiskScoreCardProps) {
  const score = risk?.score ?? 0;
  const level = risk?.niveau ?? "FAIBLE";
  const color = riskColor(level);

  return (
    <Card loading={loading} title="Score de risque" style={{ borderRadius: 12 }}>
      <div style={{ textAlign: "center" }}>
        <Progress
          type="dashboard"
          percent={Math.round(score * 100)}
          strokeColor={color}
          format={(p) => `${p}%`}
        />
        <div style={{ marginTop: 8 }}>
          <Tag color={color} style={{ fontSize: 14, padding: "2px 12px" }}>
            {riskLabel(level)}
          </Tag>
        </div>
        {risk?.precedent_score !== null && risk?.precedent_score !== undefined && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Précédent : {Math.round(risk.precedent_score * 100)}% · Tendance : {risk.tendance}
          </Typography.Text>
        )}
      </div>
    </Card>
  );
}
