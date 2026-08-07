import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { Row, Col, Tag } from 'antd';
import {
  RocketOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  BookOutlined,
  BulbOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/auth/useAuth';
import { normalizeRole } from '@/utils/constants/roles';
import { greeting } from '@/utils/helpers/greeting';
import { InfoCard } from '@/components/ui';
import DashboardPendingNeeds from '@/components/dashboard/DashboardPendingNeeds';
import DashboardUpcomingFormations from '@/components/dashboard/DashboardUpcomingFormations';
import { rangeToDates } from './dashboardRanges';
import type { DashboardScope } from '@/models/dashboard';
import { roleColors, brand, accent } from '@/styles/themes/tokens';
import '@/styles/pages/dashboard-page.css';

dayjs.locale('fr');

const SUBTITLE: Record<string, string> = {
  enseignant: 'Votre espace de développement professionnel',
  animateur: 'Vos formations et participations',
};

export default function PersonalDashboard({ role: roleProp }: { readonly role?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roleKey = normalizeRole(user?.role ?? roleProp);

  const scope = useMemo<DashboardScope>(() => {
    const { start, end } = rangeToDates('12m');
    return {
      role: roleKey,
      isAdmin: false,
      isCup: false,
      isEnseignant: roleKey === 'enseignant',
      isAnimateur: roleKey === 'animateur',
      start,
      end,
      rangeKey: '12m',
    };
  }, [roleKey]);

  const greet = greeting();
  const roleStyle = roleColors[roleKey] ?? {
    color: brand[500],
    bg: brand[50],
    label: 'Utilisateur',
  };
  const displayName = user?.username ?? user?.email ?? 'Utilisateur';
  const todayLabel = dayjs().format('dddd D MMMM YYYY');

  const links = [
    {
      label: 'Mes compétences',
      to: '/home/competences/enseignant',
      icon: <SafetyCertificateOutlined />,
      color: '#8b5cf6',
    },
    { label: 'Mes formations', to: '/home/Inscriptions', icon: <BookOutlined />, color: '#3b82f6' },
    {
      label: 'Mon calendrier',
      to: '/home/Calendrier',
      icon: <CalendarOutlined />,
      color: '#00b4d8',
    },
    {
      label: 'Déposer un besoin',
      to: '/home/besoins/ajouter',
      icon: <BulbOutlined />,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="dash-container">
      <section
        className="dash-hero dash-hero--personal"
        style={{ '--hero-accent': brand[500], '--hero-accent2': accent[500] } as CSSProperties}
      >
        <div className="dash-hero-bg" aria-hidden="true" />
        <div className="dash-hero-content">
          <div className="dash-hero-left">
            <div className="dash-hero-eyebrow">
              <ThunderboltOutlined /> Mon espace
              <Tag
                className="dash-hero-role"
                style={{
                  color: roleStyle.color,
                  background: roleStyle.bg,
                  borderColor: 'transparent',
                }}
              >
                {roleStyle.label}
              </Tag>
            </div>
            <h1 className="dash-hero-title">
              {greet.emoji} {greet.text}, {displayName}
            </h1>
            <p className="dash-hero-sub">
              {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
            </p>

            <div className="dash-hero-quick dash-hero-quick--inline">
              {links.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  className="dash-quick-tile"
                  style={{ '--tile-color': l.color } as CSSProperties}
                  onClick={() => navigate(l.to)}
                >
                  <span className="dash-quick-tile-icon">{l.icon}</span>
                  <span className="dash-quick-tile-label">{l.label}</span>
                  <span className="dash-quick-tile-arrow">
                    <RiseOutlined />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Row gutter={[20, 20]} className="dash-anim">
        <Col xs={24} lg={12}>
          <DashboardUpcomingFormations />
        </Col>
        <Col xs={24} lg={12}>
          <DashboardPendingNeeds scope={scope} />
        </Col>
      </Row>

      <InfoCard
        title="Votre espace personnel s'enrichit"
        icon={<RocketOutlined />}
        className="dash-anim"
      >
        <p style={{ marginTop: 0, color: 'var(--neutral-600)' }}>
          Bientôt ici : vos compétences et leur progression (niveaux 1–5), vos formations suivies,
          vos recommandations de parcours et vos écarts de compétences.
        </p>
        <button
          type="button"
          className="dash-link-btn"
          onClick={() => navigate('/home/competences/enseignant')}
        >
          Voir mes compétences <RightOutlined />
        </button>
      </InfoCard>
    </div>
  );
}
