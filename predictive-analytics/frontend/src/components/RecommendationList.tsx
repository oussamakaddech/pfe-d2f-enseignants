import { Alert, Card, Collapse, List, Progress, Tag, Tooltip } from "antd";
import type { Recommendation, RecommendationResult } from "../api/types";
import { PRIORITY_COLOR, priorityLabel } from "../lib/format";
import { QualityTag } from "./QualityTag";

function ScoreBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ paddingTop: 8 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 180, fontSize: 12 }}>{key.replace(/_/g, " ")}</span>
          <Progress
            percent={Math.round(value * 100)}
            size="small"
            style={{ flex: 1, margin: 0 }}
          />
        </div>
      ))}
    </div>
  );
}

function RecommendationItem({ rec }: { rec: Recommendation }) {
  return (
    <Card
      size="small"
      title={
        <span>
          {rec.title}{" "}
          <Tag color={PRIORITY_COLOR[rec.priority]} style={{ marginLeft: 8 }}>
            {priorityLabel(rec.priority)}
          </Tag>
        </span>
      }
      extra={<QualityTag status={rec.data_quality_status} />}
    >
      <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 8 }}>
        <div style={{ width: 160 }}>
          <Tooltip title="Score global de recommandation">
            <Progress
              percent={Math.round(rec.recommendation_score * 100)}
              strokeColor={PRIORITY_COLOR[rec.priority]}
              size="small"
            />
          </Tooltip>
        </div>
        <span>{Math.round(rec.recommendation_score * 100)} / 100</span>
        <span>Durée estimée : {rec.estimated_duration_hours}h</span>
        {rec.available_from && <span>Disponible le {rec.available_from}</span>}
      </div>
      <p style={{ marginBottom: 4 }}>{rec.human_readable_explanation}</p>
      <Collapse
        ghost
        size="small"
        items={[
          {
            key: "breakdown",
            label: "Décomposition du score",
            children: <ScoreBreakdown breakdown={rec.score_breakdown} />,
          },
          {
            key: "details",
            label: "Détails",
            children: (
              <List size="small" dataSource={rec.reason_codes} renderItem={(c) => <List.Item>{c}</List.Item>} />
            ),
          },
        ]}
      />
    </Card>
  );
}

interface Props {
  result: RecommendationResult;
}

export function RecommendationList({ result }: Props) {
  if (!result.recommendations.length) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Aucune formation éligible"
        description={result.no_eligible_reason ?? "Aucune formation ne correspond aux gaps actifs."}
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {result.recommendations.map((rec) => (
        <RecommendationItem key={rec.training_id} rec={rec} />
      ))}
    </div>
  );
}
