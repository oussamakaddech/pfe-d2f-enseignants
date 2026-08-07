import { useMemo } from 'react';
import { Empty, Spin } from 'antd';
import type { RiskDistribution } from '@/models/analyse';
import { neutral } from '@/styles/themes/tokens';

interface GlassRiskDistributionProps {
  readonly data: RiskDistribution | undefined;
  readonly loading?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  CRITIQUE: '#ef4444',
  ELEVE: '#f97316',
  MODERE: '#f59e0b',
  FAIBLE: '#10b981',
};
const LEVEL_ORDER = ['CRITIQUE', 'ELEVE', 'MODERE', 'FAIBLE'] as const;
const BUCKET_COLORS = ['#10b981', '#6ee7b7', '#f59e0b', '#f97316', '#ef4444'];

/** Distribution du risque : histogramme + donut par niveau + départements. */
export default function GlassRiskDistribution({ data, loading }: GlassRiskDistributionProps) {
  const histo = useMemo(() => {
    if (!data?.histogram?.length) return null;
    const max = Math.max(1, ...data.histogram.map((b) => b.count));
    return { max };
  }, [data]);

  if (loading && !data)
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  if (!data) return <Empty description="Aucune donnée de distribution" />;

  const levels = LEVEL_ORDER.map((k) => ({ key: k, value: data.by_level?.[k] ?? 0 }));
  const total = levels.reduce((s, l) => s + l.value, 0) || 1;
  const R = 46,
    C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div>
      {/* Histogramme */}
      <div style={{ fontSize: 12, fontWeight: 700, color: neutral[600], marginBottom: 8 }}>
        Répartition par tranche de risque
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
        {data.histogram.map((b, i) => {
          const h = histo ? (b.count / histo.max) * 100 : 0;
          return (
            <div
              key={b.range}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: neutral[700] }}>{b.count}</span>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(h, 2)}%`,
                  borderRadius: '8px 8px 4px 4px',
                  background: `linear-gradient(180deg, ${BUCKET_COLORS[i] ?? '#6b7280'}, ${BUCKET_COLORS[i] ?? '#6b7280'}aa)`,
                }}
              />
              <span style={{ fontSize: 10, color: neutral[500], textAlign: 'center' }}>
                {b.range}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 18, alignItems: 'center' }}
      >
        {/* Donut par niveau */}
        <div style={{ position: 'relative', width: 120, height: 120, flex: '0 0 auto' }}>
          <svg width={120} height={120}>
            <circle
              cx={60}
              cy={60}
              r={R}
              fill="none"
              stroke="rgba(15,23,42,0.06)"
              strokeWidth={16}
            />
            {levels.map((l) => {
              const frac = l.value / total;
              const seg = frac * C;
              const dash = `${seg} ${C - seg}`;
              const offset = -acc * C;
              acc += frac;
              return (
                <circle
                  key={l.key}
                  cx={60}
                  cy={60}
                  r={R}
                  fill="none"
                  stroke={LEVEL_COLORS[l.key]}
                  strokeWidth={16}
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: neutral[800], lineHeight: 1 }}>
                {data.total ?? total}
              </div>
              <div style={{ fontSize: 10, color: neutral[500] }}>enseignants</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {levels.map((l) => (
            <div
              key={l.key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}
            >
              <span
                style={{ width: 10, height: 10, borderRadius: 3, background: LEVEL_COLORS[l.key] }}
              />
              <span style={{ color: neutral[700], fontWeight: 600, minWidth: 64 }}>{l.key}</span>
              <span style={{ color: neutral[500] }}>{l.value}</span>
            </div>
          ))}
        </div>

        {/* Départements */}
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: neutral[600], marginBottom: 8 }}>
            Par département
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.by_department ?? []).map((d) => (
              <div key={d.departement}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: neutral[700], fontWeight: 600 }}>{d.departement}</span>
                  <span style={{ color: neutral[500] }}>
                    {Math.round(d.score_risque_moyen * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 999,
                    background: 'rgba(15,23,42,0.07)',
                    overflow: 'hidden',
                    marginTop: 3,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(d.score_risque_moyen * 100)}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg,#b51200,#e23744)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
