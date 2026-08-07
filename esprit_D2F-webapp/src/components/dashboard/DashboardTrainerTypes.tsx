import { memo, useMemo } from 'react';
import { Skeleton } from 'antd';
import { GlobalOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { InfoCard, EmptyState } from '@/components/ui';
import { useKpiCountByTrainerType } from '@/hooks/kpi';
import type { DashboardScope } from '@/models/dashboard';

const TRAINER_CONFIG = [
  {
    key: 'externeOnlyCount',
    label: 'Formateur externe',
    sub: 'formations avec formateur externe',
    icon: <GlobalOutlined />,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    key: 'interneOnlyCount',
    label: 'Formateur interne',
    sub: 'formations avec animateur interne',
    icon: <UserOutlined />,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    key: 'mixteCount',
    label: 'Mixte',
    sub: 'formations avec les deux types',
    icon: <TeamOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
] as const;

interface Props {
  readonly scope: DashboardScope;
}

const DashboardTrainerTypes = memo(function DashboardTrainerTypes({ scope }: Props) {
  const filters = useMemo(() => ({ start: scope.start, end: scope.end }), [scope.start, scope.end]);
  const {
    data: raw,
    isLoading,
    isError,
  } = useKpiCountByTrainerType(filters as Record<string, unknown>);
  const counts = Array.isArray(raw) ? null : (raw as Record<string, number> | null | undefined);

  return (
    <InfoCard title="Formations par formateur" icon={<TeamOutlined />}>
      {(() => {
        if (isLoading) return <Skeleton active paragraph={{ rows: 3 }} />;
        if (isError || !counts)
          return (
            <EmptyState
              icon={<TeamOutlined style={{ fontSize: 28 }} />}
              title="Aucune donnée"
              compact
            />
          );
        return (
          <div className="dash-list">
            {TRAINER_CONFIG.map(({ key, label, sub, icon, color, bg, border }) => (
              <div key={key} className="dash-list-row dash-list-row-static">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: bg,
                    border: `1px solid ${border}`,
                    fontSize: 18,
                    color,
                  }}
                >
                  {icon}
                </div>
                <div className="dash-list-main">
                  <div className="dash-list-title">{label}</div>
                  <div className="dash-list-meta">{sub}</div>
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 22,
                    color: 'var(--neutral-900)',
                    letterSpacing: '-0.02em',
                    flexShrink: 0,
                  }}
                >
                  {(counts[key] ?? 0).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardTrainerTypes;
