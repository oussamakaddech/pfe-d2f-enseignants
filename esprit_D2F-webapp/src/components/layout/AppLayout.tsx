import { useState, useMemo, useEffect, memo, Suspense } from 'react';
import { Layout, Dropdown, Button, Tooltip, Drawer, Grid } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SideMenu from './SideMenu';
import ContentSkeleton from './ContentSkeleton';
import Breadcrumb from './Breadcrumb';
import UserAvatar from '@/components/ui/UserAvatar';
import GlobalSearch from '@/components/ui/GlobalSearch';
import { useAuth } from '@/hooks/auth';
import { NotificationCenter } from '@/components/notification';
import {
  HEADER_HEIGHT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  getBackTarget,
} from './AppLayoutConstants';
import '@/styles/components/layout.css';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const headerStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  height: HEADER_HEIGHT,
  padding: '0 24px',
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 10,
  background: 'linear-gradient(135deg, #7a0000 0%, #b51200 40%, #e54a3d 100%)',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.10)',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
};

const logoStyle = {
  height: 40,
  background: '#fff',
  borderRadius: 8,
  padding: '3px 10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.1)',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

const dateStyle = {
  flex: 1,
  textAlign: 'center' as const,
  color: 'rgba(255,255,255,0.7)',
  fontSize: 13,
  fontWeight: 400 as const,
  letterSpacing: 0.3,
};

const stickyBarStyle = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
  background: 'rgba(255, 255, 255, 0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  display: 'flex' as const,
  alignItems: 'center' as const,
  padding: '0 24px',
  height: 46,
  gap: 8,
};

const today = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
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
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const avatarMenu = useMemo(
    () => [
      { key: 'profile', label: 'Mon profil', onClick: () => navigate('/home/profile') },
      { key: 'passport', label: 'Skill Passport', onClick: () => navigate('/home/skill-passport') },
      { type: 'divider' as const },
      {
        key: 'logout',
        label: (
          <span style={{ color: 'var(--color-error)' }}>
            <LogoutOutlined style={{ marginRight: 6 }} /> Déconnexion
          </span>
        ),
        onClick: () => {
          logout();
          navigate('/');
        },
      },
    ],
    [navigate, logout],
  );

  const backTarget = useMemo(() => getBackTarget(pathname), [pathname]);
  const backLabel = useMemo(() => {
    const labels: Record<string, string> = {
      '/home/competences': 'Compétences',
      '/home/rice': 'RICE',
      '/home': 'Accueil',
    };
    return labels[backTarget] ?? 'Retour';
  }, [backTarget]);
  const goBack = useMemo(
    () => () => navigate(backTarget, { replace: true }),
    [backTarget, navigate],
  );

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header style={headerStyle}>
        <div className="app-header-left">
          <Tooltip title="Menu" placement="bottomLeft">
            <button
              type="button"
              onClick={toggleSidebar}
              className="app-header-icon-btn"
              aria-label="Basculer le menu"
            >
              {(() => {
                if (isMobile) return <MenuOutlined style={{ fontSize: 18, color: '#fff' }} />;
                if (collapsed)
                  return <MenuUnfoldOutlined style={{ fontSize: 18, color: '#fff' }} />;
                return <MenuFoldOutlined style={{ fontSize: 18, color: '#fff' }} />;
              })()}
            </button>
          </Tooltip>

          <Link to="/home" className="app-header-logo-link">
            <img src="/assets/img/logo/esprit.png" alt="ESPRIT" style={logoStyle} />
          </Link>
        </div>

        {!isMobile && <div style={dateStyle}>{today}</div>}
        {isMobile && <div style={{ flex: 1 }} />}

        <div className="app-header-right">
          {!isMobile && <GlobalSearch />}

          <NotificationCenter />

          <div className="app-header-divider" />

          <Dropdown menu={{ items: avatarMenu }} placement="bottomRight" trigger={['click']}>
            <button type="button" className="app-header-user-trigger">
              <UserAvatar fallbackText={user?.username ?? 'U'} size={34} />
            </button>
          </Dropdown>
        </div>
      </Header>

      <Layout style={{ paddingTop: HEADER_HEIGHT }}>
        {!isMobile && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={SIDEBAR_WIDTH}
            collapsedWidth={SIDEBAR_WIDTH_COLLAPSED}
            trigger={null}
            style={{
              position: 'fixed' as const,
              top: HEADER_HEIGHT,
              bottom: 0,
              left: 0,
              overflow: 'hidden',
              background: 'var(--bg-sidebar)',
              boxShadow: '2px 0 6px rgba(0,0,0,0.05)',
              zIndex: 10,
              transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
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
            styles={{ body: { padding: 0 }, header: { display: 'none' } }}
          >
            <SideMenu collapsed={false} />
          </Drawer>
        )}

        <Layout
          style={{
            marginLeft: isMobile ? 0 : siderWidth,
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            display: 'flex' as const,
            flexDirection: 'column' as const,
            overflow: 'hidden',
            transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <Content
            id="main-content"
            role="main"
            tabIndex={-1}
            style={{
              flex: '1 1 auto',
              overflow: 'hidden',
              display: 'flex' as const,
              flexDirection: 'column' as const,
            }}
          >
            <div style={stickyBarStyle}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={goBack}
                size="small"
                style={{
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  fontSize: 13,
                  paddingInline: 8,
                }}
              >
                {backLabel}
              </Button>
              <div
                style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 4px' }}
              />
              <Breadcrumb />
            </div>

            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{
                flex: '1 1 auto',
                overflow: 'auto',
                padding: 'var(--content-padding)',
                background: 'var(--bg-main)',
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
