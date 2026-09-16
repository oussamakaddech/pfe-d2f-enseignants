import type { CSSProperties } from "react";
import type { SupplyDemandItem } from "@/redesign/contract";
import { RISK_COLORS, RISK_LABELS } from "@/redesign/risk";
import { ChartSkeleton } from "../States";

const QUAD_COLORS: Record<SupplyDemandItem["quadrant"], string> = {
  INVESTIR: RISK_COLORS.CRITIQUE,
  SURVEILLER: "#f59e0b",
  MAINTENIR: "#10b981",
  SURPLUS: "#3b82f6",
};

const QUAD_LABELS: Record<SupplyDemandItem["quadrant"], string> = {
  INVESTIR: "Investir",
  SURVEILLER: "Surveiller",
  MAINTENIR: "Maintenir",
  SURPLUS: "Surplus",
};

export default function SupplyDemandMatrix({ items, loading }: { readonly items: SupplyDemandItem[]; readonly loading: boolean }) {
  if (loading && items.length === 0) return <ChartSkeleton height={220} />;
  if (items.length === 0) return <div className="rd-empty">Aucune pression compétence détectée</div>;

  const sorted = [...items].sort((a, b) => b.impactedTeachers - a.impactedTeachers);
  const maxImpact = Math.max(1, ...sorted.map((i) => i.impactedTeachers));

  return (
    <div>
      <div className="rd-sd-head">
        <div>Compétence</div>
        <div className="num">Demande</div>
        <div>Pression</div>
        <div style={{ textAlign: "center" }}>Action</div>
      </div>
      {sorted.map((it) => {
        const qc = QUAD_COLORS[it.quadrant];
        const urgColor = RISK_COLORS[it.urgency];
        const urgLabel = RISK_LABELS[it.urgency] ?? it.urgency;
        return (
          <div key={it.competenceId} className="rd-sd-row" style={{ "--sd-accent": urgColor } as CSSProperties}>
            <div>
              <div className="rd-sd-name">{it.competenceName}</div>
              <div className="rd-sd-domain">{it.domain} · {it.impactedTeachers} enseignants</div>
            </div>
            <div className="rd-sd-num" style={{ color: "var(--rd-text-2)" }}>{it.demandPct} %</div>
            <div className="rd-sd-urg">
              <div className="rd-bar">
                <span style={{ width: `${(it.impactedTeachers / maxImpact) * 100}%`, background: urgColor }} />
              </div>
              <span className="rd-sd-urg-label" style={{ color: urgColor }}>{urgLabel}</span>
            </div>
            <span className="rd-quad" style={{ background: qc }}>{QUAD_LABELS[it.quadrant]}</span>
          </div>
        );
      })}
    </div>
  );
}
