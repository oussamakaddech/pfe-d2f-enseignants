import { type ReactNode } from "react";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";

interface GlassKpiProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly icon: ReactNode;
  readonly accent?: string;
  readonly tint?: string;
  readonly delta?: number | null;
  readonly deltaGoodWhenUp?: boolean;
  readonly deltaLabel?: string;
  readonly hint?: string;
}

/** Tuile KPI en verre dépoli, avec variation (delta) vs période précédente. */
export default function GlassKpi({
  label,
  value,
  icon,
  accent = "#b51200",
  tint = "rgba(181,18,0,0.10)",
  delta,
  deltaGoodWhenUp = false,
  deltaLabel,
  hint,
}: GlassKpiProps) {
  let deltaEl: ReactNode = null;
  if (delta == null) {
    deltaEl = (
      <span className="glass-kpi-delta flat"><MinusOutlined /> stable</span>
    );
  } else if (Math.abs(delta) < 1e-9) {
    deltaEl = <span className="glass-kpi-delta flat"><MinusOutlined /> 0</span>;
  } else {
    const isUp = delta > 0;
    const isGood = isUp === deltaGoodWhenUp;
    deltaEl = (
      <span className={`glass-kpi-delta ${isGood ? "up" : "down"}`}>
        {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {deltaLabel ?? Math.abs(delta)}
      </span>
    );
  }

  return (
    <div
      className="glass-kpi"
      style={{ ["--kpi-accent" as string]: accent, ["--kpi-tint" as string]: tint }}
      title={hint}
    >
      <div className="glass-kpi-top">
        <span className="glass-kpi-icon">{icon}</span>
        <span className="glass-kpi-label">{label}</span>
      </div>
      <div className="glass-kpi-value">{value}</div>
      {deltaEl}
    </div>
  );
}
