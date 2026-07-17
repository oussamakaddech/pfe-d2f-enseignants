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

function trendArrow(direction: Trend["direction"]): string {
  if (direction === "up") return "▲";
  if (direction === "down") return "▼";
  return "–";
}

function buildTrendValueText(trend: Trend, trendLabel?: string): string {
  const hasValue = trend.value != null && trend.value !== 0;
  const labelSuffix = trendLabel ? ` ${trendLabel}` : "";
  return hasValue ? ` ${trend.value}${labelSuffix}` : "";
}

export default function KpiCard({
  label,
  value,
  unit = "int",
  customText,
  icon,
  accent = "#b51200",
  accentBg = "rgba(181,18,0,0.10)",
  helper,
  trend,
  trendLabel,
  loading = false,
  nullIsNonCalculable = false,
}: {
  readonly label: string;
  readonly value: number | null | undefined;
  readonly unit?: Unit;
  readonly customText?: string;
  readonly icon: ReactNode;
  readonly accent?: string;
  readonly accentBg?: string;
  readonly helper?: string;
  readonly trend?: Trend | null;
  readonly trendLabel?: string;
  readonly loading?: boolean;
  readonly nullIsNonCalculable?: boolean;
}) {
  const isNA = value == null;
  const shown = isNA ? NA_CALC : formatValue(value, unit, customText);

  const styleVars = { "--kpi-accent": accent, "--kpi-accent-bg": accentBg } as CSSProperties;

  const trendNode = trend ? (
    <span className={`rd-trend ${trend.direction} ${trend.good ? "good" : "bad"}`}>
      {trendArrow(trend.direction)}
      {buildTrendValueText(trend, trendLabel)}
    </span>
  ) : null;

  return (
    <div className="rd-kpi" style={styleVars}>
      <div className="rd-kpi-top">
        <div className="rd-kpi-icon">{icon}</div>
        {trendNode}
      </div>
      <div className="rd-kpi-val">
        {loading ? <span className="rd-skel" style={{ width: 90, height: 30, display: "inline-block" }} /> : (shown ?? "—")}
      </div>
      <div className="rd-kpi-label">{label}</div>
      {helper && <div className="rd-kpi-help">{helper}</div>}
    </div>
  );
}
