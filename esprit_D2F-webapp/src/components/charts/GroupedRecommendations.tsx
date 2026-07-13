import { useState } from "react";
import {
  Card, Row, Col, Segmented, Space, Typography, Spin, Empty, Badge, Tag, Collapse, Progress, Alert,
} from "antd";
import { GroupOutlined } from "@ant-design/icons";
import type { RecoGroupBy } from "@/models/analyse";
import { useGroupedRecommendations } from "@/hooks/analyse/useAnalytics";
import RecommendationCard from "./RecommendationCard";

const { Text } = Typography;

const GROUP_OPTIONS: { label: string; value: RecoGroupBy }[] = [
  { label: "Par compétence", value: "competence" },
  { label: "Par type", value: "type" },
  { label: "Par urgence", value: "urgence" },
];

function scoreColor(score: number): string {
  if (score >= 0.75) return "#ef4444";
  if (score >= 0.5) return "#f59e0b";
  if (score >= 0.25) return "#3b82f6";
  return "#10b981";
}

export default function GroupedRecommendations({ enseignantId }: { enseignantId: string }) {
  const [groupBy, setGroupBy] = useState<RecoGroupBy>("competence");
  const { data, isLoading, isError } = useGroupedRecommendations(enseignantId, groupBy);

  return (
    <Card
      size="small"
      title={
        <Space>
          <GroupOutlined />
          <span>Regroupement des recommandations</span>
        </Space>
      }
      extra={<Segmented options={GROUP_OPTIONS} value={groupBy} onChange={(v) => setGroupBy(v as RecoGroupBy)} />}
    >
      <Spin spinning={isLoading}>
        {isError ? (
          <Alert type="error" showIcon message="Impossible de charger le regroupement." />
        ) : !data || data.total === 0 ? (
          <Empty
            description={enseignantId ? "Aucune recommandation à regrouper" : "Entrez un identifiant enseignant"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Collapse
            defaultActiveKey={data.groups.slice(0, 3).map((g) => g.group_key)}
            items={data.groups.map((g) => ({
              key: g.group_key,
              label: (
                <Space wrap>
                  <Text strong>{g.group_label}</Text>
                  <Badge count={g.nb} showZero style={{ backgroundColor: "#b51200" }} />
                  <Tag color={scoreColor(g.score_max)}>
                    score max {Math.round(g.score_max * 100)}%
                  </Tag>
                  {g.nb_acceptees > 0 && <Tag color="green">{g.nb_acceptees} acceptée(s)</Tag>}
                </Space>
              ),
              children: (
                <div>
                  <Space style={{ marginBottom: 8 }} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Score moyen&nbsp;
                      <Progress
                        percent={Math.round(g.score_moyen * 100)}
                        size="small"
                        showInfo={false}
                        strokeColor={scoreColor(g.score_moyen)}
                        style={{ width: 80, display: "inline-block", marginRight: 6 }}
                      />
                      {Math.round(g.score_moyen * 100)}%
                    </Text>
                  </Space>
                  <Row gutter={[16, 16]}>
                    {g.items.map((r) => (
                      <Col key={r.id} xs={24} sm={12} lg={8}>
                        <RecommendationCard recommendation={r} showBreakdown />
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            }))}
          />
        )}
      </Spin>
    </Card>
  );
}
