import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Button } from "antd";
import { RocketOutlined, RightOutlined } from "@ant-design/icons";
import { InfoCard } from "@/components/ui";
import DashboardPendingNeeds from "@/components/dashboard/DashboardPendingNeeds";
import DashboardUpcomingFormations from "@/components/dashboard/DashboardUpcomingFormations";
import { rangeToDates } from "./dashboardRanges";
import type { DashboardScope } from "@/models/dashboard";
import "@/styles/pages/dashboard-page.css";

const SUBTITLE: Record<string, string> = {
  enseignant: "Vue personnalisée de votre développement",
  animateur: "Vue de vos formations et participations",
};

/**
 * Scaffold v1 des vues personnelles (ENSEIGNANT / ANIMATEUR).
 * Affiche déjà des widgets réels scopés à l'utilisateur ; les vues complètes
 * (mes compétences, progression de niveau, recommandations, gaps) arrivent en
 * itération suivante.
 */
export default function PersonalDashboard({ role }: { readonly role: string }) {
  const navigate = useNavigate();
  const scope = useMemo<DashboardScope>(() => {
    const { start, end } = rangeToDates("12m");
    return {
      role, isAdmin: false, isCup: false,
      isEnseignant: role === "enseignant", isAnimateur: role === "animateur",
      start, end, rangeKey: "12m",
    };
  }, [role]);

  return (
    <div className="dash-container">
      <header className="dash-header">
        <div className="dash-header-titles">
          <h1 className="dash-header-title">Tableau de bord</h1>
          <span className="dash-header-subtitle">{SUBTITLE[role] ?? SUBTITLE.enseignant}</span>
        </div>
      </header>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}><DashboardUpcomingFormations /></Col>
        <Col xs={24} lg={12}><DashboardPendingNeeds scope={scope} /></Col>
      </Row>

      <InfoCard title="Votre espace personnel s'enrichit" icon={<RocketOutlined />}>
        <p style={{ marginTop: 0, color: "var(--neutral-600)" }}>
          Bientôt ici : vos compétences et leur progression (niveaux 1–5), vos formations suivies,
          vos recommandations de parcours et vos écarts de compétences.
        </p>
        <Button type="primary" onClick={() => navigate("/home/competences")}>
          Voir mes compétences <RightOutlined />
        </Button>
      </InfoCard>
    </div>
  );
}
