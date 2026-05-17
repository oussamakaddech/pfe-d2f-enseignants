import { Skeleton, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { radius, neutral } from "./tokens";

interface StatCardProps {
  icon: ReactNode;
  iconColor?: string;
  label: string;
  value: ReactNode;
  unit?: string;
  subtext?: string;
  trend?: { value: number; label?: string };
  accentColor?: string;
  loading?: boolean;
  onClick?: () => void;
}

export default function StatCard({
  icon,
  iconColor = "#B51200",
  label,
  value,
  unit,
  subtext,
  trend,
  accentColor = "#B51200",
  loading = false,
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="d2f-stat-card" style={baseStyle(accentColor)}>
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      </div>
    );
  }

  const trendUp = trend && trend.value > 0;
  const trendDown = trend && trend.value < 0;
  const trendColor = trendUp ? "#10b981" : trendDown ? "#ef4444" : neutral[500];

  return (
    <div
      className={`d2f-stat-card d2f-hover-lift${onClick ? " d2f-stat-card-clickable" : ""}`}
      style={baseStyle(accentColor)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      {/* Header row: icon + trend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.md,
            background: `${iconColor}14`,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {trend != null && (
          <Tooltip title={trend.label}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "3px 8px",
                borderRadius: radius.full,
                background: `${trendColor}14`,
                color: trendColor,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {trendUp && <ArrowUpOutlined style={{ fontSize: 10 }} />}
              {trendDown && <ArrowDownOutlined style={{ fontSize: 10 }} />}
              {Math.abs(trend.value)}%
            </span>
          </Tooltip>
        )}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: neutral[600],
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: neutral[900],
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 13, fontWeight: 500, color: neutral[500] }}>{unit}</span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <div style={{ fontSize: 12, color: neutral[500], marginTop: 6 }}>{subtext}</div>
      )}
    </div>
  );
}

function baseStyle(accentColor: string): React.CSSProperties {
  return {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.07)",
    borderTop: `3px solid ${accentColor}`,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
    padding: "18px 20px",
  };
}
