import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, Tag, Button } from 'antd';
import { AimOutlined, RightOutlined, RiseOutlined, SwapOutlined } from '@ant-design/icons';
import { InfoCard, EmptyState } from '@/components/ui';
import { useInDemandCompetencies } from '@/hooks/analyse/useAnalysePredictive';

const DashboardTopCompetencies = memo(function DashboardTopCompetencies() {
  const navigate = useNavigate();
  const { data, isLoading } = useInDemandCompetencies();
  const items = (data ?? []).slice(0, 6);

  return (
    <InfoCard
      title="Compétences les plus demandées"
      icon={<AimOutlined />}
      footer={
        <Button
          type="link"
          style={{ paddingInline: 0 }}
          onClick={() => navigate('/home/competences')}
        >
          Référentiel compétences <RightOutlined />
        </Button>
      }
    >
      {(() => {
        if (isLoading) return <Skeleton active paragraph={{ rows: 4 }} />;
        if (items.length === 0)
          return (
            <EmptyState
              icon={<AimOutlined style={{ fontSize: 32 }} />}
              title="Aucune donnée de demande"
              compact
            />
          );
        return (
          <div className="dash-list">
            {items.map((c) => {
              const increasing = c.trend === 'increasing';
              return (
                <div key={c.competency_id} className="dash-list-row dash-list-row-static">
                  <div className="dash-list-main">
                    <div className="dash-list-title">{c.competency_name}</div>
                    <div className="dash-list-meta">{c.domaine_name ?? '—'}</div>
                  </div>
                  <Tag
                    color={increasing ? 'green' : 'blue'}
                    icon={increasing ? <RiseOutlined /> : <SwapOutlined />}
                  >
                    {increasing ? 'En hausse' : 'Stable'} · {c.demand_12m ?? 0}
                  </Tag>
                </div>
              );
            })}
          </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardTopCompetencies;
