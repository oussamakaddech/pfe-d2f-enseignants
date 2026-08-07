import { memo } from 'react';
import styles from './Skeleton.module.css';

type SkeletonVariant = 'table' | 'card' | 'chart' | 'kpi' | 'text' | 'avatar';

interface SkeletonProps {
  readonly variant?: SkeletonVariant;
  /** variant="table" : nombre de lignes (défaut 8). */
  readonly rows?: number;
  /** variant="table" : nombre de colonnes simulées (défaut 5). */
  readonly columns?: number;
  /** variant="card" | "kpi" | "avatar" : nombre d'éléments (défaut 4). */
  readonly count?: number;
  /** variant="text" : nombre de lignes (défaut 3). */
  readonly lines?: number;
  /** variant="chart" : hauteur en px (défaut 300). */
  readonly height?: number;
  /** variant="avatar" : diamètre en px (défaut 40). */
  readonly size?: number;
  readonly className?: string;
}

/**
 * Skeleton de chargement à effet shimmer — à utiliser dans TOUS les états de
 * chargement de données (jamais de spinner brut dans une zone de données).
 *
 *   <Skeleton variant="table" rows={10} />
 *   <Skeleton variant="card" count={6} />
 *   <Skeleton variant="chart" height={300} />
 *   <Skeleton variant="kpi" count={4} />
 *   <Skeleton variant="text" lines={3} />
 *   <Skeleton variant="avatar" size={40} />
 */
const Skeleton = memo(function Skeleton({
  variant = 'text',
  rows = 8,
  columns = 5,
  count = 4,
  lines = 3,
  height = 300,
  size = 40,
  className = '',
}: SkeletonProps) {
  const sh = styles.shimmer;

  if (variant === 'table') {
    return (
      <output aria-label="Chargement des données" className={`${styles.table} ${className}`}>
        <div className={`${sh} ${styles.tableHeader}`} />
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className={styles.tableRow}>
            {Array.from({ length: columns }, (_, c) => (
              <div
                key={c}
                className={`${sh} ${styles.tableCell}`}
                style={{ maxWidth: c === 0 ? 48 : undefined }}
              />
            ))}
          </div>
        ))}
      </output>
    );
  }

  if (variant === 'card') {
    return (
      <output aria-label="Chargement" className={`${styles.cardGrid} ${className}`}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.card}>
            <div className={`${sh} ${styles.cardTitle}`} />
            <div className={`${sh} ${styles.cardLine}`} />
            <div className={`${sh} ${styles.cardLine}`} style={{ width: '80%' }} />
            <div className={`${sh} ${styles.cardFooter}`} />
          </div>
        ))}
      </output>
    );
  }

  if (variant === 'chart') {
    return (
      <output
        aria-label="Chargement du graphique"
        className={`${sh} ${className}`}
        style={{ display: 'block', width: '100%', height, borderRadius: 'var(--radius-md)' }}
      />
    );
  }

  if (variant === 'kpi') {
    return (
      <output aria-label="Chargement des indicateurs" className={`${styles.kpiGrid} ${className}`}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.kpi}>
            <div className={`${sh} ${styles.kpiLabel}`} />
            <div className={`${sh} ${styles.kpiValue}`} />
            <div className={`${sh} ${styles.kpiTrend}`} />
          </div>
        ))}
      </output>
    );
  }

  if (variant === 'avatar') {
    return (
      <output aria-label="Chargement" className={`${styles.avatarRow} ${className}`}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`${sh} ${styles.avatarCircle}`}
            style={{ width: size, height: size }}
          />
        ))}
      </output>
    );
  }

  // variant === "text"
  return (
    <output aria-label="Chargement" className={`${styles.textBlock} ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${sh} ${styles.textLine}`}
          style={{ width: i === lines - 1 ? '62%' : '100%' }}
        />
      ))}
    </output>
  );
});

export default Skeleton;
