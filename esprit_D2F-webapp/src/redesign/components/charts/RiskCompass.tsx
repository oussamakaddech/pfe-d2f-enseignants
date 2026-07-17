import { RISK_ORDER, RISK_LABELS, RISK_COLORS } from "@/redesign/risk";
import type { RiskDistribution } from "@/redesign/contract";
import { ChartSkeleton } from "../States";

export default function RiskCompass({ data, loading }: { readonly data: RiskDistribution | null; readonly loading: boolean }) {
  if (loading && !data) return <ChartSkeleton height={220} />;
  if (!data || data.total === 0) return <div className="rd-empty">Aucun enseignant classé</div>;

  const size = 200;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = RISK_ORDER.map((lvl) => {
    const value = data.byLevel[lvl] ?? 0;
    const frac = value / data.total;
    const seg = {
      lvl,
      value,
      dash: frac * circumference,
      offset,
      color: RISK_COLORS[lvl],
    };
    offset += frac * circumference;
    return seg;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "0 0 auto" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rd-surface-3)" strokeWidth={stroke} />
          {segments.map((s) => (
            <circle
              key={s.lvl}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 0.7s ease" }}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{data.total}</div>
            <div className="rd-muted" style={{ fontSize: 11.5 }}>enseignants</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 180 }} className="rd-chart-legend" >
        {RISK_ORDER.map((lvl) => {
          const v = data.byLevel[lvl] ?? 0;
          const pct = data.total > 0 ? Math.round((v / data.total) * 100) : 0;
          return (
            <div key={lvl} className="rd-legend-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 84 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="rd-legend-swatch" style={{ background: RISK_COLORS[lvl] }} />
                <b style={{ color: "var(--rd-text)" }}>{v}</b>
                <span className="rd-muted" style={{ fontSize: 11.5 }}>· {pct}%</span>
              </span>
              <span className="rd-muted" style={{ fontSize: 11.5, paddingLeft: 17 }}>{RISK_LABELS[lvl]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
