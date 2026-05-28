import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Typography, Tag } from "antd";
import { motion } from "framer-motion";
import {
  BarChartOutlined, FormOutlined, TeamOutlined, ApartmentOutlined,
  ReadOutlined, TrophyOutlined, RobotOutlined, FileTextOutlined,
  SafetyCertificateOutlined, CalendarOutlined, SearchOutlined,
  PlusCircleOutlined, UserOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/auth/useAuth";

const { Title, Text } = Typography;

const normalizeRole = (value: any) =>
  String(value || "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");

const ROLE_LABELS = {
  admin:              "Administrateur",
  cup:                "CUP",
  enseignant:         "Enseignant",
  formateur:          "Formateur",
  responsabledossier: "Responsable Dossier",
  chefdepartement:    "Chef de Département",
};

const CARDS_BY_ROLE = {
  admin: [
    { title: "Tableau de Bord KPI",      icon: BarChartOutlined,         color: "#B51200", path: "/home/KPI" },
    { title: "Gestion Formations",        icon: FormOutlined,              color: "#1890ff", path: "/home/Formation" },
    { title: "Annuaire Enseignants",      icon: TeamOutlined,              color: "#52c41a", path: "/home/Enseignants" },
    { title: "Référentiel Compétences",   icon: ApartmentOutlined,         color: "#722ed1", path: "/home/competences" },
    { title: "Besoins en Formation",      icon: ReadOutlined,              color: "#fa8c16", path: "/home/besoins" },
    { title: "Évaluations",              icon: TrophyOutlined,            color: "#13c2c2", path: "/home/Evaluations" },
    { title: "Analyse Prédictive",        icon: RobotOutlined,             color: "#eb2f96", path: "/home/AnalysePredictive" },
    { title: "Certifications",            icon: SafetyCertificateOutlined, color: "#faad14", path: "/home/certificate" },
  ],
  cup: [
    { title: "Évaluations",              icon: TrophyOutlined,            color: "#13c2c2", path: "/home/Evaluations" },
    { title: "Référentiel Compétences",   icon: ApartmentOutlined,         color: "#722ed1", path: "/home/competences" },
    { title: "Besoins en Formation",      icon: ReadOutlined,              color: "#fa8c16", path: "/home/besoins" },
    { title: "Sessions d'Animation",      icon: CalendarOutlined,          color: "#1890ff", path: "/home/animateur-formations" },
    { title: "Analyse Prédictive",        icon: RobotOutlined,             color: "#eb2f96", path: "/home/AnalysePredictive" },
    { title: "Mes Inscriptions",          icon: FileTextOutlined,          color: "#52c41a", path: "/home/ListeFormation" },
  ],
  enseignant: [
    { title: "Référentiel Compétences",   icon: ApartmentOutlined,         color: "#722ed1", path: "/home/competences" },
    { title: "Déposer un Besoin",         icon: PlusCircleOutlined,        color: "#fa8c16", path: "/home/besoins/ajouter" },
    { title: "Mes Inscriptions",          icon: FileTextOutlined,          color: "#1890ff", path: "/home/ListeFormation" },
    { title: "Mes Certificats",           icon: SafetyCertificateOutlined, color: "#52c41a", path: "/home/MyCertificate" },
    { title: "Sessions d'Animation",      icon: CalendarOutlined,          color: "#B51200", path: "/home/animateur-formations" },
  ],
  formateur: [
    { title: "Sessions d'Animation",      icon: CalendarOutlined,          color: "#B51200", path: "/home/animateur-formations" },
    { title: "Mes Inscriptions",          icon: FileTextOutlined,          color: "#1890ff", path: "/home/ListeFormation" },
    { title: "Mon Profil",                icon: UserOutlined,              color: "#52c41a", path: "/home/profile" },
  ],
  responsabledossier: [
    { title: "Catalogue Formations",      icon: SearchOutlined,            color: "#1890ff", path: "/home/Formation/Consulter" },
    { title: "Dossiers de Formation",     icon: FileTextOutlined,          color: "#B51200", path: "/home/File" },
  ],
  chefdepartement: [
    { title: "Catalogue Formations",      icon: SearchOutlined,            color: "#1890ff", path: "/home/Formation/Consulter" },
    { title: "Dossiers de Formation",     icon: FileTextOutlined,          color: "#B51200", path: "/home/File" },
    { title: "Calendrier Global",         icon: CalendarOutlined,          color: "#52c41a", path: "/home/Calendrier" },
    { title: "Analyse Prédictive",        icon: RobotOutlined,             color: "#eb2f96", path: "/home/AnalysePredictive" },
  ],
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
};

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 22, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function Home() {
  const { user } = useAuth() as any;
  const navigate  = useNavigate();
  const roleKey   = normalizeRole(user?.role);
  const cards     = useMemo(() => (CARDS_BY_ROLE as any)[roleKey] ?? [], [roleKey]);
  const roleLabel = (ROLE_LABELS as any)[roleKey] ?? user?.role ?? "";
  const displayName = user?.username ?? user?.name ?? "Utilisateur";

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1280, margin: "0 auto" }}>

      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          background: "linear-gradient(135deg, #8b0000 0%, #B51200 55%, #c94010 100%)",
          borderRadius: 16,
          padding: "28px 36px",
          marginBottom: 32,
          color: "#fff",
        }}
      >
        <Tag
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff",
            borderRadius: 20,
            padding: "2px 14px",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 14,
            display: "inline-block",
          }}
        >
          {roleLabel}
        </Tag>

        <Title
          level={2}
          style={{
            color: "#fff",
            margin: "0 0 8px",
            fontWeight: 800,
            fontSize: 28,
          }}
        >
          {greeting()}, {displayName} !
        </Title>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 15 }}>
          Que souhaitez-vous faire aujourd'hui ?
        </Text>
      </motion.div>

      {/* ── Cards Grid ── */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Row gutter={[20, 20]}>
          {cards.map((card: any) => {
            const Icon = card.icon;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={card.path}>
                <motion.div variants={cardVariants as any} style={{ height: "100%" }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(card.path)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(card.path); } }}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      border: "1px solid rgba(0,0,0,0.05)",
                      padding: "28px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 14,
                      transition: "box-shadow 0.25s, transform 0.25s",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = `0 16px 40px ${card.color}22`;
                      e.currentTarget.style.borderColor = `${card.color}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "";
                      e.currentTarget.style.borderColor = "rgba(0,0,0,0.05)";
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 18,
                        background: `${card.color}12`,
                        border: `1.5px solid ${card.color}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ fontSize: 28, color: card.color }} />
                    </div>

                    <Text
                      strong
                      style={{
                        fontSize: 14,
                        color: "#2d3748",
                        lineHeight: 1.4,
                        display: "block",
                      }}
                    >
                      {card.title}
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        color: card.color,
                        fontWeight: 600,
                        opacity: 0.7,
                      }}
                    >
                      Accéder <ArrowRightOutlined style={{ fontSize: 10 }} />
                    </div>
                  </div>
                </motion.div>
              </Col>
            );
          })}
        </Row>
      </motion.div>
    </div>
  );
}




