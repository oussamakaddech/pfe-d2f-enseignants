import { Tag } from "antd";
import { statusColors, type FormationStatus } from "@/styles/themes/tokens";

interface StatusBadgeProps {
  status: FormationStatus | string;
  size?: "small" | "default";
  /** Affiche un petit point coloré devant le label. Défaut : true */
  dot?: boolean;
}

export default function StatusBadge({ status, size = "default", dot = true }: StatusBadgeProps) {
  const cfg = statusColors[status as FormationStatus] ?? {
    color: "#6b7280",
    bg: "#f9fafb",
    label: status,
  };

  return (
    <Tag
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}24`,
        borderRadius: 9999,
        fontWeight: 500,
        fontSize: size === "small" ? 11 : 12,
        padding: size === "small" ? "0 8px" : "2px 10px",
        lineHeight: size === "small" ? "18px" : "22px",
        margin: 0,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cfg.color,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {cfg.label}
    </Tag>
  );
}




