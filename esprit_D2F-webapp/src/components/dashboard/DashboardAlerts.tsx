import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, Tag, Button } from 'antd';
import {
  AlertOutlined,
  RightOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { InfoCard, EmptyState } from '@/components/ui';
import { useBesoins } from '@/hooks/besoin/useBesoins';
import { useGlobalDashboard, useInactifs } from '@/hooks/dashboard/useDashboardData';
import { composeAlerts, isPendingBesoin } from '@/services/dashboard/dashboardService';
import type { AlertSeverity, DashboardScope } from '@/models/dashboard';

const SEV: Record<AlertSeverity, { color: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: { color: 'red', icon: <CloseCircleOutlined />, label: 'Critique' },
  WARNING: { color: 'orange', icon: <WarningOutlined />, label: 'Attention' },
  INFO: { color: 'blue', icon: <InfoCircleOutlined />, label: 'Info' },
};

function sevColorVar(severity: string): string {
  if (severity === 'CRITICAL') return 'error';
  if (severity === 'WARNING') return 'warning';
  return 'info';
}

const DashboardAlerts = memo(function DashboardAlerts({
  scope,
}: {
  readonly scope: DashboardScope;
}) {
  const navigate = useNavigate();
  const global = useGlobalDashboard(scope.isAdmin);
  const inactifs = useInactifs();
  const besoins = useBesoins(scope.isAdmin);

  const loading = inactifs.isLoading || (scope.isAdmin && (global.isLoading || besoins.isLoading));

  const alerts = composeAlerts({
    global: scope.isAdmin ? global.data : undefined,
    inactifsTotal: inactifs.data?.total,
    pendingNeeds: scope.isAdmin ? (besoins.data ?? []).filter(isPendingBesoin).length : undefined,
  });

  return (
    <InfoCard
      title="Alertes prioritaires"
      icon={<AlertOutlined />}
      badge={alerts.length > 0 ? <Tag color="red">{alerts.length}</Tag> : undefined}
    >
      {(() => {
        if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;
        if (alerts.length === 0)
          return (
            <EmptyState
              icon={<CheckCircleOutlined style={{ color: 'var(--color-success)', fontSize: 36 }} />}
              title="Aucune alerte prioritaire"
              description="Tout est sous contrôle pour la période sélectionnée."
              compact
            />
          );
        return (
          <div className="dash-alerts">
            {alerts.slice(0, 6).map((a) => {
              const sev = SEV[a.severity];
              return (
                <div key={a.id} className={`dash-alert dash-alert-${a.severity.toLowerCase()}`}>
                  <span
                    className="dash-alert-icon"
                    style={{ color: `var(--ant-color-${sevColorVar(a.severity)})` }}
                  >
                    {sev.icon}
                  </span>
                  <div className="dash-alert-body">
                    <div className="dash-alert-title">
                      {a.title} <Tag color={sev.color}>{sev.label}</Tag>
                    </div>
                    <div className="dash-alert-msg">{a.message}</div>
                  </div>
                  {a.cta && (
                    <Button type="link" size="small" onClick={() => navigate(a.cta!.to)}>
                      {a.cta.label} <RightOutlined />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardAlerts;
