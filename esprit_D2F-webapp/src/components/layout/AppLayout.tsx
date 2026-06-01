import { useState, useMemo, memo, Suspense } from "react";
import { Layout, Dropdown, Avatar, Button, Breadcrumb, Badge, Tooltip } from "antd";
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
  LogoutOutlined, ArrowLeftOutlined, HomeOutlined, BellOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SideMenu from "./SideMenu";
import ContentSkeleton from "./ContentSkeleton";
import { useAuth } from "@/hooks/auth";
import { HEADER_HEIGHT, ROUTE_LABELS, getBackTarget } from "./AppLayoutConstants";
import "@/styles/components/layout.css";

const { Header, Sider, Content } = Layout;

const headerStyle = {
  position: "fixed" as const, top: 0, left: 0, right: 0, height: HEADER_HEIGHT,
  padding: "0 24px", display: "flex" as const, alignItems: "center" as const, gap: 10,
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
  flex: 1, textAlign: "center" as const, color: "rgba(255,255,255,0.78)",
  fontSize: 13, fontWeight: 400 as const, letterSpacing: 0.3,
};

const stickyBarStyle = {
  position: "sticky" as const, top: 0, zIndex: 10,
  background: "#fff",
  borderBottom: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  display: "flex" as const, alignItems: "center" as const, padding: "0 24px",
  height: 46,
  gap: 8,
};

const today = new Date().toLocaleDateString("fr-FR", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const siderWidth = collapsed ? 80 : 260;

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

  const avatarMenu = useMemo(() => [
    { key: "profile",    label: "Mon profil", onClick: () => navigate("/home/profile") },
    { key: "passport",   label: "Skill Passport", onClick: () => navigate("/home/skill-passport") },
    { type: "divider" as const },
    {
      key: "logout",
      label: <span style={{ color: "#ef4444" }}><LogoutOutlined style={{ marginRight: 6 }} /> Déconnexion</span>,
      onClick: () => { logout(); navigate("/"); },
    },
  ], [navigate, logout]);

  const backTarget = useMemo(() => getBackTarget(pathname), [pathname]);
  const backLabel  = useMemo(() => {
    const labels: Record<string, string> = { "/home/competences": "Compétences", "/home/rice": "RICE", "/home": "Accueil" };
    return labels[backTarget] ?? "Retour";
  }, [backTarget]);
  const goBack     = useMemo(() => () => navigate(backTarget, { replace: true }), [backTarget, navigate]);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header style={headerStyle}>
        <Tooltip title={collapsed ? "Ouvrir le menu" : "Fermer le menu"} placement="bottomLeft">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="app-header-icon-btn"
            aria-label={collapsed ? "Ouvrir le menu" : "Fermer le menu"}
          >
            {collapsed
              ? <MenuUnfoldOutlined style={{ fontSize: 18, color: "#fff" }} />
              : <MenuFoldOutlined style={{ fontSize: 18, color: "#fff" }} />}
          </button>
        </Tooltip>

        <Link to="/home" style={{ margin: "0 14px", display: "flex" }}>
          <img src="/assets/img/logo/esprit.png" alt="ESPRIT" style={logoStyle} />
        </Link>

        <div style={dateStyle}>{today}</div>

        <Tooltip title="Notifications">
          <div className="app-header-icon-btn" aria-label="Notifications">
            <Badge dot color="#f59e0b" offset={[-2, 2]}>
              <BellOutlined style={{ fontSize: 17, color: "rgba(255,255,255,0.92)" }} />
            </Badge>
          </div>
        </Tooltip>

        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />

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
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          width={260} collapsedWidth={80} trigger={null}
          style={{
            position: "fixed" as const, top: HEADER_HEIGHT, bottom: 0, left: 0,
            overflow: "hidden", background: "#fff",
            boxShadow: "2px 0 6px rgba(0,0,0,0.05)", zIndex: 10,
            transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <SideMenu collapsed={collapsed} />
        </Sider>

        <Layout style={{
          marginLeft: siderWidth,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          display: "flex" as const, flexDirection: "column" as const, overflow: "hidden",
          transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Content id="main-content" role="main" tabIndex={-1} style={{ flex: "1 1 auto", overflow: "hidden", display: "flex" as const, flexDirection: "column" as const }}>

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
