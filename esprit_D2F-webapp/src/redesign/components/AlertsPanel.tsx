import type { AlertSummary } from "@/models/analyse";
import { ListSkeleton, EmptyState } from "./States";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

const SEV_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.10)", icon: "🔴", label: "Critique" },
  WARNING: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", icon: "🟠", label: "Avertissement" },
  INFO: { color: "#3b82f6", bg: "rgba(59,130,246,0.10)", icon: "🔵", label: "Information" },
};

const TYPE_LABELS: Record<string, string> = {
  GAP_CRITIQUE: "Écart critique",
  STAGNATION: "Stagnation",
  REGRESSION: "Régression",
  TENDANCE_DEPARTEMENT: "Tendance département",
  COMPLETION_FAIBLE: "Complétion faible",
  BESOIN_NON_COUVERT: "Besoin non couvert",
};

export default function AlertsPanel({
  alerts,
  loading,
}: {
  alerts: AlertSummary | null;
  loading: boolean;
}) {
  if (loading && !alerts) return <ListSkeleton rows={5} />;
  if (!alerts) return <EmptyState description="Aucune donnée d'alertes" />;

  const items = [
    ...((alerts.by_severite ?? []).map((s) => ({
      severity: s.key,
      count: s.count,
    }))),
  ].sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
  });

  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rd-alerts">
      <div className="rd-alerts-summary-row">
        <div className="rd-alerts-stat">
          <div className="rd-alerts-stat-val" style={{ color: "var(--rd-text)" }}>{alerts.total}</div>
          <div className="rd-alerts-stat-lbl">Total</div>
        </div>
        <div className="rd-alerts-stat">
          <div className="rd-alerts-stat-val" style={{ color: "#f59e0b" }}>{alerts.nouvelles}</div>
          <div className="rd-alerts-stat-lbl">Nouvelles</div>
        </div>
        <div className="rd-alerts-stat">
          <div className="rd-alerts-stat-val" style={{ color: "#ef4444" }}>{alerts.critiques_ouvertes}</div>
          <div className="rd-alerts-stat-lbl">Critiques ouvertes</div>
        </div>
      </div>

      <div className="rd-alerts-bars">
        {items.map((item) => {
          const cfg = SEV_CONFIG[item.severity] ?? SEV_CONFIG.INFO;
          return (
            <div key={item.severity} className="rd-alerts-bar-row">
              <div className="rd-alerts-bar-label">
                <span className="rd-alerts-bar-dot" style={{ background: cfg.color }} />
                <span>{cfg.label}</span>
              </div>
              <div className="rd-alerts-bar-track">
                <div
                  className="rd-alerts-bar-fill"
                  style={{ width: `${(item.count / maxCount) * 100}%`, background: cfg.color }}
                />
              </div>
              <span className="rd-alerts-bar-count">{item.count}</span>
            </div>
          );
        })}
      </div>

      {alerts.top_competences?.length > 0 && (
        <div className="rd-alerts-top">
          <div className="rd-alerts-top-title">Compétences les plus alertées</div>
          {alerts.top_competences.slice(0, 5).map((c, i) => (
            <div key={c.competence_id} className="rd-alerts-top-item">
              <span className="rd-rank">{i + 1}</span>
              <span className="rd-alerts-top-label">{c.competence_nom ?? `Compétence #${c.competence_id}`}</span>
              <span className="rd-alerts-top-count">{c.count} alertes</span>
            </div>
          ))}
        </div>
      )}

      {alerts.top_departements?.length > 0 && (
        <div className="rd-alerts-top">
          <div className="rd-alerts-top-title">Départements les plus concernés</div>
          {alerts.top_departements.slice(0, 5).map((d, i) => (
            <div key={d.departement_id} className="rd-alerts-top-item">
              <span className="rd-rank">{i + 1}</span>
              <span className="rd-alerts-top-label">{d.departement_nom ?? d.departement_id}</span>
              <span className="rd-alerts-top-count">{d.count} alertes</span>
            </div>
          ))}
        </div>
      )}

      {alerts.trend_30j?.length > 0 && (
        <div className="rd-alerts-trend">
          <div className="rd-alerts-top-title">Tendance sur 30 jours</div>
          <div className="rd-alerts-trend-chart">
            {alerts.trend_30j.map((p, i) => {
              const maxTrend = Math.max(1, ...alerts.trend_30j.map((t) => t.total));
              const h = (p.total / maxTrend) * 48;
              return (
                <div key={i} className="rd-alerts-trend-bar" title={`${dayjs(p.date).format("DD MMM")} : ${p.total} total, ${p.critiques} critiques`}>
                  <div className="rd-alerts-trend-crit" style={{ height: `${(p.critiques / maxTrend) * 48}px` }} />
                  <div className="rd-alerts-trend-total" style={{ height: `${h}px` }} />
                </div>
              );
            })}
          </div>
          <div className="rd-chart-legend" style={{ marginTop: 8 }}>
            <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#ef4444" }} /> Critiques</span>
            <span className="rd-legend-item"><span className="rd-legend-swatch" style={{ background: "#94a3b8" }} /> Total</span>
          </div>
        </div>
      )}
    </div>
  );
}
