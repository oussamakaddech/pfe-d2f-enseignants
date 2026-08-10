import { lazy, Suspense, useMemo } from 'react';
import { Tabs, Spin, Skeleton, Row, Col } from 'antd';
import { AppstoreOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useProfile } from '@/hooks/formation/useFormationExtras';
import { normalizeRole } from '@/utils/constants/roles';
import '@/styles/pages/inscription.css';

const CatalogueTab = lazy(() => import('./CatalogueTab'));
const MesInscriptionsTab = lazy(() => import('./MesInscriptionsTab'));
const SuiviTab = lazy(() => import('./SuiviTab'));

function TabFallback() {
  return (
    <div style={{ padding: 24, minHeight: 400 }}>
      <Skeleton.Input
        active
        style={{ width: 260, height: 28, marginBottom: 28, display: 'block' }}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Skeleton.Node
              active
              style={{ width: '100%', height: 110, borderRadius: 14, display: 'block' }}
            />
          </Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}

export default function InscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const role = normalizeRole(profile?.role);
  const isAdminLike = role === 'admin' || role === 'cup';
  const isTeacher = role === 'enseignant' || role === 'animateur';

  const activeTab = searchParams.get('tab') || 'catalogue';

  const tabs = useMemo(() => {
    const items = [
      {
        key: 'catalogue',
        label: (
          <span className="ins-tab-label">
            <AppstoreOutlined />
            Catalogue
          </span>
        ),
        children: (
          <Suspense fallback={<TabFallback />}>
            <CatalogueTab />
          </Suspense>
        ),
      },
    ];

    if (isTeacher) {
      items.push({
        key: 'mes-inscriptions',
        label: (
          <span className="ins-tab-label">
            <FileTextOutlined />
            Mes inscriptions
          </span>
        ),
        children: (
          <Suspense fallback={<TabFallback />}>
            <MesInscriptionsTab />
          </Suspense>
        ),
      });
    }

    if (isAdminLike) {
      items.push({
        key: 'suivi',
        label: (
          <span className="ins-tab-label">
            <TeamOutlined />
            Suivi & Gestion
          </span>
        ),
        children: (
          <Suspense fallback={<TabFallback />}>
            <SuiviTab />
          </Suspense>
        ),
      });
    }

    return items;
  }, [isAdminLike, isTeacher]);

  if (profileLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Spin size="large" tip="Chargement..." />
      </div>
    );
  }

  return (
    <div className="ins-page">
      <div className="cat-hero">
        <div className="cat-hero-top">
          <div className="cat-hero-left">
            <div className="cat-hero-icon">
              <AppstoreOutlined />
            </div>
            <div>
              <div className="cat-hero-title-row">
                <h2 className="cat-hero-title">Catalogue des Formations</h2>
              </div>
              <div className="cat-hero-subtitle">
                Consulter le catalogue et suivre vos inscriptions
              </div>
            </div>
          </div>
        </div>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
        items={tabs}
        className="ins-tabs"
        size="large"
      />
    </div>
  );
}
