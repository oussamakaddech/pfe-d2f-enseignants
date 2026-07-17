import { Card, Statistic } from "antd";
import type { ReactNode } from "react";

interface KpiCardProps {
  readonly title: string;
  readonly value: number | string;
  readonly suffix?: string;
  readonly precision?: number;
  readonly icon?: ReactNode;
  readonly color?: string;
  readonly loading?: boolean;
}

/** Carte KPI réutilisable pour les tableaux de bord. */
export default function KpiCard({
  title,
  value,
  suffix,
  precision,
  icon,
  color = "#1677ff",
  loading,
}: KpiCardProps) {
  return (
    <Card loading={loading} style={{ borderRadius: 12, height: "100%" }}>
      <Statistic
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {icon}
            {title}
          </span>
        }
        value={value}
        precision={precision}
        suffix={suffix}
        valueStyle={{ color, fontWeight: 600 }}
      />
    </Card>
  );
}
