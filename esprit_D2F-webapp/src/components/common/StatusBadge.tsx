import { memo } from "react";
import { Tag } from "antd";
import { statusColors, type FormationStatus } from "@/styles/themes/tokens";
import styles from "./StatusBadge.module.css";

interface StatusBadgeProps {
  readonly status: string;
  readonly size?: "small" | "default";
  /** Affiche un petit point coloré devant le label. Défaut : true */
  readonly dot?: boolean;
}

const StatusBadge = memo(function StatusBadge({ status, size = "default", dot = true }: StatusBadgeProps) {
  const cfg = statusColors[status as FormationStatus] ?? {
    color: "#6b7280",
    bg: "#f9fafb",
    label: status,
  };

  return (
    <Tag
      className={styles.badge}
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}24`,
        fontSize: size === "small" ? 11 : 12,
        padding: size === "small" ? "0 8px" : "2px 10px",
        lineHeight: size === "small" ? "18px" : "22px",
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={styles.dot}
          style={{ background: cfg.color }}
        />
      )}
      {cfg.label}
    </Tag>
  );
});

export default StatusBadge;
