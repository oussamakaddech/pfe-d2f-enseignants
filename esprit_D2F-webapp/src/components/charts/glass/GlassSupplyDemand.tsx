import { useMemo, useState } from 'react';
import { Empty, Tag } from 'antd';
import type { SupplyDemandItem } from '@/models/analyse';
import { neutral } from '@/styles/themes/tokens';

interface GlassSupplyDemandProps {
  readonly data: SupplyDemandItem[] | undefined;
  readonly loading?: boolean;
}

const QUADRANT: Record<string, { color: string; label: string; tag: string }> = {
  INVESTIR: { color: '#ef4444', label: 'Investir', tag: 'red' },
  MAINTENIR: { color: '#10b981', label: 'Maintenir', tag: 'green' },
  SURPLUS: { color: '#6b7280', label: 'Surplus', tag: 'default' },
  SURVEILLER: { color: '#f59e0b', label: 'Surveiller', tag: 'orange' },
};

/** Matrice Offre vs Demande par compétence — barres horizontales (from scratch). */
export default function GlassSupplyDemand({ data, loading }: GlassSupplyDemandProps) {
  const [topN, setTopN] = useState(8);
  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.demand_score - a.demand_score).slice(0, topN);
  }, [data, topN]);

  if (!data) return <Empty description="Chargement…" />;
  if (data.length === 0) return <Empty description="Aucune donnée offre/demande" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Tag
          style={{ cursor: 'pointer', borderRadius: 999 }}
          color={topN === 8 ? 'blue' : undefined}
          onClick={() => setTopN(topN === 8 ? 15 : 8)}
        >
          {topN === 8 ? 'Top 8' : 'Top 15'}
        </Tag>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((d) => {
          const q = QUADRANT[d.quadrant] ?? QUADRANT.SURVEILLER;
          return (
            <div key={d.competence_id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: neutral[800] }}>
                  {d.competence_nom}
                  <span
                    style={{ color: neutral[400], fontWeight: 400, marginLeft: 6, fontSize: 11 }}
                  >
                    {d.domaine_nom}
                  </span>
                </span>
                <Tag
                  style={{
                    color: q.color,
                    background: `${q.color}1a`,
                    borderColor: 'transparent',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {q.label}
                </Tag>
              </div>
              <div
                style={{
                  position: 'relative',
                  height: 10,
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.07)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(4, d.demand_score * 100)}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${q.color}cc, ${q.color})`,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: neutral[500],
                  marginTop: 3,
                }}
              >
                <span>Demande {Math.round(d.demand_score * 100)}%</span>
                <span>
                  {d.nb_enseignants} ens. · {d.nb_critiques} critiques
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
