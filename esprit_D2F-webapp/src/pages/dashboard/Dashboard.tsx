import { Card, Row, Col, Statistic, Typography } from "antd";
import { BarChartOutlined, TeamOutlined, BookOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Title } = Typography;

export default function Dashboard() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Tableau de bord</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Formations" value={0} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Enseignants" value={0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Terminées" value={0} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Indicateurs" value={0} prefix={<BarChartOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
