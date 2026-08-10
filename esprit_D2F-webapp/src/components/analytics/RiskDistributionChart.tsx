import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { RISK_LEVEL_COLORS, RISK_LEVEL_ORDER } from '@/utils/analytics/constants';
import type { RiskDistributionBucket } from '@/models/analyse/analyticsFeature';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskDistributionChartProps {
  readonly distribution: RiskDistributionBucket[];
  readonly loading?: boolean;
}

/** Répartition des risques (donut). */
export default function RiskDistributionChart({
  distribution,
  loading,
}: RiskDistributionChartProps) {
  if (loading) return <div>Chargement…</div>;
  const counts = RISK_LEVEL_ORDER.map(
    (lvl) => distribution.find((d) => d.niveau === lvl)?.count ?? 0,
  );
  const data = {
    labels: RISK_LEVEL_ORDER.map((l) => l),
    datasets: [
      {
        data: counts,
        backgroundColor: RISK_LEVEL_ORDER.map((l) => RISK_LEVEL_COLORS[l]),
      },
    ],
  };
  return (
    <Doughnut
      data={data}
      options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
    />
  );
}
