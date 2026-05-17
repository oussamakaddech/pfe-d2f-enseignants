import { useState, useContext, useMemo, memo, Suspense } from "react";
import { Layout, Dropdown, Avatar, Space, Button, Breadcrumb, Badge, Tooltip, Row, Col, Skeleton } from "antd";
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
  LogoutOutlined, ArrowLeftOutlined, HomeOutlined, BellOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SideMenu from "./SideMenu";
import { AuthContext } from "../context/AuthContext";
import "./AppLayout.css";

const { Header, Sider, Content } = Layout;
const HEADER_HEIGHT = 64;

// ── Libellés lisibles pour chaque segment de route ──────────────────────────
const ROUTE_LABELS = {
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
};

// ── Logique du bouton Retour ─────────────────────────────────────────────────
const BACK_CONTEXT = {
  "/home/competences": "Compétences",
  "/home/rice":        "RICE",
  "/home":             "Accueil",
};

function getBackTarget(currentPath) {
  if (currentPath.startsWith("/home/competences/enseignant/")) return "/home/competences";
  if (currentPath.startsWith("/home/rice/matchmaking") ||
      currentPath.startsWith("/home/rice/competence-matching"))  return "/home/rice";
  if (currentPath.startsWith("/home/affectations"))              return "/home/competences";
  if (["/home/profile", "/home/edit-profile", "/home/update-password",
       "/home/skill-passport"].includes(currentPath))            return "/home";
  return "/home";
}

// ── Styles statiques (hors composant) ───────────────────────────────────────
const headerStyle = {
  position: "fixed", top: 0, left: 0, right: 0, height: HEADER_HEIGHT,
  padding: "0 24px", display: "flex", alignItems: "center", gap: 10,
  background: "linear-gradient(180deg, #9a0f00 0%, #7a0000 100%)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 14px rgba(0,0,0,0.08)",
  zIndex: 1000,
};

const logoStyle = {
  height: 38, background: "#fff", borderRadius: 6, padding: "3px 8px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.10)", transition: "opacity 0.2s",
};

const dateStyle = {
  flex: 1, textAlign: "center", color: "rgba(255,255,255,0.78)",
  fontSize: 13, fontWeight: 400, letterSpacing: 0.3,
};

const stickyBarStyle = {
  position: "sticky", top: 0, zIndex: 10,
  background: "#fff",
  borderBottom: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  display: "flex", alignItems: "center", padding: "0 24px",
  height: 46,
  gap: 8,
};

const today = new Date().toLocaleDateString("fr-FR", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

// ── Skeleton de chargement de page ──────────────────────────────────────────
function ContentSkeleton() {
  return (
    <div style={{ padding: 24 }}>
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

// ── Composant principal ──────────────────────────────────────────────────────
function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const siderWidth = collapsed ? 80 : 260;

  const isAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase().replace(/^role_?/, "");
    return role === "admin";
  }, [user]);

  // Breadcrumb calculé depuis la route
  const crumbs = useMemo(() =>
    pathname.split("/").filter(Boolean).map((seg, i, arr) => {
      const path    = "/" + arr.slice(0, i + 1).join("/");
      const label   = ROUTE_LABELS[seg] ?? seg;
      const isLast  = i === arr.length - 1;
      return {
        title: isLast
          ? <span style={{ color: "#2d3748", fontWeight: 500, fontSize: 13 }}>{label}</span>
          : <Link to={path} style={{ color: "#a0aec0", fontSize: 13 }}>{label}</Link>,
      };
    }), [pathname]);

  // Menu avatar topbar (profil + déconnexion)
  const avatarMenu = useMemo(() => [
    { key: "profile",    label: "Mon profil", onClick: () => navigate("/home/profile") },
    { key: "passport",   label: "Skill Passport", onClick: () => navigate("/home/skill-passport") },
    { type: "divider" },
    {
      key: "logout",
      label: (
        <span
          role="button" tabIndex={0} style={{ color: "#ef4444" }}
          onClick={() => { logout(); navigate("/"); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { logout(); navigate("/"); } }}
        >
          <LogoutOutlined style={{ marginRight: 6 }} /> Déconnexion
        </span>
      ),
    },
  ], [navigate, logout]);

  const backTarget = useMemo(() => getBackTarget(pathname), [pathname]);
  const backLabel  = useMemo(() => BACK_CONTEXT[backTarget] ?? "Retour", [backTarget]);
  const goBack     = useMemo(() => () => navigate(backTarget, { replace: true }), [backTarget, navigate]);

  const onBellClick = () => {
    if (isAdmin) navigate("/home/analytics/alerts");
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <Header style={headerStyle}>
        {/* Toggle sidebar */}
        <Tooltip title={collapsed ? "Ouvrir le menu" : "Fermer le menu"} placement="bottomLeft">
          <div
            role="button" tabIndex={0}
            onClick={() => setCollapsed(!collapsed)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCollapsed(!collapsed); }}
            className="app-header-icon-btn"
            aria-label={collapsed ? "Ouvrir le menu" : "Fermer le menu"}
          >
            {collapsed
              ? <MenuUnfoldOutlined style={{ fontSize: 18, color: "#fff" }} />
              : <MenuFoldOutlined style={{ fontSize: 18, color: "#fff" }} />}
          </div>
        </Tooltip>

        {/* Logo */}
        <Link to="/home" style={{ margin: "0 14px", display: "flex" }}>
          <img src="/assets/img/logo/esprit.png" alt="ESPRIT" style={logoStyle} />
        </Link>

        {/* Date au centre */}
        <div style={dateStyle}>{today}</div>

        {/* Notifications */}
        <Tooltip title={isAdmin ? "Voir les alertes" : "Notifications"}>
          <div
            role="button" tabIndex={0}
            onClick={onBellClick}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && isAdmin) onBellClick(); }}
            className="app-header-icon-btn"
            aria-label="Notifications"
          >
            <Badge dot color="#f59e0b" offset={[-2, 2]}>
              <BellOutlined style={{ fontSize: 17, color: "rgba(255,255,255,0.92)" }} />
            </Badge>
          </div>
        </Tooltip>

        {/* Séparateur */}
        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />

        {/* Avatar + menu */}
        <Dropdown menu={{ items: avatarMenu }} placement="bottomRight" trigger={["click"]}>
          <div className="app-header-user-trigger">
            <Avatar
              icon={<UserOutlined />}
              size={32}
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)" }}
            />
            <span className="app-header-username">
              {user?.username ?? "Utilisateur"}
            </span>
          </div>
        </Dropdown>
      </Header>

      <Layout style={{ paddingTop: HEADER_HEIGHT }}>
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          width={260} collapsedWidth={80} trigger={null}
          style={{
            position: "fixed", top: HEADER_HEIGHT, bottom: 0, left: 0,
            overflow: "hidden", background: "#fff",
            boxShadow: "2px 0 6px rgba(0,0,0,0.05)", zIndex: 10,
            transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <SideMenu collapsed={collapsed} />
        </Sider>

        {/* ── Contenu principal ─────────────────────────────────────────────── */}
        <Layout style={{
          marginLeft: siderWidth,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Content id="main-content" role="main" tabIndex={-1} style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Barre sticky : retour + breadcrumb */}
            <div style={stickyBarStyle}>
              <Button
                type="text" icon={<ArrowLeftOutlined />} onClick={goBack}
                size="small"
                style={{ color: "#718096", fontWeight: 500, fontSize: 13, paddingInline: 8 }}
              >
                {backLabel}
              </Button>
              <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.09)", margin: "0 4px" }} />
              <HomeOutlined style={{ color: "#cbd5e0", fontSize: 13 }} />
              <Breadcrumb items={crumbs} separator={<span style={{ color: "#cbd5e0" }}>/</span>} />
            </div>

            {/* Zone de contenu avec animation */}
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                flex: "1 1 auto",
                overflow: "auto",
                padding: 24,
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
