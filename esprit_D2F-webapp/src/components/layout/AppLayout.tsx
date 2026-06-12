import { useState, useMemo, useEffect, memo, Suspense } from "react";
import { Layout, Dropdown, Button, Badge, Tooltip, Drawer, Grid } from "antd";
import {
  MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, ArrowLeftOutlined, BellOutlined, MenuOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SideMenu from "./SideMenu";
import ContentSkeleton from "./ContentSkeleton";
import Breadcrumb from "./Breadcrumb";
import RoleBadge from "@/components/common/RoleBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import GlobalSearch from "@/components/ui/GlobalSearch";
import { useAuth } from "@/hooks/auth";
import {
  HEADER_HEIGHT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, getBackTarget,
} from "./AppLayoutConstants";
import "@/styles/components/layout.css";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const headerStyle = {
  position: "fixed" as const, top: 0, left: 0, right: 0, height: HEADER_HEIGHT,
  padding: "0 24px", display: "flex" as const, alignItems: "center" as const, gap: 10,
  background: "var(--header-gradient)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "var(--header-shadow)",
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
  background: "var(--bg-card)",
  borderBottom: "1px solid var(--border-color)",
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const screens = useBreakpoint();
  // < lg (1024px) → sidebar masquée, accessible via drawer (hamburger).
  const isMobile = !screens.lg;
  const siderWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  // Ferme le drawer mobile à chaque navigation.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const avatarMenu = useMemo(() => [
    { key: "profile",    label: "Mon profil", onClick: () => navigate("/home/profile") },
    { key: "passport",   label: "Skill Passport", onClick: () => navigate("/home/skill-passport") },
    { type: "divider" as const },
    {
      key: "logout",
      label: <span style={{ color: "var(--color-error)" }}><LogoutOutlined style={{ marginRight: 6 }} /> Déconnexion</span>,
      onClick: () => { logout(); navigate("/"); },
    },
  ], [navigate, logout]);

  const backTarget = useMemo(() => getBackTarget(pathname), [pathname]);
  const backLabel  = useMemo(() => {
    const labels: Record<string, string> = { "/home/competences": "Compétences", "/home/rice": "RICE", "/home": "Accueil" };
    return labels[backTarget] ?? "Retour";
  }, [backTarget]);
  const goBack     = useMemo(() => () => navigate(backTarget, { replace: true }), [backTarget, navigate]);

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header style={headerStyle}>
        <Tooltip title="Menu" placement="bottomLeft">
          <button
            type="button"
            onClick={toggleSidebar}
            className="app-header-icon-btn"
            aria-label="Basculer le menu"
          >
            {(() => {
              if (isMobile) return <MenuOutlined style={{ fontSize: 18, color: "#fff" }} />;
              if (collapsed) return <MenuUnfoldOutlined style={{ fontSize: 18, color: "#fff" }} />;
              return <MenuFoldOutlined style={{ fontSize: 18, color: "#fff" }} />;
            })()}
          </button>
        </Tooltip>

        <Link to="/home" style={{ margin: "0 14px", display: "flex" }}>
          <img src="/assets/img/logo/esprit.png" alt="ESPRIT" style={logoStyle} />
        </Link>

        {!isMobile && <div style={dateStyle}>{today}</div>}
        {isMobile && <div style={{ flex: 1 }} />}

        {!isMobile && <GlobalSearch />}

        <Tooltip title="Notifications">
          <div className="app-header-icon-btn" aria-label="Notifications">
            <Badge dot color="var(--color-warning)" offset={[-2, 2]}>
              <BellOutlined style={{ fontSize: 17, color: "rgba(255,255,255,0.92)" }} />
            </Badge>
          </div>
        </Tooltip>

        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />

        <Dropdown menu={{ items: avatarMenu }} placement="bottomRight" trigger={["click"]}>
          <div className="app-header-user-trigger">
            <UserAvatar
              fallbackText={user?.username ?? "U"}
              size={32}
            />
            <span className="app-header-user-meta">
              <span className="app-header-username">{user?.username ?? "Utilisateur"}</span>
              {user?.role && <RoleBadge role={user.role} size="small" />}
            </span>
          </div>
        </Dropdown>
      </Header>

      <Layout style={{ paddingTop: HEADER_HEIGHT }}>
        {!isMobile && (
          <Sider
            collapsible collapsed={collapsed} onCollapse={setCollapsed}
            width={SIDEBAR_WIDTH} collapsedWidth={SIDEBAR_WIDTH_COLLAPSED} trigger={null}
            style={{
              position: "fixed" as const, top: HEADER_HEIGHT, bottom: 0, left: 0,
              overflow: "hidden", background: "var(--bg-sidebar)",
              boxShadow: "2px 0 6px rgba(0,0,0,0.05)", zIndex: 10,
              transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <SideMenu collapsed={collapsed} />
          </Sider>
        )}

        {isMobile && (
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            placement="left"
            width={SIDEBAR_WIDTH}
            styles={{ body: { padding: 0 }, header: { display: "none" } }}
          >
            <SideMenu collapsed={false} />
          </Drawer>
        )}

        <Layout style={{
          marginLeft: isMobile ? 0 : siderWidth,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          display: "flex" as const, flexDirection: "column" as const, overflow: "hidden",
          transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Content id="main-content" role="main" tabIndex={-1} style={{ flex: "1 1 auto", overflow: "hidden", display: "flex" as const, flexDirection: "column" as const }}>

            <div style={stickyBarStyle}>
              <Button
                type="text" icon={<ArrowLeftOutlined />} onClick={goBack}
                size="small"
                style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 13, paddingInline: 8 }}
              >
                {backLabel}
              </Button>
              <div style={{ width: 1, height: 16, background: "var(--border-color)", margin: "0 4px" }} />
              <Breadcrumb />
            </div>

            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                flex: "1 1 auto",
                overflow: "auto",
                padding: "var(--content-padding)",
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
