import { Card, Row, Col, Typography, Statistic, Space } from "antd";
import { CheckCircleOutlined, TeamOutlined, BookOutlined, TrophyOutlined } from "@ant-design/icons";

const { Title } = Typography;

function Tests() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Tableau de bord</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Formations" value={42} prefix={<BookOutlined />} valueStyle={{ color: "#B51200" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Enseignants" value={156} prefix={<TeamOutlined />} valueStyle={{ color: "#1890FF" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Certifiés" value={89} prefix={<TrophyOutlined />} valueStyle={{ color: "#52C41A" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Actifs" value={12} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#722ED1" }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Tests;