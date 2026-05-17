import type { ReactNode } from "react";
import { Button, Typography } from "antd";
import { neutral } from "./tokens";

const { Title, Text } = Typography;

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  compact?: boolean;
}

/**
 * État vide illustré pour les tables, listes et sections sans données.
 * Remplace les pages blanches et les Empty Ant Design génériques.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  const iconBoxSize = compact ? 56 : 72;
  const iconFontSize = compact ? 24 : 32;
  const iconRingSize = compact ? 72 : 92;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "32px 16px" : "56px 32px",
        textAlign: "center",
        gap: compact ? 10 : 12,
      }}
    >
      {icon && (
        <div
          style={{
            position: "relative",
            width: iconRingSize,
            height: iconRingSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          {/* Outer ring */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: neutral[50],
              border: `1px dashed ${neutral[200]}`,
            }}
          />
          {/* Inner icon disc */}
          <div
            style={{
              width: iconBoxSize,
              height: iconBoxSize,
              borderRadius: "50%",
              background: neutral[100],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: iconFontSize,
              color: neutral[400],
              position: "relative",
              zIndex: 1,
            }}
          >
            {icon}
          </div>
        </div>
      )}

      <Title
        level={compact ? 5 : 4}
        style={{
          margin: 0,
          color: neutral[800],
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </Title>

      {description && (
        <Text
          style={{
            color: neutral[500],
            fontSize: 13,
            maxWidth: 380,
            display: "block",
            lineHeight: 1.55,
          }}
        >
          {description}
        </Text>
      )}

      {action && (
        <Button
          type="primary"
          onClick={action.onClick}
          icon={action.icon}
          style={{ marginTop: 10 }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
