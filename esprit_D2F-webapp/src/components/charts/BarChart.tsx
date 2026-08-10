import { memo, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { cardTooltip, subtleGrid, axisTicks, rateToColor, colors } from './chartTheme';

interface BarChartProps {
  readonly labels: string[];
  readonly values: number[];
  readonly height?: number;
  /** Barres horizontales (recommandé pour les libellés longs — UP/départements). */
  readonly horizontal?: boolean;
  /** Colorer chaque barre selon sa valeur (rouge → orange → vert). */
  readonly colorByValue?: boolean;
  readonly color?: string;
  readonly valueSuffix?: string;
  readonly datasetLabel?: string;
}

/**
 * Barres (participation par UP/département…) — horizontales par défaut
 * pour les libellés longs, dégradé par valeur, valeur affichée en bout
 * de barre (chartjs-plugin-datalabels, enregistré localement).
 */
const BarChart = memo(function BarChart({
  labels,
  values,
  height = 300,
  horizontal = true,
  colorByValue = true,
  color,
  valueSuffix = '',
  datasetLabel = 'Valeur',
}: BarChartProps) {
  const max = useMemo(() => Math.max(...values, 0), [values]);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: values,
          backgroundColor: colorByValue
            ? values.map((v) => rateToColor(v, max))
            : (color ?? colors.primary),
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
    }),
    [labels, values, datasetLabel, colorByValue, color, max],
  );

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: horizontal ? ('y' as const) : ('x' as const),
      responsive: true,
      maintainAspectRatio: false,
      // Réserve l'espace des datalabels en bout de barre.
      layout: { padding: horizontal ? { right: 42 } : { top: 24 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...(cardTooltip as object),
          callbacks: {
            label: (ctx) =>
              ` ${Number(horizontal ? ctx.parsed.x : ctx.parsed.y).toLocaleString('fr-FR')}${valueSuffix}`,
          },
        },
        datalabels: {
          anchor: 'end' as const,
          align: 'end' as const,
          color: colors.textSecondary,
          font: { family: 'Inter', size: 11, weight: 600 },
          formatter: (v: number) => `${v.toLocaleString('fr-FR')}${valueSuffix}`,
        },
      },
      scales: horizontal
        ? {
            x: { beginAtZero: true, grid: subtleGrid, ticks: axisTicks },
            y: { grid: { display: false }, ticks: axisTicks },
          }
        : {
            x: { grid: { display: false }, ticks: axisTicks },
            y: { beginAtZero: true, grid: subtleGrid, ticks: axisTicks },
          },
    }),
    [horizontal, valueSuffix],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Bar data={data} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
});

export default BarChart;
