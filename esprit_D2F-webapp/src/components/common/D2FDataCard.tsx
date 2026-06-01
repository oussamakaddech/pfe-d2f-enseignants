import { memo } from "react";
import { Card, Typography, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { brand, neutral, radius, shadow } from "@/styles/themes/tokens";
import s from "./D2FDataCard.module.css";

const { Text } = Typography;

interface D2FDataCardProps {
  readonly icon: ReactNode;
  readonly iconColor?: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly unit?: string;
  readonly subtext?: string;
  readonly trend?: { value: number; label?: string };
  readonly accentColor?: string;
  readonly loading?: boolean;
  readonly href?: string;
  readonly className?: string;
}

const D2FDataCard = memo(function D2FDataCard({
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
  let trendColor: string = neutral[500];
  if (trendUp) trendColor = "#10b981";
  else if (trendDown) trendColor = "#ef4444";

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
      <div className={s.cardHeader}>
        <div
          className={s.iconBox}
          style={{ background: `${iconColor}14`, color: iconColor }}
        >
          {icon}
        </div>
        {trend != null && (
          <Tooltip title={trend.label}>
            <span
              className={s.trendBadge}
              style={{ background: `${trendColor}14`, color: trendColor }}
            >
              {trendUp && <ArrowUpOutlined className={s.trendIcon} />}
              {trendDown && <ArrowDownOutlined className={s.trendIcon} />}
              {Math.abs(trend.value)}%
            </span>
          </Tooltip>
        )}
      </div>
      <div className={s.cardLabel} style={{ color: neutral[600] }}>
        {label}
      </div>
      <div className={s.valueRow}>
        <span className={s.valueNumber} style={{ color: neutral[900] }}>
          {loading ? "—" : value}
        </span>
        {unit && <span className={s.valueUnit} style={{ color: neutral[500] }}>{unit}</span>}
      </div>
      {subtext && <div className={s.subtext} style={{ color: neutral[500] }}>{subtext}</div>}
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
});

export default D2FDataCard;




