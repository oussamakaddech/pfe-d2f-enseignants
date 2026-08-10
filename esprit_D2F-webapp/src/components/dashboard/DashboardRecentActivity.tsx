import { memo, useMemo } from 'react';
import { Skeleton, Empty } from 'antd';
import { BookOutlined, BellOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { InfoCard } from '@/components/ui';
import { useAllFormations } from '@/hooks/formation/useFormations';
import { useBesoins, useMyBesoins } from '@/hooks/besoin/useBesoins';
import type { DashboardActivityItem, DashboardScope } from '@/models/dashboard';

/**
 * Flux d'activité récente — composé à partir de données réelles existantes
 * (formations & besoins, triés par date). NB : un vrai endpoint d'audit
 * `GET /activity` reste recommandé (voir contrat BFF du plan).
 */
const DashboardRecentActivity = memo(function DashboardRecentActivity({
  scope,
}: {
  readonly scope: DashboardScope;
}) {
  const formations = useAllFormations();
  const allBesoins = useBesoins(scope.isAdmin);
  const myBesoins = useMyBesoins(!scope.isAdmin);
  const besoins = scope.isAdmin ? allBesoins : myBesoins;

  const items = useMemo<DashboardActivityItem[]>(() => {
    const fromFormations: DashboardActivityItem[] = (formations.data ?? [])
      .filter((f) => f.dateDebut)
      .map((f) => ({
        id: `f-${f.idFormation}`,
        type: 'formation',
        title: f.titreFormation ?? 'Formation',
        meta: 'Formation planifiée',
        date: f.dateDebut,
      }));
    const fromBesoins: DashboardActivityItem[] = (besoins.data ?? [])
      .filter((b) => b.dateCreation)
      .map((b) => ({
        id: `b-${b.idBesoinFormation}`,
        type: 'besoin',
        title: b.titre ?? b.theme ?? 'Besoin de formation',
        meta: b.username ? `Soumis par ${b.username}` : 'Nouveau besoin',
        date: b.dateCreation,
      }));
    return [...fromFormations, ...fromBesoins]
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .slice(0, 10);
  }, [formations.data, besoins.data]);

  const loading = formations.isLoading || besoins.isLoading;

  return (
    <InfoCard title="Activité récente" icon={<HistoryOutlined />}>
      {(() => {
        if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;
        if (items.length === 0) return <Empty description="Aucune activité récente" />;
        return (
          <div className="dash-activity">
            {items.map((it) => (
              <div key={it.id} className="dash-activity-row">
                <span className={`dash-activity-icon dash-activity-${it.type}`}>
                  {it.type === 'formation' ? <BookOutlined /> : <BellOutlined />}
                </span>
                <div className="dash-activity-main">
                  <div className="dash-activity-title">{it.title}</div>
                  <div className="dash-activity-meta">{it.meta}</div>
                </div>
                <span className="dash-activity-time">
                  {it.date ? dayjs(it.date).format('DD/MM/YYYY') : ''}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardRecentActivity;
