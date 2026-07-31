import { Alert, Button, Card, Progress, Select, Space, Spin, Tag, Typography } from "antd";
import { useState } from "react";
import type { MlScoreResponse } from "../api/types";
import { isInsufficientDataError, isModelUnavailableError } from "../api/client";
import { useMlScore } from "../hooks/useAnalytics";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { TeacherSelector } from "../components/TeacherSelector";
import { formatPercent } from "../lib/format";

type Target = "completion_probability" | "training_effectiveness_score";

const TARGET_LABELS: Record<Target, string> = {
  completion_probability: "Probabilité de complétion d'une formation",
  training_effectiveness_score: "Score d'efficacité d'une formation",
};

export function MlPredictionsPage() {
  const [teacherId, setTeacherId] = useState("ENS001");
  const [target, setTarget] = useState<Target>("completion_probability");
  const completion = useMlScore("completion_probability");
  const effectiveness = useMlScore("training_effectiveness_score");
  const mutation = target === "completion_probability" ? completion : effectiveness;

  const handleScore = () => {
    if (teacherId) mutation.mutate(teacherId);
  };

  const result: MlScoreResponse | undefined = mutation.data;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4}>Prédictions ML (cibles autorisées)</Typography.Title>

      <Space wrap>
        <TeacherSelector value={teacherId} onChange={setTeacherId} />
        <Select
          style={{ width: 300 }}
          value={target}
          onChange={setTarget}
          options={(Object.keys(TARGET_LABELS) as Target[]).map((key) => ({
            value: key,
            label: TARGET_LABELS[key],
          }))}
        />
        <Button type="primary" loading={mutation.isPending} disabled={!teacherId} onClick={handleScore}>
          Calculer la prédiction
        </Button>
      </Space>

      {mutation.isPending && <Spin />}

      {mutation.error && (
        <>
          {isInsufficientDataError(mutation.error) && (
            <Alert
              type="warning"
              showIcon
              message="Historique insuffisant"
              description="Pas assez de données historiques pour cet enseignant. La prédiction est impossible de manière fiable."
            />
          )}
          {isModelUnavailableError(mutation.error) && (
            <Alert
              type="info"
              showIcon
              message="Modèle non disponible"
              description="Exécutez d'abord l'entraînement (scripts/train_models.py) pour exporter le modèle."
            />
          )}
          {!isInsufficientDataError(mutation.error) && !isModelUnavailableError(mutation.error) && (
            <ApiErrorBanner error={mutation.error} />
          )}
        </>
      )}

      {result && (
        <Card size="small" title={`Prédiction — ${TARGET_LABELS[target]}`}>
          {result.status === "OK" ? (
            <Space direction="vertical" size={8}>
              <Progress
                type="dashboard"
                percent={Math.round(result.score * 100)}
                format={() => formatPercent(result.score, 0)}
              />
              <p>{result.explanation}</p>
              <Tag>Modèle v{result.model_version} — entraîné le {result.trained_at}</Tag>
              {Object.keys(result.feature_contributions).length > 0 && (
                <div>
                  <Typography.Text strong>Contributions des features :</Typography.Text>
                  <ul>
                    {Object.entries(result.feature_contributions)
                      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                      .slice(0, 8)
                      .map(([feature, contribution]) => (
                        <li key={feature}>
                          {feature.replace(/_/g, " ")} : <strong>{contribution.toFixed(3)}</strong>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </Space>
          ) : (
            <Alert
              type="warning"
              showIcon
              message={result.status === "INSUFFICIENT_HISTORICAL_DATA" ? "Historique insuffisant" : "Modèle indisponible"}
              description={result.explanation || "Aucune prédiction produite."}
            />
          )}
        </Card>
      )}
    </Space>
  );
}
