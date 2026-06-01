import { memo } from "react";
import { Tag } from "antd";
import { roleColors } from "@/styles/themes/tokens";
import styles from "./RoleBadge.module.css";

interface RoleBadgeProps {
  readonly role: string;
  readonly size?: "small" | "default";
}

const RoleBadge = memo(function RoleBadge({ role, size = "default" }: RoleBadgeProps) {
  const normalized = String(role || "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replaceAll(/[\s_-]+/g, "");

  const cfg = roleColors[normalized] ?? roleColors[role] ?? {
    color: "#6b7280",
    bg: "#f9fafb",
    label: role,
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
      {cfg.label}
    </Tag>
  );
});

export default RoleBadge;
