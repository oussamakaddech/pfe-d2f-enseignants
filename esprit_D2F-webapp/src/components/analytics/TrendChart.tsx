import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { DailyTrendPoint } from '@/models/analyse/analyticsFeature';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface TrendChartProps {
  readonly trends: DailyTrendPoint[];
  readonly loading?: boolean;
}

/** Libellé court JJ/MM pour une date ISO (YYYY-MM-DD). */
export function formatTrendDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

/** Courbe quotidienne : indice de risque moyen (%), enseignants CRITIQUE /
 *  ÉLEVÉ et effectif suivi — un point par jour sur la période sélectionnée. */
export default function TrendChart({ trends, loading }: TrendChartProps) {
  if (loading) return <div>Chargement…</div>;
  const data = {
    labels: trends.map((t) => formatTrendDay(t.date)),
    datasets: [
      {
        label: 'Indice de risque moyen (%)',
        data: trends.map((t) => Math.round(t.score_risque_moyen * 100)),
        borderColor: '#1677ff',
        backgroundColor: 'rgba(22, 119, 255, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        yAxisID: 'y',
      },
      {
        label: 'Enseignants CRITIQUE',
        data: trends.map((t) => t.nb_critiques),
        borderColor: '#f5222d',
        tension: 0.35,
        pointRadius: 2,
        yAxisID: 'y1',
      },
      {
        label: 'Enseignants ÉLEVÉ',
        data: trends.map((t) => t.nb_eleves),
        borderColor: '#fa8c16',
        borderDash: [6, 4],
        tension: 0.35,
        pointRadius: 2,
        yAxisID: 'y1',
      },
      {
        label: 'Enseignants suivis',
        data: trends.map((t) => t.nb_enseignants),
        borderColor: '#52c41a',
        borderDash: [2, 4],
        tension: 0.35,
        pointRadius: 0,
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
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Indice %' },
            min: 0,
            max: 100,
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Enseignants' },
            grid: { drawOnChartArea: false },
            ticks: { precision: 0 },
          },
        },
      }}
    />
  );
}
