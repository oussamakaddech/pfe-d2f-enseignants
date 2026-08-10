import { memo, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';

import { chartPalette, cardTooltip } from './chartTheme';
import styles from './DonutChart.module.css';

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  readonly slices: DonutSlice[];
  readonly height?: number;
  /** Libellé central sous le total (ex. « formations »). */
  readonly centerLabel?: string;
  /** Clic sur une part (ou sur la légende) → filtrage de la table en dessous. */
  readonly onSliceClick?: (slice: DonutSlice, index: number) => void;
}

/**
 * Donut (distribution compétences / formations) — total au centre,
 * légende personnalisée à carrés colorés, parts cliquables pour filtrer.
 */
const DonutChart = memo(function DonutChart({
  slices,
  height = 260,
  centerLabel,
  onSliceClick,
}: DonutChartProps) {
  const total = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices]);
  const sliceColors = useMemo(
    () => slices.map((s, i) => s.color ?? chartPalette[i % chartPalette.length]),
    [slices],
  );

  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: sliceColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [slices, sliceColors],
  );

  const options = useMemo<ChartOptions<'doughnut'>>(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...(cardTooltip as object),
            callbacks: {
              label: (ctx: { label?: string; parsed: number }) => {
                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label} : ${ctx.parsed.toLocaleString('fr-FR')} (${pct} %)`;
              },
            },
          },
        },
        onClick: (_evt: unknown, elements: { index: number }[]) => {
          const idx = elements[0]?.index;
          if (idx !== undefined && onSliceClick) onSliceClick(slices[idx], idx);
        },
      }) as ChartOptions<'doughnut'>,
    [total, slices, onSliceClick],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.donutBox} style={{ height }}>
        <Doughnut data={data} options={options} />
        <div className={styles.center} aria-hidden="true">
          <span className={styles.total}>{total.toLocaleString('fr-FR')}</span>
          {centerLabel && <span className={styles.centerLabel}>{centerLabel}</span>}
        </div>
      </div>

      <ul className={styles.legend}>
        {slices.map((s, i) => (
          <li key={s.label}>
            <button
              type="button"
              className={styles.legendItem}
              onClick={() => onSliceClick?.(s, i)}
              disabled={!onSliceClick}
            >
              <span className={styles.swatch} style={{ background: sliceColors[i] }} />
              <span className={styles.legendLabel}>{s.label}</span>
              <span className={styles.legendValue}>{s.value.toLocaleString('fr-FR')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default DonutChart;
