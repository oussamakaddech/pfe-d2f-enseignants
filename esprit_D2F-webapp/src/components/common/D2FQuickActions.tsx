import { memo } from "react";
import type { ReactNode } from "react";
import { Space, Button } from "antd";

interface QuickAction {
  readonly key: string;
  readonly label: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  readonly type?: "primary" | "default" | "dashed" | "text" | "link";
  readonly danger?: boolean;
  readonly disabled?: boolean;
}

interface D2FQuickActionsProps {
  readonly actions: QuickAction[];
  readonly size?: "small" | "middle" | "large";
}

const D2FQuickActions = memo(function D2FQuickActions({ actions, size = "middle" }: D2FQuickActionsProps) {
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
});

export default D2FQuickActions;




