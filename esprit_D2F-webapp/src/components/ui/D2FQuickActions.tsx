import type { ReactNode } from "react";
import { Space, Button } from "antd";

interface QuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  type?: "primary" | "default" | "dashed" | "text" | "link";
  danger?: boolean;
  disabled?: boolean;
}

interface D2FQuickActionsProps {
  actions: QuickAction[];
  size?: "small" | "middle" | "large";
}

export default function D2FQuickActions({ actions, size = "middle" }: D2FQuickActionsProps) {
  return (
    <Space wrap size={size === "small" ? 8 : 12}>
      {actions.map((action) => (
        <Button
          key={action.key}
          type={action.type || "default"}
          icon={action.icon}
          onClick={action.onClick}
          danger={action.danger}
          disabled={action.disabled}
          size={size}
        >
          {action.label}
        </Button>
      ))}
    </Space>
  );
}
