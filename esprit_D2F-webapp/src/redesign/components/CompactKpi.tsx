import type { ReactNode, CSSProperties } from "react";
import { NA_CALC } from "@/utils/states";
import type { Trend } from "@/redesign/format";

type Unit = "int" | "coverage" | "pct" | "custom";

function formatValue(value: number | null, unit: Unit, customText?: string): string {
  if (value == null || Number.isNaN(value)) return NA_CALC;
  if (unit === "custom") return customText ?? Math.round(value).toLocaleString("fr-FR");
  if (unit === "int") return Math.round(value).toLocaleString("fr-FR");
  return `${Math.round(value)} %`;
}

/** Variante compacte du KpiCard — privilégie la densité (Analyse Prédictive). */
export default function CompactKpi({
  label,
  value,
  unit = "int",
  customText,
  icon,
  accent = "#b51200",
  accentBg = "rgba(181,18,0,0.10)",
  trend,
  trendLabel,
  helper,
  loading = false,
}: {
  label: string;
  value: number | null | undefined;
  unit?: Unit;
  customText?: string;
  icon: ReactNode;
  accent?: string;
  accentBg?: string;
  trend?: Trend | null;
  trendLabel?: string;
  helper?: string;
  loading?: boolean;
}) {
  const shown = value == null || Number.isNaN(value) ? NA_CALC : formatValue(value, unit, customText);
  const styleVars = { "--kpi-accent": accent, "--kpi-accent-bg": accentBg } as CSSProperties;
  const tooltip = helper ?? label;

  return (
    <div className="rd-kpi-compact" style={styleVars} title={tooltip}>
      <div className="rd-kpi-c-icon">{icon}</div>
      <div className="rd-kpi-c-body">
        <div className="rd-kpi-c-label">{label}</div>
        <div className="rd-kpi-c-val">
          {loading ? <span className="rd-skel" style={{ width: 64, height: 18 }} /> : shown}
        </div>
      </div>
      {trend ? (
        <span className={`rd-trend ${trend.direction} ${trend.good ? "good" : "bad"}`}>
          {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "–"}
          {trend.value != null && trend.value !== 0 ? ` ${trend.value}${trendLabel ? ` ${trendLabel}` : ""}` : ""}
        </span>
      ) : null}
    </div>
  );
}
