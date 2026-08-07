import type { FormationReco } from '@/redesign/contract';
import { ListSkeleton, EmptyState } from './States';

export default function FormationRecoList({
  recos,
  loading,
}: {
  readonly recos: FormationReco[];
  readonly loading: boolean;
}) {
  if (loading && recos.length === 0) return <ListSkeleton rows={4} />;
  if (recos.length === 0) return <EmptyState description="Aucune recommandation de formation" />;

  const sorted = [...recos].sort((a, b) => b.recommendationCount - a.recommendationCount);
  const maxReco = Math.max(1, ...sorted.map((r) => r.recommendationCount));

  return (
    <div className="rd-reco-list">
      {sorted.map((r, i) => {
        const successPct = Math.round(r.successProb * 100);
        const barWidth = (r.recommendationCount / maxReco) * 100;
        let ringColor: string;
        if (successPct >= 70) ringColor = 'var(--rd-success)';
        else if (successPct >= 40) ringColor = 'var(--rd-warning)';
        else ringColor = 'var(--rd-error)';
        const CR = 16;
        const CIRC = 2 * Math.PI * CR;
        return (
          <div key={r.formationId} className="rd-reco-item">
            <div className="rd-reco-rank">
              <span className={`rd-rank ${i === 0 ? 'top' : ''}`}>{i + 1}</span>
            </div>
            <div className="rd-reco-body">
              <div className="rd-reco-title">{r.title}</div>
              <div className="rd-reco-meta">
                <span>
                  {r.recommendationCount} recommandation{r.recommendationCount > 1 ? 's' : ''}
                </span>
                {r.avgScore != null && <span> · Score {r.avgScore.toFixed(1)}</span>}
              </div>
              <div className="rd-bar" style={{ marginTop: 6 }}>
                <span
                  style={{
                    width: `${barWidth}%`,
                    background:
                      'linear-gradient(90deg, color-mix(in srgb, var(--rd-accent) 75%, #fff), var(--rd-accent))',
                  }}
                />
              </div>
            </div>
            <div className="rd-reco-success-ring">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <title>Réussite {successPct} %</title>
                <circle
                  cx="22"
                  cy="22"
                  r={CR}
                  fill="none"
                  stroke="var(--rd-surface-3)"
                  strokeWidth="5"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={CR}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - successPct / 100)}
                  transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
                />
                <text
                  x="22"
                  y="25.5"
                  textAnchor="middle"
                  fontSize="12.5"
                  fontWeight="800"
                  fill={ringColor}
                >
                  {successPct}%
                </text>
              </svg>
              <span className="rd-reco-success-lbl">réussite</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
