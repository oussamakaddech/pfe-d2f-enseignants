import { Skeleton, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ReactNode, ElementType } from "react";
import { neutral } from "@/styles/themes/tokens";
import styles from "./StatCard.module.css";

interface StatCardProps {
  readonly icon: ReactNode;
  readonly iconColor?: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly unit?: string;
  readonly subtext?: string;
  readonly trend?: { value: number; label?: string };
  readonly accentColor?: string;
  readonly loading?: boolean;
  readonly onClick?: () => void;
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
      <div className={`${styles.card} d2f-stat-card`} style={{ borderTop: `3px solid ${accentColor}` }}>
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      </div>
    );
  }

  const trendUp = trend && trend.value > 0;
  const trendDown = trend && trend.value < 0;
  let trendColor: string = neutral[500];
  if (trendUp) trendColor = "#10b981";
  else if (trendDown) trendColor = "#ef4444";

  const interactive = !!onClick;
  const Tag = (interactive ? "button" : "div") as ElementType;
  return (
    <Tag
      type={interactive ? "button" : undefined}
      className={`${styles.card} d2f-stat-card d2f-hover-lift${interactive ? " d2f-stat-card-clickable" : ""}`}
      style={{ borderTop: `3px solid ${accentColor}` }}
      onClick={onClick}
    >
      <div className={styles.header}>
        <div
          className={styles.iconBox}
          style={{
            background: `${iconColor}14`,
            color: iconColor,
          }}
        >
          {icon}
        </div>

        {trend != null && (
          <Tooltip title={trend.label}>
            <span
              className={styles.trendBadge}
              style={{
                background: `${trendColor}14`,
                color: trendColor,
              }}
            >
              {trendUp && <ArrowUpOutlined style={{ fontSize: 10 }} />}
              {trendDown && <ArrowDownOutlined style={{ fontSize: 10 }} />}
              {Math.abs(trend.value)}%
            </span>
          </Tooltip>
        )}
      </div>

      <div className={styles.label}>
        {label}
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>
          {value}
        </span>
        {unit && (
          <span className={styles.unit}>{unit}</span>
        )}
      </div>

      {subtext && (
        <div className={styles.subtext}>{subtext}</div>
      )}
    </Tag>
  );
}




