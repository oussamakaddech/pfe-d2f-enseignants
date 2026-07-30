import { useMemo } from "react";
import { List, Card, Tag, Progress, Typography, Empty } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ArrowRightOutlined } from "@ant-design/icons";
import type { Recommendation } from "@/models/analyse/analyticsFeature";

interface RecommendationsListProps {
  readonly recommendations: Recommendation[];
  readonly loading?: boolean;
  readonly onAccept?: (id: number) => void;
  readonly onReject?: (id: number) => void;
}

/** Liste des recommandations de formation classées par pertinence. */
export default function RecommendationsList({
  recommendations,
  loading,
  onAccept,
  onReject,
}: RecommendationsListProps) {
  const items = useMemo(() => recommendations, [recommendations]);

  if (!loading && items.length === 0) {
    return <Empty description="Aucune recommandation" />;
  }

  return (
    <List
      loading={loading}
      itemLayout="vertical"
      dataSource={items}
      renderItem={(r) => (
        <List.Item key={r.id}>
          <Card size="small" style={{ width: "100%", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <Typography.Text strong>{r.formation_titre}</Typography.Text>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                  {r.competence_nom ?? "—"} · rang {r.rang_dans_parcours}
                </div>
              </div>
              <Tag color="geekblue">score {r.score_global.toFixed(2)}</Tag>
            </div>
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={Math.round(r.probabilite_reussite * 100)}
                size="small"
                status="active"
                format={(p) => `réussite ${p}%`}
              />
            </div>
            <div style={{ marginTop: 6 }}>
              {r.est_prerequis && <Tag color="gold">prérequis</Tag>}
              {!r.prerequis_satisfaits && <Tag color="red">prérequis manquants</Tag>}
              {r.statut === "ACCEPTEE" && (
                <Tag color="green" icon={<CheckCircleOutlined />}>acceptée</Tag>
              )}
              {r.statut === "IGNOREE" && (
                <Tag color="default" icon={<CloseCircleOutlined />}>ignorée</Tag>
              )}
            </div>
            {r.justification && (
              <Typography.Paragraph type="secondary" style={{ marginTop: 6, fontSize: 13 }}>
                {r.justification}
              </Typography.Paragraph>
            )}
            {onAccept && onReject && r.statut === "PROPOSÉE" && (
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button type="button" onClick={() => onAccept(r.id)}>Accepter</button>
                <button type="button" onClick={() => onReject(r.id)}>Ignorer</button>
              </div>
            )}
          </Card>
        </List.Item>
      )}
    />
  );
}
