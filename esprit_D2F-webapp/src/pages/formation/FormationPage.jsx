import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Typography } from "antd";
import {
  PlusCircleOutlined,
  SearchOutlined,
  FormOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export default function FormationPage() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Créer une Formation",
      description:
        "Planifiez et créez une nouvelle formation : définissez le titre, les dates, les séances, les animateurs et les participants.",
      icon: <PlusCircleOutlined style={{ fontSize: 48, color: "#B51200" }} />,
      path: "/home/Formation/Creer",
      color: "#B51200",
      bg: "#FFF5F5",
    },
    {
      title: "Consulter les Formations",
      description:
        "Recherchez, filtrez et consultez la liste des formations existantes. Modifiez, supprimez ou exportez les données.",
      icon: <SearchOutlined style={{ fontSize: 48, color: "#1890ff" }} />,
      path: "/home/Formation/Consulter",
      color: "#1890ff",
      bg: "#F0F5FF",
    },
  ];

  return (
    <div
      style={{
        padding: "40px 24px",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <FormOutlined
          style={{ fontSize: 40, color: "#B51200", marginBottom: 12 }}
        />
        <Title level={3} style={{ marginBottom: 4 }}>
          Gestion des Formations
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16 }}>
          Choisissez une action pour continuer
        </Paragraph>
      </div>

      <Row gutter={[32, 32]} justify="center">
        {cards.map((c) => (
          <Col xs={24} sm={12} key={c.path}>
            <Card
              hoverable
              onClick={() => navigate(c.path)}
              style={{
                borderRadius: 16,
                border: `2px solid transparent`,
                height: "100%",
                transition: "all 0.3s ease",
                cursor: "pointer",
                textAlign: "center",
                padding: "16px 8px",
              }}
              styles={{
                body: { padding: "32px 24px" },
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = c.color;
                e.currentTarget.style.boxShadow = `0 8px 24px ${c.color}33`;
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  background: c.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                {c.icon}
              </div>
              <Title level={4} style={{ color: c.color, marginBottom: 8 }}>
                {c.title}
              </Title>
              <Paragraph
                type="secondary"
                style={{ fontSize: 14, lineHeight: 1.6 }}
              >
                {c.description}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}