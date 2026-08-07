import { memo } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import LineChart from '@/components/charts/LineChart';
import { useFormationsTimeline } from '@/hooks/dashboard/useDashboardData';
import type { DashboardScope } from '@/models/dashboard';

const DashboardTimelineChart = memo(function DashboardTimelineChart({
  scope,
}: {
  readonly scope: DashboardScope;
}) {
  const { data, isLoading } = useFormationsTimeline(scope);
  const periodes = data?.periodes ?? [];
  const labels = periodes.map((p) => p.label);

  return (
    <ChartCard
      title="Activité des formations"
      subtitle="Formations & participants par mois"
      loading={isLoading}
      empty={!isLoading && periodes.length === 0}
      emptyMessage="Aucune formation sur la période sélectionnée."
      height={300}
    >
      <LineChart
        labels={labels}
        series={[
          {
            label: 'Formations',
            data: periodes.map((p) => p.nombreFormations),
            color: '#b51200',
            filled: true,
          },
          {
            label: 'Participants',
            data: periodes.map((p) => p.nombreParticipants),
            color: '#00b4d8',
          },
        ]}
        height={300}
      />
    </ChartCard>
  );
});

export default DashboardTimelineChart;
