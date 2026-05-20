import { Card } from "antd";

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wrapper responsive standardisé pour les tableaux.
 * - Card avec radius 16, shadow subtil
 * - Overflow scroll horizontal sur mobile
 */
export default function ResponsiveTableWrapper({
  children,
  className = "",
  style,
}: ResponsiveTableWrapperProps) {
  return (
    <Card
      className={`responsive-table-wrapper ${className}`}
      style={{
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
        overflow: "hidden",
        ...style,
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ overflowX: "auto" }}>
        <div style={{ padding: 0 }}>
          {children}
        </div>
      </div>
    </Card>
  );
}




