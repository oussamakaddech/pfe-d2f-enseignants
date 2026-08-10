import { riskLevel, RISK_LABELS, RISK_COLORS } from '@/redesign/risk';

export function RiskBadge({
  score,
  size = 'md',
}: {
  readonly score: number | null;
  readonly size?: 'sm' | 'md';
}) {
  if (score == null || Number.isNaN(score)) {
    return (
      <span
        className={`rd-risk ${size === 'sm' ? 'sm' : ''}`}
        style={{ color: 'var(--rd-text-3)', background: 'var(--rd-surface-3)' }}
      >
        Non calculable
      </span>
    );
  }
  const level = riskLevel(score);
  const color = RISK_COLORS[level];
  return (
    <span
      className={`rd-risk ${size === 'sm' ? 'sm' : ''}`}
      style={{ color, background: `${color}1f` }}
    >
      <span className="rd-risk-dot" style={{ background: color }} />
      {Math.round(score * 100)} % · {RISK_LABELS[level]}
    </span>
  );
}

export function RiskDot({ score }: { readonly score: number | null }) {
  const color = score == null ? 'var(--rd-text-3)' : RISK_COLORS[riskLevel(score)];
  return <span className="rd-risk-dot" style={{ background: color, width: 9, height: 9 }} />;
}
