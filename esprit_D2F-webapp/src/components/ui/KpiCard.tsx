import { memo, type ReactNode } from 'react';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import Skeleton from './Skeleton';
import styles from './KpiCard.module.css';

export type KpiColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface KpiCardProps {
  readonly title: string;
  readonly value: number | string;
  readonly unit?: string;
  readonly trend?: { value: number; direction: 'up' | 'down' | 'stable'; label?: string };
  readonly icon?: ReactNode;
  readonly color?: KpiColor;
  readonly loading?: boolean;
  readonly onClick?: () => void;
}

const ACCENT: Record<KpiColor, string> = {
  primary: styles.accentPrimary,
  success: styles.accentSuccess,
  warning: styles.accentWarning,
  danger: styles.accentDanger,
  info: styles.accentInfo,
};

const ICON_BG: Record<KpiColor, string> = {
  primary: styles.iconPrimary,
  success: styles.iconSuccess,
  warning: styles.iconWarning,
  danger: styles.iconDanger,
  info: styles.iconInfo,
};

const TREND_ICON = {
  up: <ArrowUpOutlined />,
  down: <ArrowDownOutlined />,
  stable: <MinusOutlined />,
} as const;

const TREND_CLASS = {
  up: styles.trendUp,
  down: styles.trendDown,
  stable: styles.trendStable,
} as const;

/**
 * Carte KPI : bordure gauche colorée, grande valeur, tendance ↑/↓/→.
 * Affiche un skeleton shimmer quand loading=true.
 */
const KpiCard = memo(function KpiCard({
  title,
  value,
  unit,
  trend,
  icon,
  color = 'primary',
  loading = false,
  onClick,
}: KpiCardProps) {
  if (loading) {
    return <Skeleton variant="kpi" count={1} />;
  }

  const formatted = typeof value === 'number' ? value.toLocaleString('fr-FR') : value;
  const body = (
    <>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {icon && (
          <span className={`${styles.iconBox} ${ICON_BG[color]}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{formatted}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      {trend && (
        <span className={`${styles.trend} ${TREND_CLASS[trend.direction]}`}>
          {TREND_ICON[trend.direction]}
          {Math.abs(trend.value).toLocaleString('fr-FR')}%
          {trend.label && <span className={styles.trendLabel}>{trend.label}</span>}
        </span>
      )}
    </>
  );

  const accent = `${styles.card} ${ACCENT[color]}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${accent} ${styles.clickable}`}>
        {body}
      </button>
    );
  }
  return <div className={accent}>{body}</div>;
});

export default KpiCard;
