import { Empty, Row, Col, Tag, Typography, Progress, Alert, Space } from "antd";
import { BulbOutlined, HistoryOutlined } from "@ant-design/icons";
import { AnalyseRecommandation } from "@/services/analyse/AnalysePredictiveService";

const { Text } = Typography;

interface Props {
  steps: AnalyseRecommandation[];
}

export default function PathTimeline({ steps }: Props) {
  if (!steps || steps.length === 0) {
    return <Empty description="Spécifiez une compétence cible pour générer un parcours." />;
  }

  return (
    <div className="reco-timeline">
      {steps.map((step, idx) => (
        <div key={idx} className="reco-step">
          <div className="reco-step-number">{step.ordre}</div>
          <div className="reco-content">
            <Row justify="space-between" align="middle">
              <Col>
                <div className="reco-title">{step.titre}</div>
                <Space wrap>
                  {step.competencesCiblees.map((c) => <Tag key={c} color="blue">{c}</Tag>)}
                  <Tag icon={<HistoryOutlined />}>{step.dureeEstimee}</Tag>
                </Space>
              </Col>
              <Col>
                <div style={{ textAlign: "right" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Probabilité réussite</Text>
                  <Progress
                    percent={Math.round(step.probabiliteReussite * 100)}
                    size="small"
                    strokeColor={step.probabiliteReussite > 0.8 ? "#10b981" : "#f59e0b"}
                  />
                </div>
              </Col>
            </Row>
            {step.prerequisManquants?.length > 0 && (
              <Alert
                type="warning"
                message={`Prérequis manquants: ${step.prerequisManquants.join(", ")}`}
                style={{ marginTop: 8, borderRadius: 6 }}
                showIcon
              />
            )}
            <div style={{ marginTop: 8, padding: 8, background: "#f8fafc", borderRadius: 6 }}>
              <Text style={{ fontSize: 13 }}>
                <BulbOutlined style={{ marginRight: 6 }} />
                {step.justification}
              </Text>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
