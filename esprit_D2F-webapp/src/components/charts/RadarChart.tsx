import { memo, useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';

import { chartPalette, cardTooltip, bottomLegend, axisTicks, hexToRgba } from './chartTheme';

export interface RadarSeries {
  label: string;
  data: number[];
  color?: string;
}

interface RadarChartProps {
  /** Axes (compétences, critères…). */
  readonly axes: string[];
  /** Jeux de données superposés (départements à comparer). */
  readonly series: RadarSeries[];
  readonly height?: number;
  readonly max?: number;
}

/**
 * Radar (comparaison inter-départements) — datasets superposés avec
 * remplissage translucide et marqueurs de points.
 */
const RadarChart = memo(function RadarChart({ axes, series, height = 320, max }: RadarChartProps) {
  const data = useMemo(
    () => ({
      labels: axes,
      datasets: series.map((s, i) => {
        const color = s.color ?? chartPalette[i % chartPalette.length];
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          backgroundColor: hexToRgba(color, 0.16),
          fill: true,
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: color,
          pointBorderWidth: 2,
        };
      }),
    }),
    [axes, series],
  );

  const options = useMemo<ChartOptions<'radar'>>(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: bottomLegend,
          tooltip: cardTooltip,
        },
        scales: {
          r: {
            beginAtZero: true,
            max,
            ticks: {
              ...axisTicks,
              backdropColor: 'transparent',
              stepSize: max ? max / 5 : undefined,
            },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            angleLines: { color: 'rgba(15, 23, 42, 0.08)' },
            pointLabels: { font: { family: 'Inter', size: 11 }, color: axisTicks.color },
          },
        },
      }) as ChartOptions<'radar'>,
    [max],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Radar data={data} options={options} />
    </div>
  );
});

export default RadarChart;
