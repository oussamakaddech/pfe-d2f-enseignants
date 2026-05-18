import { useState, useContext, useMemo, memo, Suspense, useEffect } from "react";
import { Layout, Dropdown, Avatar, Space, Button, Breadcrumb, Badge, Tooltip, Row, Col, Skeleton, Input, Spin } from "antd";
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
  LogoutOutlined, ArrowLeftOutlined, HomeOutlined, BellOutlined,
  SearchOutlined, LoadingOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SideMenu from "./SideMenu";
import { AuthContext } from "../context/AuthContext";
import "./AppLayout.css";

const { Header, Sider, Content } = Layout;
const HEADER_HEIGHT = 64;

const ROUTE_LABELS: Record<string, string> = {
  home:                   "Accueil",
  Formation:              "Formations",
  Creer:                  "Nouvelle formation",
  Consulter:              "Catalogue",
  accounts:               "Gestion des comptes",
  Enseignants:            "Enseignants",
  enseignant:             "Enseignant",
  KPI:                    "KPI & Métriques",
  AnalysePredictive:      "Analyse prédictive",
  analytics:              "Analytique",
  dashboard:              "Tableau de bord",
  teacher:                "Enseignant",
  alerts:                 "Alertes",
  competences:            "Compétences",
  competence:             "Compétences",
  besoins:                "Besoins en formation",
  ajouter:                "Ajouter",
  Evaluations:            "Évaluations",
  profile:                "Mon profil",
  "edit-profile":         "Modifier le profil",
  "update-password":      "Mot de passe",
  certificate:            "Certifications",
  Calendrier:             "Calendrier",
  calendar:               "Calendrier",
  "animateur-formations": "Sessions d'animation",
  affectations:           "Affectations",
  rice:                   "RICE",
  matchmaking:            "Matchmaking IA",
  "competence-matching":  "Correspondance",
  File:                   "Gestion documentaire",
  UpDept:                 "Structures",
  ListeFormation:         "Inscriptions",
  MyCertificate:          "Mes certificats",
  register:               "Inscription",
  test:                   "Tests",
  "skill-passport":       "Skill Passport",
  "password-recovery":    "Récupération mot de passe",
};

const BACK_CONTEXT: Record<string, string> = {
  "/home/competences": "Compétences",
  "/home/rice":        "RICE",
  "/home":             "Accueil",
};

function getBackTarget(currentPath: string) {
  if (currentPath.startsWith("/home/competences/enseignant/")) return "/home/competences";
  if (currentPath.startsWith("/home/rice/matchmaking") ||
      currentPath.startsWith("/home/rice/competence-matching"))  return "/home/rice";
  if (currentPath.startsWith("/home/affectations"))              return "/home/competences";
  if (["/home/profile", "/home/edit-profile", "/home/update-password",
       "/home/skill-passport"].includes(currentPath))            return "/home";
  return "/home";
}

const headerStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, height: HEADER_HEIGHT,
  padding: "0 20px", display: "flex", alignItems: "center", gap: 12,
  background: "var(--header-gradient)",
  boxShadow: "var(--header-shadow)",
  zIndex: 1000,
};

const logoStyle: React.CSSProperties = {
  height: 36, background: "var(--neutral-0)", borderRadius: 8, padding: "3px 8px",
  boxShadow: "var(--shadow-xs)", transition: "transform 0.2s ease",
};

const stickyBarStyle: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 10,
  background: "var(--stickybar-bg)",
  backdropFilter: "var(--stickybar-blur)",
  WebkitBackdropFilter: "var(--stickybar-blur)",
  borderBottom: "1px solid var(--stickybar-border)",
  display: "flex", alignItems: "center", padding: "0 28px",
  height: 44,
  gap: 12,
};

function ContentSkeleton() {
  return (
    <div style={{ padding: 28 }}>
      <Skeleton.Input active style={{ width: 300, height: 28, marginBottom: 24, display: "block" }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Skeleton.Node active style={{ width: "100%", height: 110, borderRadius: 14, display: "block" }} />
          </Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const { user, logout } = useContext(AuthContext) || { user: null, logout: () => {} };
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const siderWidth = collapsed ? 80 : 260;

  useEffect(() => {
    setPageLoading(true);
    const timer = setTimeout(() => setPageLoading(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) return [];
    return segments.slice(1).map((seg, i, arr) => {
      const path = "/" + arr.slice(0, i + 1).join("/");
      const label = ROUTE_LABELS[seg] ?? seg;
      const isLast = i === arr.length - 1;
      return {
        title: isLast
          ? <span style={{ color: "var(--breadcrumb-active)", fontWeight: 600, fontSize: 13 }}>{label}</span>
          : <Link to={path} style={{ color: "var(--breadcrumb-link)", fontSize: 13, fontWeight: 500 }}>{label}</Link>,
      };
    });
  }, [pathname]);

  const avatarMenu = useMemo(() => [
    { key: "profile", label: "Mon profil", icon: <UserOutlined />, onClick: () => navigate("/home/profile") },
    { key: "passport", label: "Skill Passport", icon: <HomeOutlined />, onClick: () => navigate("/home/skill-passport") },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      danger: true,
      label: "Déconnexion",
      onClick: () => { logout(); navigate("/"); },
    },
  ], [navigate, logout]);

  const backTarget = useMemo(() => getBackTarget(pathname), [pathname]);
  const backLabel = useMemo(() => BACK_CONTEXT[backTarget] ?? "Retour", [backTarget]);
  const goBack = useMemo(() => () => navigate(backTarget, { replace: true }), [backTarget, navigate]);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header style={headerStyle}>
        <Tooltip title={collapsed ? "Ouvrir le menu" : "Fermer le menu"} placement="bottomLeft">
          <div
            role="button" tabIndex={0}
            onClick={() => setCollapsed(!collapsed)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCollapsed(!collapsed); }}
            className="app-header-icon-btn"
            aria-label={collapsed ? "Ouvrir le menu" : "Fermer le menu"}
          >
            {collapsed
              ? <MenuUnfoldOutlined style={{ fontSize: 18, color: "var(--text-on-dark)" }} />
              : <MenuFoldOutlined style={{ fontSize: 18, color: "var(--text-on-dark)" }} />}
          </div>
        </Tooltip>

        <Link to="/home" style={{ margin: "0 12px", display: "flex" }}>
          <img src="/assets/img/logo/esprit.png" alt="ESPRIT" style={logoStyle} />
        </Link>

        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", margin: "0 8px" }} />

        <Tooltip title="Notifications">
          <div className="app-header-icon-btn" aria-label="Notifications">
            <Badge dot color="#f59e0b" offset={[-2, 2]}>
              <BellOutlined style={{ fontSize: 17, color: "var(--text-on-dark)" }} />
            </Badge>
          </div>
        </Tooltip>

        <div style={{ flex: 1 }} />

        {pageLoading && (
          <Spin indicator={<LoadingOutlined style={{ color: "rgba(255,255,255,0.65)", fontSize: 16 }} spin />} size="small" />
        )}

        <Dropdown menu={{ items: avatarMenu }} placement="bottomRight" trigger={["click"]}>
          <div className="app-header-user-trigger">
            <Avatar
              icon={<UserOutlined />}
              size={34}
              style={{ background: "var(--header-avatar-bg)", color: "var(--text-on-dark)", border: "var(--header-avatar-border)" }}
            />
            <span className="app-header-username">
              {user?.username ?? "Utilisateur"}
            </span>
          </div>
        </Dropdown>
      </Header>

      <Layout style={{ paddingTop: HEADER_HEIGHT }}>
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          width={260} collapsedWidth={80} trigger={null}
          style={{
            position: "fixed", top: HEADER_HEIGHT, bottom: 0, left: 0,
            overflow: "hidden", background: "var(--bg-sidebar)",
            boxShadow: "var(--sidebar-shadow)", zIndex: 10,
            transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <SideMenu collapsed={collapsed} />
        </Sider>

        <Layout style={{
          marginLeft: siderWidth,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Content id="main-content" role="main" tabIndex={-1} style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            <div style={stickyBarStyle}>
              <Button
                type="text" icon={<ArrowLeftOutlined />} onClick={goBack}
                size="small"
                style={{ color: "#718096", fontWeight: 500, fontSize: 13, paddingInline: 8 }}
              >
                {backLabel}
              </Button>
              <div style={{ width: 1, height: 14, background: "rgba(0,0,0,0.08)", margin: "0 2px" }} />
              <HomeOutlined style={{ color: "#cbd5e0", fontSize: 12 }} />
              <Breadcrumb items={crumbs} separator={<span style={{ color: "#cbd5e0", margin: "0 4px" }}>/</span>} />
            </div>

            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                flex: "1 1 auto",
                overflow: "auto",
                padding: "var(--content-padding, 28px)",
                background: "var(--bg-main)",
              }}
            >
              <Suspense fallback={<ContentSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default memo(AppLayout);
