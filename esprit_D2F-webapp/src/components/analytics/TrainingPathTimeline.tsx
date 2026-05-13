import { Timeline, Tag, Space, Typography, Tooltip } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined, LockOutlined } from "@ant-design/icons";
import type { TrainingPath, TrainingPathItem } from "../../models/analytics";

const { Text } = Typography;

const NIVEAU_LABEL: Record<number, string> = {
  0: "—", 1: "N1", 2: "N2", 3: "N3", 4: "N4", 5: "N5",
};

const TYPE_COLOR: Record<string, string> = {
  INTERNE: "#3b82f6", EXTERNE: "#8b5cf6", EN_LIGNE: "#10b981",
};

function StepDot({ item, index }: { item: TrainingPathItem; index: number }) {
  const bg = item.deja_suivie ? "#10b981" : item.prerequis_satisfaits ? "#B51200" : "#94a3b8";
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700,
    }}>
      {item.deja_suivie ? <CheckCircleOutlined /> : index + 1}
    </div>
  );
}

interface TrainingPathTimelineProps {
  path: TrainingPath;
}

export default function TrainingPathTimeline({ path }: TrainingPathTimelineProps) {
  return (
    <div>
      {/* Résumé du parcours */}
      <div style={{
        background: "linear-gradient(135deg, #B51200, #8b0000)",
        borderRadius: 12, padding: "16px 20px", color: "#fff", marginBottom: 20,
      }}>
        <Text strong style={{ color: "#fff", fontSize: 15 }}>
          {path.competence_nom}
        </Text>
        <div style={{ display: "flex", gap: 24, marginTop: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {path.niveau_depart} → {path.niveau_vise}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Niveaux</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{path.nb_formations}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Formations</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{path.duree_totale_heures}h</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Durée totale</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {Math.round(path.probabilite_reussite_globale * 100)}%
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Probabilité de réussite</div>
          </div>
        </div>
      </div>

      {/* Étapes */}
      <Timeline
        items={path.etapes.map((item, i) => ({
          dot: <StepDot item={item} index={i} />,
          children: (
            <div style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: 10, padding: "12px 16px",
              border: "1px solid #f0f0f0",
              opacity: item.deja_suivie ? 0.6 : 1,
            }}>
              <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
                <Space>
                  <Text strong style={{ fontSize: 13 }}>{item.formation_titre}</Text>
                  {item.deja_suivie && <Tag color="success">Déjà suivie</Tag>}
                  {!item.prerequis_satisfaits && (
                    <Tooltip title="Prérequis non satisfaits">
                      <LockOutlined style={{ color: "#94a3b8" }} />
                    </Tooltip>
                  )}
                </Space>
                <Space size={4}>
                  {item.formation_type && (
                    <Tag color={TYPE_COLOR[item.formation_type] ?? "default"} style={{ margin: 0 }}>
                      {item.formation_type}
                    </Tag>
                  )}
                  <Tag icon={<ClockCircleOutlined />} color="default">{item.duree_heures}h</Tag>
                </Space>
              </Space>

              {/* Progression de niveau */}
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <Tag color="blue">{NIVEAU_LABEL[item.niveau_avant]}</Tag>
                <span style={{ color: "#94a3b8" }}>→</span>
                <Tag color="red">{NIVEAU_LABEL[item.niveau_apres]}</Tag>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                  Score : {Math.round(item.score_formation * 100)}%
                </Text>
              </div>

              {item.justification && (
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                  {item.justification}
                </Text>
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}
