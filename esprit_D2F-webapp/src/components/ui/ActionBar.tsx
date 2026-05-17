import { Space, Button, Popconfirm, Typography } from "antd";
import { neutral } from "../../theme/tokens";

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
export default function ActionBar({
  actions,
  align = "right",
  gap = 8,
  className = "",
  style,
}: ActionBarProps) {
  const justifyContent = align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end";

  return (
    <div
      className={`action-bar ${className}`}
      style={{
        display: "flex",
        justifyContent,
        alignItems: "center",
        gap,
        ...style,
      }}
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
            className={action.className}
            style={{ borderRadius: 8, fontWeight: 500 }}
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
}
