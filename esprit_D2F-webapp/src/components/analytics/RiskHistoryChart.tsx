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
import { Empty, Tag } from 'antd';
import type { RiskHistoryPoint } from '@/models/analyse/analyticsFeature';
import { RISK_LEVEL_LABELS } from '@/utils/analytics/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface RiskHistoryChartProps {
  readonly points: RiskHistoryPoint[];
  readonly loading?: boolean;
}

/** Courbe d'evolution du Indice de risque dans le temps (F3). */
export default function RiskHistoryChart({ points, loading }: RiskHistoryChartProps) {
  if (loading) return <div>Chargement…</div>;
  if (!points || points.length === 0) return <Empty description="Aucun historique disponible" />;

  const labels = points.map((p) => p.date);
  const data = points.map((p) => Math.round(p.score * 100));
  // Historique du risque (etape ML actif) : tracer la classe et la probabilite
  // calibree quand elles sont servies par le modele (points ML), pas seulement le %.
  const hasMlInfo = points.some((p) => p.risk_class != null || p.probability_calibrated != null);
  const CLASS_LABELS: Record<string, string> = {
    LOW: 'FAIBLE',
    MEDIUM: 'MODEREE',
    HIGH: 'HAUTE',
    CRITICAL: 'CRITIQUE',
  };

  const first = points[0].score;
  const lastPoint = points.at(-1)!;
  const last = lastPoint.score;
  const delta = Math.round((last - first) * 100);
  const tendance =
    delta <= -3
      ? { label: 'Régression', color: 'red' }
      : (() => {
          if (delta >= 3) return { label: 'Amélioration', color: 'green' };
          return { label: 'Stagnation', color: 'orange' };
        })();

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag color={tendance.color}>{tendance.label}</Tag>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Variation sur la periode : {delta > 0 ? '+' : ''}
          {delta} pts
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          (dernier niveau : {RISK_LEVEL_LABELS[lastPoint.niveau] ?? lastPoint.niveau})
        </span>
      </div>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Indice de risque (/100)',
              data,
              borderColor: '#c8102e',
              backgroundColor: 'rgba(200,16,46,0.12)',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  if (!hasMlInfo) return '';
                  const p = points[ctx.dataIndex];
                  const parts: string[] = [];
                  if (p.risk_class != null) {
                    parts.push(
                      `Classe : ${CLASS_LABELS[p.risk_class.toUpperCase()] ?? p.risk_class}`,
                    );
                  }
                  if (p.probability_calibrated != null) {
                    parts.push(
                      `Probabilité calibrée : ${Math.round(p.probability_calibrated * 100)}%`,
                    );
                  }
                  return parts;
                },
              },
            },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              title: { display: true, text: 'Indice de risque (/100)' },
            },
          },
        }}
      />
    </div>
  );
}
