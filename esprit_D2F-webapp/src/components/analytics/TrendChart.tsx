import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TrendPoint } from '@/models/analyse/analyticsFeature';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface TrendChartProps {
  readonly trends: TrendPoint[];
  readonly loading?: boolean;
}

/** Courbe de tendance (Indice de risque moyen, enseignants CRITIQUE, effectifs). */
export default function TrendChart({ trends, loading }: TrendChartProps) {
  if (loading) return <div>Chargement…</div>;
  const data = {
    labels: trends.map((t) => t.month),
    datasets: [
      {
        label: 'Indice de risque moyen',
        data: trends.map((t) => Math.round(t.score_risque_moyen * 100)),
        borderColor: '#1677ff',
        yAxisID: 'y',
      },
      {
        label: 'Enseignants CRITIQUE',
        data: trends.map((t) => t.nb_gaps_critiques),
        borderColor: '#f5222d',
        yAxisID: 'y1',
      },
      {
        label: 'Enseignants évalués',
        data: trends.map((t) => t.nb_alertes),
        borderColor: '#faad14',
        yAxisID: 'y1',
      },
    ],
  };
  return (
    <Line
      data={data}
      options={{
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Score %' } },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Comptes' },
            grid: { drawOnChartArea: false },
          },
        },
      }}
    />
  );
}
