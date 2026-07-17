import { Steps, Tag, Typography, Empty, Progress } from "antd";
import type { TrainingPath } from "../types";

interface TrainingPathStepperProps {
  readonly path: TrainingPath | undefined;
  readonly loading?: boolean;
}

/** Parcours de formation ordonné (timeline/stepper). */
export default function TrainingPathStepper({ path, loading }: TrainingPathStepperProps) {
  if (loading) return <Typography.Text>Chargement du parcours…</Typography.Text>;
  if (!path || path.items.length === 0) return <Empty description="Aucun parcours défini" />;

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <Tag color="blue">
          N{path.niveau_depart} → N{path.niveau_vise}
        </Tag>
        <Tag>{path.duree_totale_heures} h</Tag>
        <Progress
          percent={Math.round(path.probabilite_reussite_globale * 100)}
          size="small"
          style={{ width: 160 }}
          format={(p) => `réussite ${p}%`}
        />
      </div>
      <Steps
        direction="vertical"
        current={-1}
        items={path.items.map((it) => ({
          title: (
            <span>
              {it.formation_titre}{" "}
              {it.deja_suivie && <Tag color="default">déjà suivie</Tag>}
              {!it.prerequis_satisfaits && <Tag color="red">prérequis manquants</Tag>}
            </span>
          ),
          description: (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {it.formation_type} · {it.duree_heures} h · N{it.niveau_avant} → N
                {it.niveau_apres}
              </Typography.Text>
              <div>
                <Progress
                  percent={Math.round(it.probabilite_reussite * 100)}
                  size="small"
                  style={{ maxWidth: 240 }}
                  format={(p) => `réussite ${p}%`}
                />
              </div>
              {it.justification && (
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                  {it.justification}
                </Typography.Paragraph>
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}
