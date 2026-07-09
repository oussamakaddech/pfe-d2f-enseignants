import { useMemo } from "react";
import { Empty } from "antd";
import type { RiskEvolutionPoint } from "@/models/analyse";
import { neutral } from "@/styles/themes/tokens";

interface GlassTrendProps {
  readonly data: readonly RiskEvolutionPoint[];
  readonly height?: number;
}

const COLORS = { critical: "#ef4444", high: "#f59e0b" } as const;

/** Mini graphe en lignes (SVG natif) — évolution mensuelle du risque. */
export default function GlassTrend({ data, height = 220 }: GlassTrendProps) {
  const view = useMemo(() => {
    if (data.length === 0) return null;
    const width = Math.max(320, data.length * 64);
    const padX = 34, padY = 20;
    const maxVal = Math.max(1, ...data.map((d) => Math.max(d.critical, d.high)));
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const X = (i: number) => padX + i * stepX;
    const Y = (v: number) => padY + innerH - (v / maxVal) * innerH;
    const pts = (key: "critical" | "high") =>
      data.map((d, i) => ({ x: X(i), y: Y(d[key]) }));
    const path = (key: "critical" | "high") =>
      pts(key).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const labels = data.map((d, i) => ({ x: X(i), label: d.month, show: data.length <= 8 || i % 2 === 0 }));
    const yTicks = [0, maxVal / 2, maxVal].map((v) => ({ y: Y(v), v }));
    return { width, padX, padY, innerH, X, Y, path, ptsCritical: pts("critical"), ptsHigh: pts("high"), labels, yTicks, maxVal };
  }, [data, height]);

  if (!view) return <Empty description="Pas d'historique de risque disponible" />;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={view.width} height={height} role="img" aria-label="Évolution du risque">
        {view.yTicks.map((t, i) => (
          <g key={i}>
            <line x1={view.padX} y1={t.y} x2={view.width - view.padX} y2={t.y} stroke="rgba(15,23,42,0.06)" />
            <text x={view.padX - 8} y={t.y + 3} fontSize={10} fill={neutral[400]} textAnchor="end">{Math.round(t.v)}</text>
          </g>
        ))}
        <path d={view.path("critical")} fill="none" stroke={COLORS.critical} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={view.path("high")} fill="none" stroke={COLORS.high} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {view.ptsCritical.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={3} fill={COLORS.critical} />)}
        {view.ptsHigh.map((p, i) => <circle key={`h${i}`} cx={p.x} cy={p.y} r={3} fill={COLORS.high} />)}
        {view.labels.map((l, i) => l.show && (
          <text key={`${l.label}-${i}`} x={l.x} y={height - 6} fontSize={10} fill={neutral[500]} textAnchor="middle">{l.label}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: neutral[600], marginTop: 4 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 12, height: 3, background: COLORS.critical, display: "inline-block", borderRadius: 2 }} />Critique</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 12, height: 3, background: COLORS.high, display: "inline-block", borderRadius: 2 }} />Élevé</span>
      </div>
    </div>
  );
}
