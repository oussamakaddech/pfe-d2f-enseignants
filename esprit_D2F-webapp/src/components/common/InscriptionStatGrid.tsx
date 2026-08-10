import { memo } from 'react';
import type { ReactNode } from 'react';
import StatCard from './StatCard';
import { semantic, brand } from '@/styles/themes/tokens';

/**
 * Tone sémantique d'une stat d'inscription.
 * Aligne toutes les pages de l'écosystème inscription (catalogue, suivi
 * personnel, suivi global, gestion par formation, fiche, panneau participants)
 * sur la même palette (issues des tokens `semantic` + `brand`).
 */
export type InscriptionStatTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_PALETTE: Record<InscriptionStatTone, { color: string; accent: string }> = {
  brand: { color: brand[500], accent: brand[500] },
  info: { color: semantic.info, accent: semantic.info },
  success: { color: semantic.success, accent: semantic.success },
  warning: { color: semantic.warning, accent: semantic.warning },
  danger: { color: semantic.error, accent: semantic.error },
  neutral: { color: '#64748b', accent: '#64748b' },
};

export interface InscriptionStatItem {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: ReactNode;
  readonly tone?: InscriptionStatTone;
  readonly loading?: boolean;
  readonly onClick?: () => void;
}

interface InscriptionStatGridProps {
  readonly stats: InscriptionStatItem[];
  /** Nombre de colonnes minimum en responsive (par défaut 190px). */
  readonly minColumnWidth?: number;
  readonly gap?: number;
  readonly className?: string;
}

/**
 * Grille de stats uniformisée pour l'écosystème inscription.
 * Remplace les `<div style={{ display: "grid" ... }}>` dupliqués et harmonise
 * la palette (avant : `#52c41a`, `#10b981`, `#15803d`, `#faad14`, `#f59e0b`,
 * `#b45309`, `#ff4d4f`, `#ef4444`, `#b91c1c` cohabitaient).
 */
const InscriptionStatGrid = memo(function InscriptionStatGrid({
  stats,
  minColumnWidth = 190,
  gap = 16,
  className,
}: Readonly<InscriptionStatGridProps>) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
        gap,
        marginBottom: 24,
      }}
    >
      {stats.map((s, idx) => {
        const tone = s.tone ?? 'brand';
        const palette = TONE_PALETTE[tone];
        return (
          <div key={`${s.label}-${idx}`} className="ins-stat-in">
            <StatCard
              icon={s.icon}
              label={s.label}
              value={s.value}
              iconColor={palette.color}
              accentColor={palette.accent}
              loading={s.loading}
              onClick={s.onClick}
            />
          </div>
        );
      })}
    </div>
  );
});

export default InscriptionStatGrid;
