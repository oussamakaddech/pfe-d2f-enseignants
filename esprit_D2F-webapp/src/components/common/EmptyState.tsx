import { memo, type ReactNode } from "react";
import { Button, Typography } from "antd";
import styles from "./EmptyState.module.css";

const { Title, Text } = Typography;

interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: { label: string; onClick: () => void; icon?: ReactNode };
  readonly compact?: boolean;
}

/**
 * État vide illustré pour les tables, listes et sections sans données.
 * Remplace les pages blanches et les Empty Ant Design génériques.
 */
const EmptyState = memo(function EmptyState({
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
      className={styles.container}
      style={{
        padding: compact ? "32px 16px" : "56px 32px",
        gap: compact ? 10 : 12,
      }}
    >
      {icon && (
        <div
          className={styles.iconRing}
          style={{
            width: iconRingSize,
            height: iconRingSize,
          }}
        >
          <span aria-hidden="true" className={styles.outerRing} />
          <div
            className={styles.innerIcon}
            style={{
              width: iconBoxSize,
              height: iconBoxSize,
              fontSize: iconFontSize,
            }}
          >
            {icon}
          </div>
        </div>
      )}

      <Title level={compact ? 5 : 4} className={styles.title}>
        {title}
      </Title>

      {description && (
        <Text className={styles.description}>
          {description}
        </Text>
      )}

      {action && (
        <Button
          type="primary"
          onClick={action.onClick}
          icon={action.icon}
          className={styles.action}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
});

export default EmptyState;
