import { Card, Typography, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { brand, neutral, radius, shadow } from "@/styles/themes/tokens";

const { Text } = Typography;

interface D2FDataCardProps {
  icon: ReactNode;
  iconColor?: string;
  label: string;
  value: ReactNode;
  unit?: string;
  subtext?: string;
  trend?: { value: number; label?: string };
  accentColor?: string;
  loading?: boolean;
  href?: string;
  className?: string;
}

export default function D2FDataCard({
  icon,
  iconColor = brand[500],
  label,
  value,
  unit,
  subtext,
  trend,
  accentColor = brand[500],
  loading = false,
  href,
  className,
}: D2FDataCardProps) {
  const navigate = useNavigate();
  const trendUp = trend && trend.value > 0;
  const trendDown = trend && trend.value < 0;
  const trendColor = trendUp ? "#10b981" : trendDown ? "#ef4444" : neutral[500];

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: radius.lg,
    border: "1px solid rgba(0,0,0,0.07)",
    borderTop: `3px solid ${accentColor}`,
    boxShadow: shadow.sm,
    padding: "20px 22px",
    cursor: href ? "pointer" : "default",
    transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
  };

  const content = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
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
      <div style={{ fontSize: 12, fontWeight: 500, color: neutral[600], textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: neutral[900], lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {loading ? "—" : value}
        </span>
        {unit && <span style={{ fontSize: 13, fontWeight: 500, color: neutral[500] }}>{unit}</span>}
      </div>
      {subtext && <div style={{ fontSize: 12, color: neutral[500], marginTop: 6 }}>{subtext}</div>}
    </>
  );

  if (href) {
    return (
      <Card
        hoverable
        variant="borderless"
        className={className}
        style={cardStyle}
        onClick={() => navigate(href)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = shadow.md;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.boxShadow = shadow.sm;
        }}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card variant="borderless" className={className} style={cardStyle}>
      {content}
    </Card>
  );
}




