import { Tag } from "antd";
import { roleColors } from "@/styles/themes/tokens";

interface RoleBadgeProps {
  readonly role: string;
  readonly size?: "small" | "default";
}

export default function RoleBadge({ role, size = "default" }: RoleBadgeProps) {
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
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}24`,
        borderRadius: 9999,
        fontWeight: 600,
        fontSize: size === "small" ? 11 : 12,
        padding: size === "small" ? "0 8px" : "2px 10px",
        lineHeight: size === "small" ? "18px" : "22px",
        letterSpacing: "0.3px",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      {cfg.label}
    </Tag>
  );
}




