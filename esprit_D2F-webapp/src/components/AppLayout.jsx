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

const { Header, Sider, Content } = Layout;
const HEADER_HEIGHT = 64;

const ROUTE_LABELS = {
  home: "Accueil",
  Formation: "Formations",
  Creer: "Créer",
  Consulter: "Catalogue",
  accounts: "Gestion des comptes",
  Enseignants: "Enseignants",
  enseignant: "Enseignant",
  KPI: "KPI",
  AnalysePredictive: "Analyse prédictive",
  analytics: "Analytique",
  dashboard: "Tableau de bord",
  teacher: "Enseignant",
  alerts: "Alertes",
  competences: "Compétences",
  competence: "Compétences",
  besoins: "Besoins en formation",
  ajouter: "Ajouter",
  Evaluations: "Évaluations",
  profile: "Mon profil",
  "edit-profile": "Modifier le profil",
  "update-password": "Mot de passe",
  certificate: "Certifications",
  Calendrier: "Calendrier",
  calendar: "Calendrier",
  "animateur-formations": "Sessions d'animation",
  affectations: "Affectations",
  rice: "RICE",
  matchmaking: "Matchmaking IA",
  "competence-matching": "Correspondance",
  File: "Gestion documentaire",
  UpDept: "Structures",
  ListeFormation: "Inscriptions",
  MyCertificate: "Mes certificats",
  register: "Inscription",
  test: "Tests",
};

const BACK_CONTEXT = {
  "/home/competences": "Compétences",
  "/home/rice": "RICE",
  "/home": "Accueil",
};

function getBackTarget(currentPath) {
  if (currentPath.startsWith("/home/competences/enseignant/")) return "/home/competences";
  if (currentPath.startsWith("/home/rice/matchmaking") || currentPath.startsWith("/home/rice/competence-matching")) return "/home/rice";
  if (currentPath.startsWith("/home/affectations")) return "/home/competences";
  if (["/home/profile", "/home/edit-profile", "/home/update-password"].includes(currentPath)) return "/home";
  return "/home";
}

const headerStyle = {
  position: "fixed", top: 0, left: 0, right: 0, height: HEADER_HEIGHT,
  padding: "0 24px", display: "flex", alignItems: "center", gap: 8,
  background: "linear-gradient(90deg, #7a0000 0%, #8b0000 30%, #B51200 70%, #cc2200 100%)",
  boxShadow: "0 2px 16px rgba(100,0,0,0.35)", zIndex: 1000,
};
const logoStyle = {
  height: 42, boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  background: "#fff", borderRadius: 8, padding: "3px 8px",
  transition: "transform 0.2s",
};
const dateStyle = {
  flex: 1, textAlign: "center", color: "rgba(255,255,255,0.82)",
  fontSize: 13, fontWeight: 500, letterSpacing: 0.3,
};
const stickyBarStyle = {
  position: "sticky", top: 0, zIndex: 10,
  background: "#fff",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  display: "flex", alignItems: "center", padding: "10px 24px",
};

const today = new Date().toLocaleDateString("fr-FR", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

function ContentSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton.Input active style={{ width: 280, height: 28, marginBottom: 24, display: "block" }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Skeleton.Node active style={{ width: "100%", height: 100, borderRadius: 12, display: "block" }} />
          </Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 5 }} />
    </div>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const siderWidth = collapsed ? 80 : 260;

  const crumbs = useMemo(() =>
    pathname.split("/").filter(Boolean).map((seg, i, arr) => {
      const path = "/" + arr.slice(0, i + 1).join("/");
      const label = ROUTE_LABELS[seg] ?? seg;
      const isLast = i === arr.length - 1;
      return {
        title: isLast
          ? <span style={{ color: "#2d3748", fontWeight: 500 }}>{label}</span>
          : <Link to={path} style={{ color: "#999" }}>{label}</Link>,
      };
    }), [pathname]);

  const avatarMenu = useMemo(() => [
    { key: "profile", label: "Mon profil", onClick: () => navigate("/home/profile") },
    {
      key: "logout",
      label: (
        <span
          role="button" tabIndex={0}
          onClick={() => { logout(); navigate("/"); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { logout(); navigate("/"); } }}
        >
          <LogoutOutlined /> Déconnexion
        </span>
      ),
    },
  ], [navigate, logout]);

  const backTarget = useMemo(() => getBackTarget(pathname), [pathname]);
  const backLabel = useMemo(() => BACK_CONTEXT[backTarget] ?? "Retour", [backTarget]);
  const goBack = useMemo(() => () => navigate(backTarget, { replace: true }), [backTarget, navigate]);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header style={headerStyle}>
        {collapsed ? (
          <MenuUnfoldOutlined onClick={() => setCollapsed(false)} style={{ fontSize: 20, color: "#fff", cursor: "pointer" }} />
        ) : (
          <MenuFoldOutlined onClick={() => setCollapsed(true)} style={{ fontSize: 20, color: "#fff", cursor: "pointer" }} />
        )}
        <Link to="/home" style={{ margin: "0 20px" }}>
          <img src="/assets/img/logo/esprit.png" alt="Esprit" style={logoStyle} />
        </Link>
        <div style={dateStyle}>{today}</div>

        <Tooltip title="Notifications">
          <Badge dot color="#faad14" offset={[-2, 2]}>
            <BellOutlined
              style={{
                fontSize: 18, color: "rgba(255,255,255,0.8)", cursor: "pointer",
                padding: "6px", borderRadius: 8,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            />
          </Badge>
        </Tooltip>

        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)", margin: "0 8px" }} />

        <Dropdown menu={{ items: avatarMenu }} placement="bottomRight">
          <Space style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 10, transition: "background 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Avatar
              icon={<UserOutlined />}
              size={34}
              style={{ background: "rgba(255,255,255,0.22)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)" }}
            />
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
              {user?.username ?? user?.name ?? "Utilisateur"}
            </span>
          </Space>
        </Dropdown>
      </Header>

      <Layout style={{ paddingTop: HEADER_HEIGHT }}>
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          width={260} collapsedWidth={80} trigger={null}
          style={{
            position: "fixed", top: HEADER_HEIGHT, bottom: 0, left: 0,
            overflow: "hidden", background: "#fff",
            boxShadow: "2px 0 8px rgba(0,0,0,0.05)", zIndex: 10,
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <SideMenu collapsed={collapsed} />
        </Sider>

        <Layout style={{
          marginLeft: siderWidth,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Content style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={stickyBarStyle}>
              <Button
                type="text" icon={<ArrowLeftOutlined />} onClick={goBack}
                style={{ marginRight: 12, color: "#666" }}
              >
                {backLabel}
              </Button>
              <HomeOutlined style={{ marginRight: 6, color: "#bbb" }} />
              <Breadcrumb items={crumbs} />
            </div>

            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
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
