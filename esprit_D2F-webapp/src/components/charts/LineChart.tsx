import { memo, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';

import {
  chartPalette,
  cardTooltip,
  bottomLegend,
  subtleGrid,
  axisTicks,
  hexToRgba,
} from './chartTheme';

export interface LineSeries {
  label: string;
  data: number[];
  color?: string;
  /** Remplir la zone sous la courbe. */
  filled?: boolean;
}

interface LineChartProps {
  readonly labels: string[];
  readonly series: LineSeries[];
  readonly height?: number;
  /** Formateur des valeurs du tooltip / axe Y. */
  readonly valueSuffix?: string;
}

/**
 * Courbes (formations par période…) — conteneur responsive 100 %,
 * tooltip carte, légende en bas, grille pointillée discrète.
 */
const LineChart = memo(function LineChart({
  labels,
  series,
  height = 300,
  valueSuffix = '',
}: LineChartProps) {
  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s, i) => {
        const color = s.color ?? chartPalette[i % chartPalette.length];
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          backgroundColor: s.filled ? hexToRgba(color, 0.12) : color,
          fill: s.filled ?? false,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          borderWidth: 2,
        };
      }),
    }),
    [labels, series],
  );

  const options = useMemo<ChartOptions<'line'>>(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: bottomLegend,
          tooltip: {
            ...(cardTooltip as object),
            callbacks: {
              label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
                ` ${ctx.dataset.label} : ${Number(ctx.parsed.y).toLocaleString('fr-FR')}${valueSuffix}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: axisTicks },
          y: { beginAtZero: true, grid: subtleGrid, ticks: axisTicks },
        },
      }) as ChartOptions<'line'>,
    [valueSuffix],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Line data={data} options={options} />
    </div>
  );
});

export default LineChart;
