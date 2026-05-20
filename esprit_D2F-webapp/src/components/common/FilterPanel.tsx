import { Card, Space, Button, Typography } from "antd";
import { FilterOutlined, ClearOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface FilterPanelProps {
  /** Contenu des filtres */
  children: React.ReactNode;
  /** Titre du panneau */
  title?: string;
  /** Afficher le bouton réinitialiser */
  onReset?: () => void;
  /** Nombre de filtres actifs */
  activeCount?: number;
  className?: string;
}

/**
 * Panneau de filtres standardisé.
 * - Card avec fond blanc, radius 16
 * - Header avec titre + compteur + reset
 * - Layout flex pour les filtres
 */
export default function FilterPanel({
  children,
  title = "Filtres",
  onReset,
  activeCount = 0,
  className = "",
}: FilterPanelProps) {
  return (
    <Card
      size="small"
      className={`filter-panel ${className}`}
      style={{
        marginBottom: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Space size={8}>
          <FilterOutlined style={{ color: "var(--text-muted)", fontSize: 14 }} />
          <Text style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {title}
          </Text>
          {activeCount > 0 && (
            <span style={{
              background: "#B51200",
              color: "#fff",
              borderRadius: 10,
              padding: "1px 8px",
              fontSize: 11,
              fontWeight: 600,
            }}>
              {activeCount}
            </span>
          )}
        </Space>
        {onReset && activeCount > 0 && (
          <Button
            type="text"
            size="small"
            icon={<ClearOutlined />}
            onClick={onReset}
            style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}
          >
            Réinitialiser
          </Button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {children}
      </div>
    </Card>
  );
}




