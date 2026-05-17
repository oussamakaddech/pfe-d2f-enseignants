import { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Typography, Tag, Skeleton, Alert } from "antd";
import { motion } from "framer-motion";
import {
  BarChartOutlined, FormOutlined, TeamOutlined, ApartmentOutlined,
  ReadOutlined, TrophyOutlined, RobotOutlined, FileTextOutlined,
  SafetyCertificateOutlined, CalendarOutlined, SearchOutlined,
  PlusCircleOutlined, UserOutlined, ArrowRightOutlined,
  ClockCircleOutlined, CheckCircleOutlined, RiseOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import KPIService from "../../services/KPIService";
import BesoinFormationService from "../../services/BesoinFormationService";
import FormationService from "../../services/FormationService";
import { D2FDataCard, D2FSection } from "../../components/ui";
import "./Home.css";

const { Title, Text } = Typography;

const normalizeRole = (value: string) =>
  String(value || "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");

const ROLE_LABELS: Record<string, string> = {
  admin:              "Administrateur",
  cup:                "CUP",
  enseignant:         "Enseignant",
  formateur:          "Formateur",
  responsabledossier: "Responsable Dossier",
  chefdepartement:    "Chef de Département",
};

const CARDS_BY_ROLE: Record<string, Array<{ title: string; icon: any; color: string; path: string }>> = {
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
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function Home() {
  const { user } = useContext(AuthContext) || { user: null };
  const navigate = useNavigate();
  const roleKey = normalizeRole(user?.role || "");
  const cards = useMemo(() => CARDS_BY_ROLE[roleKey] ?? [], [roleKey]);
  const roleLabel = ROLE_LABELS[roleKey] ?? user?.role ?? "";
  const displayName = user?.username ?? user?.name ?? "Utilisateur";
  const isAdmin = roleKey === "admin";

  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [totalFormations, setTotalFormations] = useState(0);
  const [totalHeures, setTotalHeures] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [besoinsEnAttente, setBesoinsEnAttente] = useState(0);
  const [formationsEnCours, setFormationsEnCours] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      setKpiLoading(true);
      setKpiError(null);
      try {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];

        const [formationsCount, heures, participants, besoins] = await Promise.allSettled([
          KPIService.getTotalFormations(startOfYear, endOfYear),
          KPIService.getTotalHeures(startOfYear, endOfYear),
          KPIService.getUniqueParticipants(startOfYear, endOfYear),
          isAdmin ? BesoinFormationService.getAllBesoinFormations() : Promise.resolve([]),
        ]);

        if (formationsCount.status === "fulfilled") setTotalFormations(formationsCount.value);
        if (heures.status === "fulfilled") setTotalHeures(heures.value);
        if (participants.status === "fulfilled") setTotalParticipants(participants.value);
        if (besoins.status === "fulfilled" && isAdmin) {
          const besoinsArray = Array.isArray(besoins.value) ? besoins.value : ((besoins.value as any)?.content || []);
          setBesoinsEnAttente(besoinsArray.filter((b: any) => !b.approuveAdmin).length);
        }

        try {
          const allFormations = await FormationService.getAllFormations();
          const formationsArray = Array.isArray(allFormations) ? allFormations : (allFormations?.content || []);
          setFormationsEnCours(formationsArray.filter((f: any) =>
            f.etat === "EN_COURS" || f.status === "EN_COURS"
          ).length);
        } catch {
          setFormationsEnCours(0);
        }
      } catch {
        setKpiError("Impossible de charger les données du tableau de bord.");
      } finally {
        setKpiLoading(false);
      }
    }

    loadDashboardData();
  }, [isAdmin]);

  const quickStats = [
    { icon: <FormOutlined />, label: "Formations", value: totalFormations, color: "var(--primary-500)", bg: "var(--primary-50)", href: "/home/Formation/Consulter" },
    { icon: <ClockCircleOutlined />, label: "Heures de formation", value: totalHeures, unit: "h", color: "var(--color-info)", bg: "var(--color-info-bg)", href: "/home/KPI" },
    { icon: <TeamOutlined />, label: "Participants", value: totalParticipants, color: "var(--color-success)", bg: "var(--color-success-bg)", href: "/home/Enseignants" },
    { icon: <RiseOutlined />, label: "En cours", value: formationsEnCours, color: "var(--color-warning)", bg: "var(--color-warning-bg)", href: "/home/KPI" },
  ];

  if (isAdmin) {
    quickStats.push({
      icon: <ReadOutlined />,
      label: "Besoins en attente",
      value: besoinsEnAttente,
      color: "#eb2f96",
      bg: "var(--neutral-50)",
      href: "/home/besoins",
    });
  }

  return (
    <div className="home-page">

      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="home-hero"
      >
        <Tag className="home-hero-tag">
          {roleLabel}
        </Tag>

        <Title level={2} className="home-hero-title">
          {`${greeting()}, ${displayName} !`}
        </Title>
        <Text className="home-hero-subtitle">
          Voici un aperçu de votre activité. Que souhaitez-vous faire aujourd'hui ?
        </Text>
      </motion.div>

      {kpiError && (
        <Alert
          message="Données indisponibles"
          description={kpiError}
          type="warning"
          showIcon
          closable
          className="home-alert"
        />
      )}

      <Row gutter={[16, 16]} className="home-stats-row">
        {quickStats.map((stat, i) => (
          <Col xs={12} sm={8} md={6} lg={4} key={stat.label}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <D2FDataCard
                icon={stat.icon}
                iconColor={stat.color}
                label={stat.label}
                value={kpiLoading ? <Skeleton.Input active size="small" style={{ width: 50, height: 28 }} /> : stat.value}
                unit={stat.unit}
                accentColor={stat.color}
                href={stat.href}
              />
            </motion.div>
          </Col>
        ))}
      </Row>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Row gutter={[20, 20]}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={card.path}>
                <motion.div variants={cardVariants} style={{ height: "100%" }}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="home-shortcut-card"
                    onClick={() => navigate(card.path)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(card.path); } }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${card.color}30`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "";
                    }}
                  >
                    <div
                      className="home-shortcut-icon-wrap"
                      style={{
                        background: `${card.color}12`,
                        border: `1.5px solid ${card.color}22`,
                      }}
                    >
                      <Icon style={{ fontSize: 28, color: card.color }} />
                    </div>

                    <Text strong className="home-shortcut-title">
                      {card.title}
                    </Text>

                    <div className="home-shortcut-link" style={{ color: card.color }}>
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
