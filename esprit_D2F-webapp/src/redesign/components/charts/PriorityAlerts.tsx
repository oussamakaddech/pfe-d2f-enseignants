import type { AlertSummary } from "@/models/analyse";
import { ChartSkeleton } from "../States";

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  GAP_CRITIQUE: { label: "Écart critique", icon: "⚠", color: "var(--rd-error)" },
  REGRESSION: { label: "Régression", icon: "↘", color: "var(--rd-error)" },
  STAGNATION: { label: "Stagnation", icon: "⏸", color: "var(--rd-warning)" },
  TENDANCE_DEPARTEMENT: { label: "Tendance département", icon: "📉", color: "var(--rd-warning)" },
  COMPLETION_FAIBLE: { label: "Complétion faible", icon: "✕", color: "var(--rd-info)" },
  BESOIN_NON_COUVERT: { label: "Besoin non couvert", icon: "∅", color: "var(--rd-info)" },
};

export default function PriorityAlerts({
  summary,
  loading,
}: {
  readonly summary: AlertSummary | null;
  readonly loading: boolean;
}) {
  if (loading && !summary) return <ChartSkeleton height={160} />;
  if (!summary) return <div className="rd-empty">Aucune alerte</div>;

  const byType = [...(summary.by_type ?? [])].sort((a, b) => b.count - a.count);
  if (byType.length === 0) return <div className="rd-empty">Aucune alerte ouverte</div>;

  return (
    <div className="rd-palerts">
      <div className="rd-palerts-head">
        <span className="rd-palerts-crit">{summary.critiques_ouvertes} critiques ouvertes</span>
        <span className="rd-palerts-total">{summary.total} alertes au total</span>
      </div>
      <div className="rd-palerts-list">
        {byType.map((a) => {
          const meta = TYPE_LABELS[a.key] ?? { label: a.key, icon: "•", color: "var(--rd-text-2)" };
          return (
            <div key={a.key} className="rd-palert-item" style={{ borderLeftColor: meta.color }}>
              <span className="rd-palert-icon" style={{ color: meta.color }}>{meta.icon}</span>
              <span className="rd-palert-label">{meta.label}</span>
              <span className="rd-palert-count">{a.count}</span>
            </div>
          );
        })}
      </div>
      <div className="rd-palerts-foot">
        {summary.top_competences.length > 0 && (
          <div className="rd-palerts-col">
            <div className="rd-palerts-col-title">Compétences en tension</div>
            {summary.top_competences.slice(0, 4).map((c) => (
              <span key={c.competence_id} className="rd-palert-chip">{c.competence_nom ?? `Comp. #${c.competence_id}`}</span>
            ))}
          </div>
        )}
        {summary.top_departements.length > 0 && (
          <div className="rd-palerts-col">
            <div className="rd-palerts-col-title">Départements prioritaires</div>
            {summary.top_departements.slice(0, 4).map((d) => (
              <span key={d.departement_id} className="rd-palert-chip">{d.departement_nom ?? d.departement_id}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
