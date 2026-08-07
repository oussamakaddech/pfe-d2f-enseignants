import { useMemo, useState } from 'react';
import type { RiskDistribution } from '@/redesign/contract';
import { RISK_COLORS, RISK_LABELS, type RiskLevelKey } from '@/redesign/risk';
import { ChartSkeleton, EmptyState } from './States';

const LEVEL_ORDER: RiskLevelKey[] = ['CRITIQUE', 'ELEVE', 'MODERE', 'FAIBLE'];
const DONUT_SIZE = 168;
const DONUT_STROKE = 26;
const SEG_GAP = 0.018; // ~1.8% du périmètre, espace entre segments

interface DeptBar {
  department: string;
  avgRiskPct: number;
  teachers: number;
}

export default function RiskDistributionChart({
  distribution,
  loading,
}: {
  readonly distribution: RiskDistribution | null;
  readonly loading: boolean;
}) {
  const [hoveredLevel, setHoveredLevel] = useState<RiskLevelKey | null>(null);

  if (loading && !distribution) return <ChartSkeleton height={260} />;
  if (!distribution) return <EmptyState description="Aucune donnée de distribution" />;

  const { total, byLevel, byDepartment } = distribution;
  const levels = LEVEL_ORDER.filter((l) => (byLevel[l] ?? 0) > 0);
  const maxDept = Math.max(1, ...byDepartment.map((d) => d.avgRiskPct));

  return (
    <div className="rd-dist">
      <div className="rd-dist-donut-wrap">
        <DonutSVG levels={levels} byLevel={byLevel} total={total} hoveredLevel={hoveredLevel} />
        <div className="rd-dist-donut-center">
          <div className="rd-dist-donut-total">{total}</div>
          <div className="rd-dist-donut-label">enseignants</div>
        </div>
      </div>

      <div className="rd-dist-legend">
        {levels.map((l) => {
          const count = byLevel[l] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isHovered = hoveredLevel === l;
          return (
            <div
              key={l}
              className={`rd-dist-legend-item ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredLevel(l)}
              onMouseLeave={() => setHoveredLevel(null)}
            >
              <span className="rd-dist-legend-dot" style={{ background: RISK_COLORS[l] }} />
              <span className="rd-dist-legend-label">{RISK_LABELS[l]}</span>
              <span className="rd-dist-legend-count">{count}</span>
              <span className="rd-dist-legend-pct">{pct} %</span>
            </div>
          );
        })}
      </div>

      {byDepartment.length > 0 && (
        <div className="rd-dist-depts">
          <div className="rd-dist-depts-title">Risque moyen par département</div>
          {byDepartment.map((d) => (
            <div key={d.department} className="rd-dist-dept-row">
              <span className="rd-dist-dept-name">{d.department}</span>
              <div className="rd-dist-dept-bar-wrap">
                <div className="rd-bar">
                  <span
                    style={{
                      width: `${(d.avgRiskPct / maxDept) * 100}%`,
                      background: riskColor(d.avgRiskPct),
                    }}
                  />
                </div>
              </div>
              <span className="rd-dist-dept-val">{d.avgRiskPct} %</span>
              <span className="rd-dist-dept-count">{d.teachers} ens.</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DonutSVG({
  levels,
  byLevel,
  total,
  hoveredLevel,
}: {
  readonly levels: RiskLevelKey[];
  readonly byLevel: Record<RiskLevelKey, number>;
  readonly total: number;
  readonly hoveredLevel: RiskLevelKey | null;
}) {
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;
  const r = (DONUT_SIZE - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() => {
    let acc = 0;
    return levels.map((l) => {
      const count = byLevel[l] ?? 0;
      const pct = total > 0 ? count / total : 0;
      const dash = Math.max(0, pct * circumference - (pct > 0 ? SEG_GAP * circumference : 0));
      const offset = -acc * circumference + circumference * 0.25;
      acc += pct;
      return { level: l, dash, offset, pct };
    });
  }, [levels, byLevel, total, circumference]);

  return (
    <svg
      width={DONUT_SIZE}
      height={DONUT_SIZE}
      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
      role="img"
      aria-label="Répartition du risque"
      className="rd-dist-donut"
    >
      <defs>
        <filter id="rd-donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--rd-surface-3)"
        strokeWidth={DONUT_STROKE}
      />
      {segments.map((seg, i) => (
        <circle
          key={seg.level}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={RISK_COLORS[seg.level]}
          strokeWidth={DONUT_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
          transform={`rotate(${(seg.offset * 180) / Math.PI} ${cx} ${cy})`}
          opacity={hoveredLevel != null && hoveredLevel !== seg.level ? 0.35 : 1}
          filter="url(#rd-donut-shadow)"
          style={{
            transition: 'opacity 0.2s ease, stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)',
            animation: `rd-donut-pop 0.5s ${0.06 * i}s cubic-bezier(0.22,1,0.36,1) both`,
          }}
        />
      ))}
    </svg>
  );
}

function riskColor(pct: number): string {
  if (pct >= 80) return RISK_COLORS.CRITIQUE;
  if (pct >= 60) return RISK_COLORS.ELEVE;
  if (pct >= 40) return RISK_COLORS.MODERE;
  return RISK_COLORS.FAIBLE;
}
