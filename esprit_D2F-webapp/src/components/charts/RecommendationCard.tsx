import { memo } from "react";
import { Card, Space, Typography, Tag, Tooltip, Button } from "antd";
import { BookOutlined, CheckCircleOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import type { Recommendation } from "@/models/analyse";
import PredictionScoreBar from "./PredictionScoreBar";

const { Text, Paragraph } = Typography;

const TYPE_COLOR: Record<string, string> = {
  INTERNE:  "#3b82f6",
  EXTERNE:  "#8b5cf6",
  EN_LIGNE: "#10b981",
};

interface RecommendationCardProps {
  readonly recommendation: Recommendation;
  readonly rank?:          number;
  readonly onStatusChange?: (id: number, statut: "ACCEPTEE" | "IGNOREE") => void;
  readonly updating?:      boolean;
}

const RecommendationCard = memo(function RecommendationCard({ recommendation: r, rank, onStatusChange, updating }: RecommendationCardProps) {
  const isProposed = r.statut === "PROPOSEE";

  return (
    <Card
      size="small"
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderLeft: (() => {
          if (r.statut === "ACCEPTEE") return "4px solid #10b981";
          if (r.statut === "IGNOREE") return "4px solid #d9d9d9";
          return "4px solid #b51200";
        })(),
        opacity: r.statut === "IGNOREE" ? 0.6 : 1,
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={6}>
        {/* En-tête */}
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Space>
            {rank && (
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: r.statut === "ACCEPTEE" ? "#10b981" : "#b51200",
                color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {rank}
              </div>
            )}
            <BookOutlined style={{ color: r.statut === "ACCEPTEE" ? "#10b981" : "#b51200" }} />
            <Text strong style={{ fontSize: 13 }}>{r.formation_titre}</Text>
          </Space>
          <Space size={4}>
            {r.statut === "ACCEPTEE" && <Tag color="green">Acceptée</Tag>}
            {r.statut === "IGNOREE" && <Tag>Ignorée</Tag>}
            {r.formation_type && (
              <Tag color={TYPE_COLOR[r.formation_type] ?? "default"} style={{ margin: 0 }}>
                {r.formation_type}
              </Tag>
            )}
          </Space>
        </Space>

        {/* Score global */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 2 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Score de pertinence</Text>
            <Text style={{ fontSize: 11, fontWeight: 600 }}>{Math.round(r.score_global * 100)}%</Text>
          </Space>
          <PredictionScoreBar value={r.score_global} size="small" showPct={false} />
        </div>

        {/* Probabilité de réussite */}
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Tooltip title="Probabilité de compléter cette formation avec succès">
            <Space size={4}>
              <CheckCircleOutlined style={{ color: "#10b981" }} />
              <Text style={{ fontSize: 12 }}>Probabilité de réussite</Text>
            </Space>
          </Tooltip>
          <Text strong style={{ color: "#10b981", fontSize: 13 }}>
            {Math.round(r.probabilite_reussite * 100)}%
          </Text>
        </Space>

        {r.justification && (
          <Paragraph
            type="secondary"
            style={{
              fontSize: 11,
              marginBottom: 0,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {r.justification}
          </Paragraph>
        )}

        {/* Boutons accepter/rejeter */}
        {isProposed && onStatusChange && (
          <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 4 }} size={8}>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => onStatusChange(r.id, "IGNOREE")}
              disabled={updating}
            >
              Ignorer
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => onStatusChange(r.id, "ACCEPTEE")}
              disabled={updating}
              style={{ background: "#10b981", borderColor: "#10b981" }}
            >
              Accepter
            </Button>
          </Space>
        )}
      </Space>
    </Card>
  );
});

export default RecommendationCard;




