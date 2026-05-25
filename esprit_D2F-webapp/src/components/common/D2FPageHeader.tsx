import type { ReactNode } from "react";
import { Typography } from "antd";
import { brand, neutral, radius } from "@/styles/themes/tokens";

const { Title, Text } = Typography;

interface D2FPageHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly subtitle?: string;
  readonly iconColor?: string;
  readonly actions?: ReactNode;
  readonly tags?: ReactNode;
  readonly divider?: boolean;
}

export default function D2FPageHeader({
  icon,
  title,
  subtitle,
  iconColor = brand[500],
  actions,
  tags,
  divider = true,
}: D2FPageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: 24,
        paddingBottom: divider ? 16 : 0,
        borderBottom: divider ? "1px solid rgba(0,0,0,0.06)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div
            style={{
              flexShrink: 0,
              width: 48,
              height: 48,
              borderRadius: radius.md,
              background: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#fff",
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px ${iconColor}38`,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Title
                level={3}
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: neutral[900],
                  lineHeight: 1.2,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </Title>
              {tags}
            </div>
            {subtitle && (
              <Text
                style={{
                  color: neutral[600],
                  fontSize: 14,
                  lineHeight: "20px",
                  marginTop: 2,
                  display: "block",
                }}
              >
                {subtitle}
              </Text>
            )}
          </div>
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}




