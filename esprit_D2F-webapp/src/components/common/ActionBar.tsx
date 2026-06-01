import { memo } from "react";
import { Button, Popconfirm, Typography } from "antd";
import s from "./ActionBar.module.css";

const { Text } = Typography;

interface ActionBarAction {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: "primary" | "default" | "dashed" | "text" | "link";
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  confirm?: string;
}

interface ActionBarProps {
  /** Actions à afficher */
  actions: ActionBarAction[];
  /** Alignement */
  align?: "left" | "right" | "center";
  /** Gap entre les boutons */
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Barre d'actions standardisée.
 * - Supporte les confirmations (Popconfirm)
 * - Alignement configurable
 * - Espacement cohérent
 */
const ActionBar = memo(function ActionBar({
  actions,
  align = "right",
  gap = 8,
  className = "",
  style,
}: Readonly<ActionBarProps>) {
  let justifyContent = "flex-end";
  if (align === "left") justifyContent = "flex-start";
  else if (align === "center") justifyContent = "center";

  return (
    <div
      className={`action-bar ${s.container} ${className}`}
      style={{ justifyContent, gap, ...style }}
    >
      {actions.map((action) => {
        const btn = (
          <Button
            key={action.key}
            type={action.type || "default"}
            icon={action.icon}
            onClick={action.confirm ? undefined : action.onClick}
            danger={action.danger}
            disabled={action.disabled}
            className={`${action.className ?? ""} ${s.actionButton}`}
          >
            {action.label}
          </Button>
        );

        if (action.confirm) {
          return (
            <Popconfirm
              key={action.key}
              title={action.confirm}
              onConfirm={action.onClick}
              okText="Oui"
              cancelText="Non"
            >
              {btn}
            </Popconfirm>
          );
        }

        return btn;
      })}
    </div>
  );
});

export default ActionBar;




