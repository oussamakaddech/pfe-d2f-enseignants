import { useNavigate } from "react-router-dom";
import { Row, Col, Typography, Badge } from "antd";
import {
  PlusCircleOutlined,
  SearchOutlined,
  FormOutlined,
  FolderOpenOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import AppPageHeader from "@/components/common/AppPageHeader";
import "@/styles/pages/formation-page.css";

const { Title, Paragraph, Text } = Typography;

export default function FormationPage() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Nouvelle Formation",
      description:
        "Planifiez et créez une nouvelle formation : définissez le titre, les dates, les séances, les animateurs et les participants.",
      icon: <PlusCircleOutlined />,
      path: "/home/Formation/Creer",
      color: "var(--primary-500)",
      gradient: "var(--btn-primary-gradient)",
      bg: "var(--primary-50)",
      badge: "Nouveau",
    },
    {
      title: "Catalogue",
      description:
        "Recherchez, filtrez et consultez la liste des formations existantes. Modifiez, supprimez ou exportez les données.",
      icon: <SearchOutlined />,
      path: "/home/Formation/Consulter",
      color: "var(--color-info)",
      gradient: "linear-gradient(135deg, var(--color-info) 0%, #1d4ed8 100%)",
      bg: "var(--color-info-bg)",
      badge: "Consulter",
    },
    {
      title: "Gestion Documentaire",
      description:
        "Parcourez l'arborescence des dossiers et documents de chaque formation sur OneDrive.",
      icon: <FolderOpenOutlined />,
      path: "/home/File",
      color: "var(--color-success)",
      gradient: "var(--btn-success-gradient)",
      bg: "var(--color-success-bg)",
      badge: "Explorer",
    },
  ];

  return (
    <div className="formation-page">
      <AppPageHeader
        icon={<FormOutlined />}
        title="Gestion des Formations"
        subtitle="Créer, consulter et gérer les formations et leurs documents"
      />

      <Row gutter={[28, 28]} justify="center" className="formation-cards-row">
        {cards.map((c) => (
          <Col xs={24} sm={12} md={8} key={c.path}>
            <button
              type="button"
              className="formation-action-card"
              onClick={() => navigate(c.path)}
            >
              <div
                className="formation-action-card-icon"
                style={{ background: c.gradient }}
              >
                <span style={{ fontSize: 36, color: "var(--text-on-dark)" }}>
                  {c.icon}
                </span>
              </div>
              <Badge
                count={c.badge}
                className="formation-action-badge"
                style={{
                  backgroundColor: c.bg,
                  color: c.color,
                }}
              />
              <Title level={4} className="formation-action-title">
                {c.title}
              </Title>
              <Paragraph className="formation-action-desc">
                {c.description}
              </Paragraph>
              <div
                className="formation-action-card-btn"
                style={{ color: c.color }}
              >
                <Text style={{ color: c.color, fontWeight: 600, fontSize: 13 }}>
                  Accéder
                </Text>
                <ArrowRightOutlined style={{ fontSize: 12 }} />
              </div>
            </button>
          </Col>
        ))}
      </Row>
    </div>
  );
}







