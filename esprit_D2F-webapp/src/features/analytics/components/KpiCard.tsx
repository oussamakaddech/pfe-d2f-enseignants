import { Card, Statistic, Typography } from "antd";
import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  precision?: number;
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
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
