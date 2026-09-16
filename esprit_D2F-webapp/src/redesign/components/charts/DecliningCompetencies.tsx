import type { DecliningCompetency } from "@/models/analyse";
import { ChartSkeleton } from "../States";

/** Lit un champ en tolérant les deux conventions (snake/camel) du backend. */
function pick(c: DecliningCompetency, snake: string, camel: string): unknown {
  const record = c as unknown as Record<string, unknown>;
  return record[snake] ?? record[camel];
}

export default function DecliningCompetencies({
  items,
  loading,
}: {
  readonly items: DecliningCompetency[];
  readonly loading: boolean;
}) {
  if (loading && items.length === 0) return <ChartSkeleton height={200} />;
  if (items.length === 0) return <div className="rd-empty">Aucune compétence en déclin détectée</div>;

  const maxDecline = Math.max(0.5, ...items.map((c) => Math.abs(Number(pick(c, "delta", "delta")) || 0)));

  return (
    <div className="rd-declin">
      {items.map((c) => {
        const name = String(pick(c, "competence_nom", "competency_name") ?? "—");
        const domain = String(pick(c, "domaine_nom", "domaine_name") ?? "Compétence transversale");
        const delta = Number(pick(c, "delta", "delta")) || 0;
        const actuel = Number(pick(c, "niveau_actuel", "niveau_actuel"));
        const ancien = Number(pick(c, "niveau_ancien", "niveau_ancien"));
        const decline = Math.abs(delta);
        const pct = (decline / maxDecline) * 100;
        return (
          <div key={String(pick(c, "competence_id", "competency_id"))} className="rd-declin-row">
            <div className="rd-declin-main">
              <div className="rd-declin-name">{name}</div>
              <div className="rd-declin-sub">{domain}</div>
            </div>
            <div className="rd-declin-metrics">
              <div className="rd-bar" style={{ width: 120 }}>
                <span style={{ width: `${pct}%`, background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
              </div>
              <span className="rd-declin-growth" style={{ color: "var(--rd-error)" }}>
                ▼ {decline.toFixed(1)} pts
              </span>
              {!Number.isNaN(actuel) && !Number.isNaN(ancien) && (
                <span className="rd-declin-levels">{ancien.toFixed(1)} → {actuel.toFixed(1)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
