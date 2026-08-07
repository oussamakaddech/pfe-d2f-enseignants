import { memo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOutlined,
  TeamOutlined,
  RiseOutlined,
  WarningOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  AimOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { KpiCard, type KpiColor } from '@/components/ui';
import { useTotalFormations, useUniqueParticipants, useGlobalParticipantKPI } from '@/hooks/kpi';
import { useOverview } from '@/hooks/analyse/useAnalysePredictive';
import { useBesoins } from '@/hooks/besoin/useBesoins';
import {
  useGlobalDashboard,
  useParticipationByUp,
  useInactifs,
} from '@/hooks/dashboard/useDashboardData';
import { isPendingBesoin } from '@/services/dashboard/dashboardService';
import { previousRange } from '@/pages/dashboard/dashboardRanges';
import type { GlobalParticipantKPI } from '@/models/analyse/kpi';
import type { AnalyticsUP } from '@/models/analyse/reporting';
import type { DashboardScope } from '@/models/dashboard';

interface KpiSpec {
  readonly title: string;
  readonly value: number | string;
  readonly unit?: string;
  readonly icon: ReactNode;
  readonly color: KpiColor;
  readonly loading: boolean;
  readonly trend?: { value: number; direction: 'up' | 'down' | 'stable'; label?: string };
  readonly to?: string;
}

function pct(n: number | undefined | null): string {
  return n == null ? '—' : `${Math.round(n)}`;
}

function presenceColor(v: number): KpiColor {
  if (v >= 75) return 'success';
  if (v >= 50) return 'warning';
  return 'danger';
}

function trendFrom(cur: number, prev: number): KpiSpec['trend'] {
  if (!prev) return undefined;
  const delta = ((cur - prev) / prev) * 100;
  let direction: 'stable' | 'up' | 'down';
  if (Math.abs(delta) < 1) direction = 'stable';
  else if (delta > 0) direction = 'up';
  else direction = 'down';
  return { value: Math.round(delta), direction, label: 'vs période préc.' };
}

const DashboardKpiGrid = memo(function DashboardKpiGrid({
  scope,
}: {
  readonly scope: DashboardScope;
}) {
  const navigate = useNavigate();
  const isAdmin = scope.isAdmin;
  const prev = previousRange(scope.start, scope.end);

  // ── Sources ADMIN (globales) ──
  const totalForm = useTotalFormations(scope.start, scope.end);
  const totalFormPrev = useTotalFormations(prev.start, prev.end);
  const participants = useUniqueParticipants(scope.start, scope.end);
  const presenceQ = useGlobalParticipantKPI(scope.start, scope.end);
  const overview = useOverview();
  const besoins = useBesoins(isAdmin);
  const global = useGlobalDashboard(isAdmin);

  // ── Sources CUP (scopées serveur) ──
  const upQ = useParticipationByUp(!isAdmin);
  const inactifs = useInactifs(!isAdmin);

  const presence = (presenceQ.data as GlobalParticipantKPI | undefined)?.tauxParticipation;
  const ups = upQ.data?.items ?? [];
  const sum = (sel: (u: AnalyticsUP) => number) => ups.reduce((s, u) => s + (sel(u) || 0), 0);
  const avg = (sel: (u: AnalyticsUP) => number) => (ups.length ? sum(sel) / ups.length : 0);

  const specs: KpiSpec[] = isAdmin
    ? [
        {
          title: 'Formations',
          value: totalForm.data ?? 0,
          icon: <BookOutlined />,
          color: 'primary',
          loading: totalForm.isLoading,
          trend: trendFrom(totalForm.data ?? 0, totalFormPrev.data ?? 0),
          to: '/home/KPI',
        },
        {
          title: 'Participants uniques',
          value: participants.data ?? 0,
          icon: <TeamOutlined />,
          color: 'info',
          loading: participants.isLoading,
          to: '/home/KPI',
        },
        {
          title: 'Taux de présence',
          value: pct(presence),
          unit: '%',
          icon: <RiseOutlined />,
          color: presence == null ? 'info' : presenceColor(presence),
          loading: presenceQ.isLoading,
        },
        {
          title: 'Enseignants à risque',
          value: global.data?.enseignants_a_risque?.length ?? 0,
          icon: <WarningOutlined />,
          color: 'danger',
          loading: global.isLoading,
          to: '/home/analytics',
        },
        {
          title: 'Besoins en attente',
          value: (besoins.data ?? []).filter(isPendingBesoin).length,
          icon: <BellOutlined />,
          color: 'warning',
          loading: besoins.isLoading,
          to: '/home/besoins',
        },
        {
          title: 'Couverture compétences',
          value: pct(overview.data?.taux_couverture_global),
          unit: '%',
          icon: <SafetyCertificateOutlined />,
          color: 'success',
          loading: overview.isLoading,
          trend:
            overview.data?.deltas?.taux_couverture_global == null
              ? undefined
              : {
                  value: Math.round(overview.data.deltas.taux_couverture_global),
                  direction: overview.data.deltas.taux_couverture_global >= 0 ? 'up' : 'down',
                  label: 'pts',
                },
        },
      ]
    : [
        {
          title: 'Formations (UP)',
          value: sum((u) => u.nombreFormationsOrganisees),
          icon: <BookOutlined />,
          color: 'primary',
          loading: upQ.isLoading,
          to: '/home/KPI',
        },
        {
          title: 'Participations',
          value: sum((u) => u.nombreParticipations),
          icon: <TeamOutlined />,
          color: 'info',
          loading: upQ.isLoading,
        },
        {
          title: 'Taux participation',
          value: pct(avg((u) => u.tauxParticipation)),
          unit: '%',
          icon: <RiseOutlined />,
          color: presenceColor(avg((u) => u.tauxParticipation)),
          loading: upQ.isLoading,
        },
        {
          title: 'Enseignants suivis',
          value: sum((u) => u.nombreEnseignants),
          icon: <TeamOutlined />,
          color: 'info',
          loading: upQ.isLoading,
        },
        {
          title: 'Sans formation',
          value: inactifs.data?.total ?? 0,
          icon: <WarningOutlined />,
          color: 'warning',
          loading: inactifs.isLoading,
          to: '/home/analytics/enseignants-inactifs',
        },
        {
          title: 'Engagement moyen',
          value: pct(avg((u) => u.scoreEngagement)),
          unit: '/100',
          icon: <HeartOutlined />,
          color: 'success',
          loading: upQ.isLoading,
        },
      ];

  return (
    <div className="dash-kpi-grid">
      {specs.map((s) => (
        <KpiCard
          key={s.title}
          title={s.title}
          value={s.value}
          unit={s.unit}
          icon={s.icon ?? <AimOutlined />}
          color={s.color}
          loading={s.loading}
          trend={s.trend}
          onClick={s.to ? () => navigate(s.to!) : undefined}
        />
      ))}
    </div>
  );
});

export default DashboardKpiGrid;
