import { memo, useMemo } from 'react';
import { Tooltip } from 'antd';

import { valueToHeatColor, colors } from './chartTheme';
import styles from './HeatmapGrid.module.css';

interface HeatmapGridProps {
  /** Colonnes (ex. mois). */
  readonly xLabels: string[];
  /** Lignes (ex. UP / départements). */
  readonly yLabels: string[];
  /** values[ligne][colonne]. */
  readonly values: number[][];
  readonly valueSuffix?: string;
  readonly onCellClick?: (x: number, y: number, value: number) => void;
}

/**
 * Heatmap UP × Mois en CSS Grid (pas de SVG — performance sur des
 * centaines de cellules). Échelle blanc → bleu clair → bleu profond,
 * tooltip avec la valeur exacte au survol.
 */
const HeatmapGrid = memo(function HeatmapGrid({
  xLabels,
  yLabels,
  values,
  valueSuffix = '',
  onCellClick,
}: HeatmapGridProps) {
  const max = useMemo(() => Math.max(...values.flat(), 0), [values]);

  return (
    <div className={styles.scroll}>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `minmax(120px, auto) repeat(${xLabels.length}, minmax(36px, 1fr))`,
        }}
      >
        {/* coin vide + en-têtes de colonnes */}
        <div className={styles.cornerCell} />
        {xLabels.map((x) => (
          <div key={x} className={styles.colHeader}>
            {x}
          </div>
        ))}

        {yLabels.map((y, rowIdx) => (
          <HeatRow
            key={y}
            label={y}
            rowIdx={rowIdx}
            row={values[rowIdx] ?? []}
            xLabels={xLabels}
            max={max}
            valueSuffix={valueSuffix}
            onCellClick={onCellClick}
          />
        ))}
      </div>

      <div className={styles.scale} aria-hidden="true">
        <span className={styles.scaleLabel}>0</span>
        <span className={styles.scaleBar} />
        <span className={styles.scaleLabel}>
          {max.toLocaleString('fr-FR')}
          {valueSuffix}
        </span>
      </div>
    </div>
  );
});

const HeatRow = memo(function HeatRow({
  label,
  rowIdx,
  row,
  xLabels,
  max,
  valueSuffix,
  onCellClick,
}: {
  readonly label: string;
  readonly rowIdx: number;
  readonly row: number[];
  readonly xLabels: string[];
  readonly max: number;
  readonly valueSuffix: string;
  readonly onCellClick?: (x: number, y: number, value: number) => void;
}) {
  return (
    <>
      <div className={styles.rowHeader}>{label}</div>
      {xLabels.map((x, colIdx) => {
        const value = row[colIdx] ?? 0;
        const bg = valueToHeatColor(value, max);
        const dark = max > 0 && value / max > 0.55;
        return (
          <Tooltip
            key={x}
            title={`${label} — ${x} : ${value.toLocaleString('fr-FR')}${valueSuffix}`}
          >
            <button
              type="button"
              className={styles.cell}
              style={{ background: bg, color: dark ? '#fff' : colors.textSecondary }}
              onClick={onCellClick ? () => onCellClick(colIdx, rowIdx, value) : undefined}
              tabIndex={onCellClick ? 0 : -1}
            >
              {value > 0 ? value : ''}
            </button>
          </Tooltip>
        );
      })}
    </>
  );
});

export default HeatmapGrid;
