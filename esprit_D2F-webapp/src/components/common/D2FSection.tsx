import type { ReactNode } from "react";
import { Card, Typography } from "antd";
import { brand, neutral, radius, shadow } from "@/styles/themes/tokens";

const { Title, Text } = Typography;

interface D2FSectionProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  extra?: ReactNode;
  children: ReactNode;
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function D2FSection({
  title,
  subtitle,
  icon,
  iconColor = brand[500],
  extra,
  children,
  bordered = false,
  className,
  style,
}: D2FSectionProps) {
  return (
    <Card
      variant={bordered ? "outlined" : "borderless"}
      className={className}
      style={{
        borderRadius: radius.lg,
        boxShadow: shadow.sm,
        ...style,
      }}
      title={
        title ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {icon && (
              <span style={{ color: iconColor, fontSize: 18 }}>{icon}</span>
            )}
            <div>
              <Title level={5} style={{ margin: 0, fontWeight: 600, color: neutral[900] }}>
                {title}
              </Title>
              {subtitle && (
                <Text style={{ fontSize: 12, color: neutral[500], marginTop: 2, display: "block" }}>
                  {subtitle}
                </Text>
              )}
            </div>
          </div>
        ) : undefined
      }
      extra={extra}
    >
      {children}
    </Card>
  );
}




