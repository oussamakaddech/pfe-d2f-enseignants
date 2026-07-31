import { Empty, Steps, Tag, Tooltip } from "antd";
import type { LearningPath, LearningPathStep } from "../api/types";
import { PRIORITY_COLOR } from "../lib/format";

function stepStatus(step: LearningPathStep) {
  if (step.status === "BLOCKED") return "error" as const;
  if (step.status === "FUTURE_SUGGESTION") return "wait" as const;
  return "process" as const;
}

interface Props {
  path: LearningPath;
}

export function LearningPathView({ path }: Props) {
  if (!path.steps.length) {
    return <Empty description="Aucun parcours constructible (pas de recommandations éligibles)" />;
  }

  return (
    <div>
      <Steps
        direction="vertical"
        size="small"
        items={path.steps.map((step) => ({
          status: stepStatus(step),
          title: step.title,
          description: (
            <span>
              <Tag color={PRIORITY_COLOR[step.priority]}>{step.priority}</Tag>
              {step.is_blocking && <Tag color="red">Bloquant</Tag>}
              {step.status === "FUTURE_SUGGESTION" && <Tag>Ouverture future</Tag>}
              {step.blocked_by.length > 0 && (
                <Tag>Dépend de : {step.blocked_by.join(", ")}</Tag>
              )}
              <span style={{ marginLeft: 8 }}>Durée : {step.estimated_duration_hours}h</span>
            </span>
          ),
        }))}
      />
      {path.cycles_detected.length > 0 && (
        <Tooltip title="Dépendances cycliques détectées entre formations">
          <Tag color="orange" style={{ marginTop: 8 }}>
            {path.cycles_detected.length} cycle(s) de prérequis ignoré(s)
          </Tag>
        </Tooltip>
      )}
      <p style={{ marginTop: 12 }}>
        <strong>Durée totale estimée : {path.total_duration_hours} h</strong>
      </p>
    </div>
  );
}
