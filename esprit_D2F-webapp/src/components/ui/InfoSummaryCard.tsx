import { Card, Row, Col, Typography, Tag } from "antd";
import { neutral, radius, shadow } from "../../theme/tokens";

const { Text, Paragraph } = Typography;

interface InfoSummaryItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tag?: { color: string; text: string };
}

interface InfoSummaryCardProps {
  /** Titre de la carte */
  title?: React.ReactNode;
  /** Icône du titre */
  titleIcon?: React.ReactNode;
  /** Éléments à afficher */
  items: InfoSummaryItem[];
  /** Nombre de colonnes */
  columns?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Carte résumé d'information standardisée.
 * - Affichage label/valeur en grille
 * - Supporte les tags pour les statuts
 * - Icônes optionnelles
 */
export default function InfoSummaryCard({
  title,
  titleIcon,
  items,
  columns = 3,
  className = "",
  style,
}: InfoSummaryCardProps) {
  const colSpan = Math.floor(24 / columns);

  return (
    <Card
      size="small"
      className={`info-summary-card ${className}`}
      style={{
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {titleIcon && <span style={{ color: "#B51200" }}>{titleIcon}</span>}
          <Text strong style={{ fontSize: 14, color: neutral[900] }}>{title}</Text>
        </div>
      )}
      <Row gutter={[16, 14]}>
        {items.map((item, idx) => (
          <Col xs={24} sm={12} lg={colSpan} key={idx}>
            <div>
              <Text style={{ fontSize: 12, fontWeight: 600, color: neutral[500], display: "block", marginBottom: 3 }}>
                {item.label}
              </Text>
              {item.tag ? (
                <Tag color={item.tag.color} style={{ borderRadius: 12, fontWeight: 500 }}>
                  {item.tag.text}
                </Tag>
              ) : (
                <Text style={{ fontSize: 14, color: neutral[900], fontWeight: 500 }}>
                  {item.value || "—"}
                </Text>
              )}
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
