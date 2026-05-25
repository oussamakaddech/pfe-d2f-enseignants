import { Card, Space, Typography, Tooltip } from "antd";
import { WarningOutlined, FallOutlined } from "@ant-design/icons";
import type { SkillGap } from "@/models/analyse";
import RiskBadge from "./RiskBadge";
import PredictionScoreBar from "./PredictionScoreBar";

const { Text, Paragraph } = Typography;

const NIVEAU_LABEL: Record<number, string> = {
  0: "—", 1: "Débutant", 2: "Élémentaire",
  3: "Intermédiaire", 4: "Avancé", 5: "Expert",
};

interface SkillGapCardProps {
  readonly gap:       SkillGap;
  readonly onClick?:  (gap: SkillGap) => void;
  readonly compact?:  boolean;
}

export default function SkillGapCard({ gap, onClick, compact = false }: SkillGapCardProps) {
  const isCritique = gap.niveau_urgence === "CRITIQUE";
  let borderColor = "#f59e0b";
  if (isCritique) borderColor = "#ef4444";
  else if (gap.niveau_urgence === "HAUTE") borderColor = "#f97316";

  return (
    <Card
      hoverable={!!onClick}
      onClick={() => onClick?.(gap)}
      size="small"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 12,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={4}>
        {/* En-tête */}
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Text strong style={{ fontSize: 14 }}>
            {gap.en_regression && <FallOutlined style={{ color: "#ef4444", marginRight: 4 }} />}
            {gap.competence_nom}
          </Text>
          <RiskBadge type="urgence" value={gap.niveau_urgence} />
        </Space>

        {gap.domaine_nom && (
          <Text type="secondary" style={{ fontSize: 12 }}>{gap.domaine_nom}</Text>
        )}

        {/* Niveaux */}
        <Space style={{ width: "100%", justifyContent: "space-between" }} size={compact ? 8 : 16} wrap>
          <Tooltip title="Niveau actuel">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1e40af", lineHeight: 1 }}>
                {gap.niveau_actuel}<span style={{ fontSize: 12, color: "#94a3b8" }}>/5</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {NIVEAU_LABEL[gap.niveau_actuel]}
              </Text>
            </div>
          </Tooltip>

          <div style={{ fontSize: 18, color: "#94a3b8" }}>→</div>

          <Tooltip title="Niveau requis">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#B51200", lineHeight: 1 }}>
                {gap.niveau_requis}<span style={{ fontSize: 12, color: "#94a3b8" }}>/5</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {NIVEAU_LABEL[gap.niveau_requis]}
              </Text>
            </div>
          </Tooltip>
        </Space>

        {/* Score de priorité */}
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Score de priorité</Text>
          <PredictionScoreBar value={gap.priorite_score} size="small" />
        </div>

        {/* Alertes supplémentaires */}
        {!compact && (
          <Space size={4} wrap>
            {gap.mois_stagnation >= 6 && (
              <Text type="warning" style={{ fontSize: 11 }}>
                <WarningOutlined /> Stagnation {gap.mois_stagnation} mois
              </Text>
            )}
            {gap.en_regression && (
              <Text style={{ fontSize: 11, color: "#ef4444" }}>
                <FallOutlined /> Régression détectée
              </Text>
            )}
          </Space>
        )}

        {!compact && gap.justification && (
          <Paragraph
            type="secondary"
            style={{ fontSize: 11, marginBottom: 0 }}
            ellipsis={{ rows: 2 }}
          >
            {gap.justification}
          </Paragraph>
        )}
      </Space>
    </Card>
  );
}




