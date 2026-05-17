import { Space, Button, Input, Typography } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface DataToolbarAction {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: "primary" | "default" | "dashed" | "text" | "link";
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

interface DataToolbarProps {
  /** Titre optionnel de la toolbar */
  title?: React.ReactNode;
  /** Barre de recherche intégrée */
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  /** Bouton rafraîchir */
  onRefresh?: () => void;
  loading?: boolean;
  /** Actions principales (à droite) */
  actions?: DataToolbarAction[];
  /** Filtres additionnels (au milieu) */
  filters?: React.ReactNode;
  /** Compteur de résultats */
  count?: number;
  countLabel?: string;
  className?: string;
}

/**
 * Toolbar standardisée pour les pages de données.
 * Layout : [Titre + Compteur] [Filtres] [Recherche + Actions]
 */
export default function DataToolbar({
  title,
  searchValue,
  searchPlaceholder = "Rechercher...",
  onSearchChange,
  onRefresh,
  loading = false,
  actions = [],
  filters,
  count,
  countLabel = "résultat(s)",
  className = "",
}: DataToolbarProps) {
  return (
    <div
      className={`data-toolbar ${className}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        marginBottom: "var(--space-4)",
        padding: "14px 20px",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Left: Title + Count */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
        {title && (
          <Text strong style={{ fontSize: "var(--text-base)", color: "var(--text-main)" }}>{title}</Text>
        )}
        {count !== undefined && (
          <Text style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {count} {countLabel}
          </Text>
        )}
      </div>

      {/* Center: Filters */}
      {filters && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {filters}
        </div>
      )}

      {/* Right: Search + Refresh + Actions */}
      <Space size={8}>
        {onSearchChange !== undefined && (
          <Input
            prefix={<SearchOutlined style={{ color: "var(--neutral-400)" }} />}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: "var(--radius-sm)" }}
          />
        )}
        {onRefresh && (
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
            style={{ borderRadius: 8 }}
          />
        )}
        {actions.map((action) => (
          <Button
            key={action.key}
            type={action.type || "default"}
            icon={action.icon}
            onClick={action.onClick}
            danger={action.danger}
            disabled={action.disabled}
            className={action.className}
          >
            {action.label}
          </Button>
        ))}
      </Space>
    </div>
  );
}
