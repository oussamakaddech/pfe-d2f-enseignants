import { Card, Row, Col, Statistic, Tag, Progress } from "antd";
import { FallOutlined, RiseOutlined, WarningOutlined } from "@ant-design/icons";
import {
  DecliningCompetency,
  InDemandCompetency,
  TeacherRiskIndicator,
} from "@/services/analyse/AnalysePredictiveService";

interface Props {
  declining: DecliningCompetency[];
  inDemand: InDemandCompetency[];
  riskIndicators: TeacherRiskIndicator[];
  riskThreshold: number;
}

export default function DashboardKpis({
  declining,
  inDemand,
  riskIndicators,
  riskThreshold,
}: Props) {
  const atRiskCount = riskIndicators.filter((r) => r.attrition_risk_score >= riskThreshold).length;

  return (
    <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card
          className="analyse-card analyse-stat-card d2f-hover-lift"
          style={{ borderTop: "3px solid #ef4444" }}
        >
          <Statistic
            title="Compétences en Déclin"
            value={declining.length}
            prefix={<FallOutlined style={{ color: "#ef4444" }} />}
            valueStyle={{ color: "#ef4444" }}
          />
          <div style={{ marginTop: 12 }}>
            {declining.slice(0, 5).map((c, i) => (
              <Tag key={i} color="red" style={{ marginBottom: 4 }}>
                {c.competency_name}
              </Tag>
            ))}
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card
          className="analyse-card analyse-stat-card d2f-hover-lift"
          style={{ borderTop: "3px solid #10b981" }}
        >
          <Statistic
            title="En Forte Demande"
            value={inDemand.length}
            prefix={<RiseOutlined style={{ color: "#10b981" }} />}
            valueStyle={{ color: "#10b981" }}
          />
          <div style={{ marginTop: 12 }}>
            {inDemand.slice(0, 5).map((c, i) => (
              <Tag key={i} color="green" style={{ marginBottom: 4 }}>
                {c.competency_name}
              </Tag>
            ))}
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card
          className="analyse-card analyse-stat-card d2f-hover-lift"
          style={{ borderTop: "3px solid #f59e0b" }}
        >
          <Statistic
            title="Enseignants à Risque"
            value={atRiskCount}
            prefix={<WarningOutlined style={{ color: "#f59e0b" }} />}
            valueStyle={{ color: "#f59e0b" }}
            suffix={`/ ${riskIndicators.length}`}
          />
          <Progress
            percent={riskIndicators.length ? Math.round((atRiskCount / riskIndicators.length) * 100) : 0}
            strokeColor="#f59e0b"
            style={{ marginTop: 12 }}
          />
        </Card>
      </Col>
    </Row>
  );
}
