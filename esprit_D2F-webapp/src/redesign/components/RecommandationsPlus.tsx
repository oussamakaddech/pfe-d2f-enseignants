import { useState } from 'react';
import { Card } from '@/redesign/components/Section';
import { ChartSkeleton } from '@/redesign/components/States';
import { useGroupedRecommendations, useSimulateWhatIf } from '@/hooks/analyse/useAnalytics';
import type {
  RecoGroupBy,
  WhatIfAction,
  WhatIfResponse,
  Recommendation,
  RecommendationGroup,
} from '@/models/analyse';

const RISK: Record<string, string> = {
  CRITIQUE: '#ef4444',
  ELEVE: '#f97316',
  MODERE: '#3b82f6',
  FAIBLE: '#10b981',
};
const scoreColor = (s: number) => {
  if (s >= 0.75) return RISK.CRITIQUE;
  if (s >= 0.5) return RISK.ELEVE;
  if (s >= 0.25) return RISK.MODERE;
  return RISK.FAIBLE;
};
const niveauColor = (n: string) => RISK[n] ?? RISK.MODERE;

const inputStyle: React.CSSProperties = {
  background: 'var(--rd-surface)',
  border: '1px solid var(--rd-border)',
  borderRadius: 'var(--rd-radius-sm)',
  color: 'var(--rd-text-1)',
  padding: '6px 9px',
  fontSize: 13,
  outline: 'none',
};

const GROUP_OPTIONS: { label: string; value: RecoGroupBy }[] = [
  { label: 'Compétence', value: 'competence' },
  { label: 'Type', value: 'type' },
  { label: 'Urgence', value: 'urgence' },
];

/* ── Regroupement ─────────────────────────────────────────── */

function GroupRecoCard({ r }: { readonly r: Recommendation }) {
  const bars = [
    { label: 'Pertinence', value: r.score_pertinence, color: '#3b82f6' },
    { label: 'Réussite', value: r.score_reussite, color: '#10b981' },
    { label: 'Disponibilité', value: r.score_disponibilite, color: '#f59e0b' },
    { label: 'Pairs', value: r.facteurs_score?.pairs ?? null, color: '#8b5cf6' },
  ];
  return (
    <div className="rd-surv-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
      >
        <span style={{ fontWeight: 700, color: 'var(--rd-text-1)', fontSize: 13 }}>
          {r.formation_titre}
        </span>
        {r.formation_type && <span className="rd-chip">{r.formation_type}</span>}
      </div>
      <div className="rd-bar-wrap">
        <span style={{ fontSize: 11.5, color: 'var(--rd-text-3)', minWidth: 84 }}>
          Score global
        </span>
        <div className="rd-bar-track">
          <div className="rd-bar">
            <span
              style={{
                width: `${Math.round(r.score_global * 100)}%`,
                background: scoreColor(r.score_global),
              }}
            />
          </div>
        </div>
        <span className="rd-bar-num">{Math.round(r.score_global * 100)}%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
        {bars.map((b) => (
          <div key={b.label} className="rd-bar-wrap">
            <span style={{ fontSize: 11, color: 'var(--rd-text-3)', minWidth: 78 }}>{b.label}</span>
            <div className="rd-bar-track">
              <div className="rd-bar">
                <span
                  style={{
                    width: `${b.value == null ? 0 : Math.round(b.value * 100)}%`,
                    background: b.color,
                  }}
                />
              </div>
            </div>
            <span className="rd-bar-num">
              {b.value == null ? '—' : `${Math.round(b.value * 100)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Regroupement({ enseignantId }: { readonly enseignantId: string }) {
  const [groupBy, setGroupBy] = useState<RecoGroupBy>('competence');
  const { data, isLoading, isError } = useGroupedRecommendations(enseignantId, groupBy);

  return (
    <Card
      title="Regroupement des recommandations"
      subtitle="Scoring avancé (MSAS) — pertinence, réussite, disponibilité et signal collaboratif"
      icon={
        <span
          className="rd-card-ic"
          style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)' }}
        >
          ⛓
        </span>
      }
      extra={
        <div className="rd-seg rd-seg--sm">
          {GROUP_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`rd-seg-btn ${groupBy === o.value ? 'active' : ''}`}
              onClick={() => setGroupBy(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      }
    >
      {(() => {
        if (isError) return <div className="rd-empty">Impossible de charger le regroupement.</div>;
        if (isLoading) return <ChartSkeleton height={200} />;
        if (!data || data.total === 0)
          return (
            <div className="rd-empty">Aucune recommandation à regrouper pour cet enseignant.</div>
          );
        return (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {data.groups.map((g: RecommendationGroup) => (
                <div key={g.group_key} className="rd-bar-wrap">
                  <span
                    style={{
                      fontSize: 12.5,
                      color: 'var(--rd-text-2)',
                      minWidth: 150,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.group_label}
                  </span>
                  <div className="rd-bar-track">
                    <div className="rd-bar">
                      <span
                        style={{
                          width: `${Math.round(g.score_max * 100)}%`,
                          background: scoreColor(g.score_max),
                        }}
                      />
                    </div>
                  </div>
                  <span className="rd-bar-num">{Math.round(g.score_max * 100)}%</span>
                  <span className="rd-chip" style={{ minWidth: 34, justifyContent: 'center' }}>
                    {g.nb}
                  </span>
                </div>
              ))}
            </div>
            <div className="rd-grid-2">
              {data.groups.map((g: RecommendationGroup) => (
                <div key={g.group_key} className="rd-card" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <strong style={{ color: 'var(--rd-text-1)', fontSize: 13.5 }}>
                      {g.group_label}
                    </strong>
                    <span
                      className="rd-chip"
                      style={{
                        background: scoreColor(g.score_max) + '22',
                        color: scoreColor(g.score_max),
                      }}
                    >
                      max {Math.round(g.score_max * 100)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.items.map((r) => (
                      <GroupRecoCard key={r.id} r={r} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}
    </Card>
  );
}

/* ── Simulation what-if (chart SVG) ───────────────────────── */

function CompareBars({
  risque,
  gaps,
}: {
  readonly risque: WhatIfResponse['risk_before'];
  readonly gaps: WhatIfResponse;
}) {
  const W = 560,
    H = 210,
    padX = 30,
    base = H - 34,
    top = 16;
  const groups = [
    {
      label: 'Risque',
      unit: '%',
      max: 100,
      before: risque.score * 100,
      after: gaps.risk_after.score * 100,
      beforeColor: niveauColor(risque.niveau),
      afterColor: niveauColor(gaps.risk_after.niveau),
    },
    {
      label: 'Gaps',
      unit: '',
      max: Math.max(gaps.nb_gaps_before, 1),
      before: gaps.nb_gaps_before,
      after: gaps.nb_gaps_after,
      beforeColor: '#b51200',
      afterColor: '#10b981',
    },
  ];
  const clusterW = (W - padX * 2) / groups.length;
  const barW = 56;
  return (
    <div className="rd-chart">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Impact simulé">
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke="var(--rd-border)" />
        {groups.map((g, gi) => {
          const cx = padX + clusterW * gi + clusterW / 2;
          const hB = ((base - top) * g.before) / g.max;
          const hA = ((base - top) * g.after) / g.max;
          return (
            <g key={g.label}>
              <text
                x={cx}
                y={top - 4}
                textAnchor="middle"
                fontSize="11"
                fill="var(--rd-text-3)"
                fontWeight={700}
              >
                {g.label}
              </text>
              <rect
                x={cx - barW - 6}
                y={base - hB}
                width={barW}
                height={hB}
                rx={4}
                fill={g.beforeColor}
                opacity={0.85}
              />
              <rect
                x={cx + 6}
                y={base - hA}
                width={barW}
                height={hA}
                rx={4}
                fill={g.afterColor}
                opacity={0.95}
              />
              <text
                x={cx - barW / 2 - 6}
                y={base - hB - 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight={700}
                fill={g.beforeColor}
              >
                {Math.round(g.before)}
                {g.unit}
              </text>
              <text
                x={cx + barW / 2 + 6}
                y={base - hA - 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight={700}
                fill={g.afterColor}
              >
                {Math.round(g.after)}
                {g.unit}
              </text>
              <text
                x={cx - barW / 2 - 6}
                y={base + 14}
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--rd-text-3)"
              >
                avant
              </text>
              <text
                x={cx + barW / 2 + 6}
                y={base + 14}
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--rd-text-3)"
              >
                après
              </text>
            </g>
          );
        })}
      </svg>
      <div className="rd-chart-legend">
        <span className="rd-legend-item">
          <span className="rd-legend-swatch" style={{ background: '#b51200' }} /> Avant
        </span>
        <span className="rd-legend-item">
          <span className="rd-legend-swatch" style={{ background: '#10b981' }} /> Après simulation
        </span>
      </div>
    </div>
  );
}

interface PlanRow {
  key: number;
  competence_id: number;
  niveau_vise: number;
}

function WhatIf({ enseignantId }: { readonly enseignantId: string }) {
  const [rows, setRows] = useState<PlanRow[]>([{ key: 1, competence_id: 1, niveau_vise: 4 }]);
  const [horizon, setHorizon] = useState<number>(6);
  const sim = useSimulateWhatIf(enseignantId);

  const addRow = () =>
    setRows((p) => [...p, { key: p.length + 1, competence_id: 1, niveau_vise: 4 }]);
  const removeRow = (k: number) =>
    setRows((p) => (p.length > 1 ? p.filter((r) => r.key !== k) : p));
  const update = (k: number, patch: Partial<PlanRow>) =>
    setRows((p) => p.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  const run = async () => {
    const plan: WhatIfAction[] = rows
      .filter((r) => r.competence_id > 0 && r.niveau_vise >= 1 && r.niveau_vise <= 5)
      .map(({ key: _k, ...rest }) => rest);
    if (!plan.length) return;
    await sim.mutateAsync({ plan, horizon_mois: horizon });
  };

  const res: WhatIfResponse | null = sim.data ?? null;

  return (
    <Card
      title="Simulation what-if — impact d'un plan de formation"
      subtitle="Projetez le risque et les gaps comme si le plan avait été suivi"
      icon={
        <span
          className="rd-card-ic"
          style={{ color: '#b51200', background: 'rgba(181,18,0,0.10)' }}
        >
          🧪
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <span style={{ fontSize: 12, color: 'var(--rd-text-3)', minWidth: 70 }}>
              Compétence
            </span>
            <input
              type="number"
              min={1}
              value={row.competence_id}
              onChange={(e) => update(row.key, { competence_id: Number(e.target.value) || 0 })}
              style={{ ...inputStyle, width: 90 }}
              placeholder="ID"
            />
            <span style={{ fontSize: 12, color: 'var(--rd-text-3)', minWidth: 70 }}>
              Niveau visé
            </span>
            <select
              value={row.niveau_vise}
              onChange={(e) => update(row.key, { niveau_vise: Number(e.target.value) })}
              style={{ ...inputStyle, width: 90 }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{`N${n}`}</option>
              ))}
            </select>
            {rows.length > 1 && (
              <button
                className="rd-btn rd-btn-ghost"
                style={{ padding: '6px 10px' }}
                onClick={() => removeRow(row.key)}
              >
                Retirer
              </button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="rd-btn rd-btn-ghost" style={{ padding: '6px 12px' }} onClick={addRow}>
            + Ajouter une action
          </button>
          <span style={{ fontSize: 12, color: 'var(--rd-text-3)' }}>Horizon</span>
          <div className="rd-seg rd-seg--sm">
            {[3, 6, 12].map((h) => (
              <button
                key={h}
                className={`rd-seg-btn ${horizon === h ? 'active' : ''}`}
                onClick={() => setHorizon(h)}
              >
                {h} mois
              </button>
            ))}
          </div>
          <button
            className="rd-btn rd-btn-primary"
            style={{ marginLeft: 'auto' }}
            disabled={sim.isPending}
            onClick={run}
          >
            {sim.isPending ? 'Simulation…' : "Simuler l'impact"}
          </button>
        </div>
      </div>

      {sim.isError && (
        <div className="rd-empty" style={{ color: 'var(--rd-error)' }}>
          La simulation a échoué. Vérifiez l'identifiant et les actions.
        </div>
      )}

      {res && (
        <>
          <CompareBars risque={res.risk_before} gaps={res} />
          <div
            className="rd-kpi-grid"
            style={{ marginTop: 14, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}
          >
            <div className="rd-card" style={{ padding: 12 }}>
              <div className="rd-card-sub">Réduction risque</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>
                {Math.round(res.risk_reduction * 100)}%
              </div>
            </div>
            <div className="rd-card" style={{ padding: 12 }}>
              <div className="rd-card-sub">Gaps résolus</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>
                {res.nb_gaps_resolus}
              </div>
            </div>
            <div className="rd-card" style={{ padding: 12 }}>
              <div className="rd-card-sub">Gaps avant → après</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rd-text-1)' }}>
                {res.nb_gaps_before} → {res.nb_gaps_after}
              </div>
            </div>
            <div className="rd-card" style={{ padding: 12 }}>
              <div className="rd-card-sub">Niveau risque</div>
              <div
                style={{ fontSize: 22, fontWeight: 800, color: niveauColor(res.risk_after.niveau) }}
              >
                {res.risk_after.niveau}
              </div>
            </div>
          </div>

          <div className="rd-section-sub" style={{ marginTop: 16 }}>
            <span className="rd-section-sub-title">Détail par compétence</span>
          </div>
          {res.details.length === 0 ? (
            <div className="rd-empty">Aucun détail retourné.</div>
          ) : (
            <div className="rd-reco-scroll">
              <div className="rd-reco-table" style={{ minWidth: 640 }}>
                <div className="rd-reco-row rd-reco-head rd-reco-7">
                  <span>Compétence</span>
                  <span>Niv. actuel</span>
                  <span>Niv. requis</span>
                  <span>Visé</span>
                  <span>Gap avant→après</span>
                  <span>Urgence</span>
                  <span>Résolu</span>
                </div>
                {res.details.map((d) => (
                  <div key={d.competence_id} className="rd-reco-row rd-reco-7">
                    <span>C{d.competence_id}</span>
                    <span>{d.niveau_actuel}</span>
                    <span>{d.niveau_requis}</span>
                    <span>{d.niveau_vise}</span>
                    <span>
                      {d.gap_avant.toFixed(1)} → {d.gap_apres.toFixed(1)}
                    </span>
                    <span>
                      <span
                        className="rd-chip"
                        style={{
                          background: niveauColor(d.urgence_apres) + '22',
                          color: niveauColor(d.urgence_apres),
                        }}
                      >
                        {d.urgence_apres}
                      </span>
                    </span>
                    <span>
                      {d.resolu ? (
                        <span className="rd-chip rd-chip-success">Oui</span>
                      ) : (
                        <span className="rd-chip">Non</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ── Section agrégée ──────────────────────────────────────── */

export default function RecommandationsPlus({
  enseignantId,
}: {
  readonly enseignantId: string | null;
}) {
  if (!enseignantId) {
    return (
      <div className="rd-empty">Sélectionnez un enseignant pour explorer ses recommandations.</div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Regroupement enseignantId={enseignantId} />
      <WhatIf enseignantId={enseignantId} />
    </div>
  );
}
